import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT } from "../content-files";
import { blocksRelease, KINDS, planRelease } from "./plan";
import type { Artifact, CommitPull, GitHubReader, UnreleasedCommit } from "./sources";

const repo = "oplaner4/farakurim";

function sheetPull(number: number, sha: string, mergedAt: string, overrides: Partial<CommitPull> = {}): CommitPull {
  return { number, branch: "service-sheet/2026-10-19", headRepo: repo, mergedAt, mergeSha: sha, ...overrides };
}

const artifact = (sha: string, runId: number, { expired = false, trusted = true, legacy = false } = {}): Artifact => ({
  name: `${legacy ? "service-sheet-pdf" : "content-uploads"}-${sha}`,
  runId,
  expired,
  trusted,
});

/** The PRs' commits as shas; a sha starting with `m` is the maintainer's, the others the App's bot's. */
function fakeGitHub(
  pulls: Record<string, CommitPull[]>,
  commits: Record<number, string[]>,
  artifacts: Artifact[],
): GitHubReader {
  return {
    pullsOfCommit: async (sha) => pulls[sha] ?? [],
    commitsOfPull: async (number) => (commits[number] ?? []).map((sha) => ({ sha, bot: !sha.startsWith("m") })),
    artifactsNamed: async (name) => artifacts.filter((a) => a.name === name),
  };
}

const commit = (sha: string, subject = "feat(content): add the service sheet", merge = false): UnreleasedCommit => ({
  sha,
  subject,
  merge,
});

describe("blocksRelease", () => {
  it.each([
    "feat: x",
    "feat(news): x",
    "feat(content): x",
    "fix(content): x",
    "fix(news,content): x",
    "fix!: x",
    "fix(news)!: x",
    'Revert "feat: x"',
    "no header",
    "Feat(news): x (#12)",
    "fix(Content): x",
  ])("blocks %s", (subject) => expect(blocksRelease(subject)).toBe(true));

  it.each([
    "fix(gallery): x",
    "docs: x",
    "ci: bump actions/setup-node",
    "build(deps): x",
    "chore: x",
    "refactor: x",
    "test: x",
    "perf: x",
    "style: x",
    "revert: x",
  ])("lets %s go out", (subject) => expect(blocksRelease(subject)).toBe(false));
});

describe("planRelease", () => {
  const twoPulls = { b: [sheetPull(12, "b", "2026-10-19T10:05:00Z")], a: [sheetPull(11, "a", "2026-10-19T10:00:00Z")] };

  it("releases two PRs in merge order", async () => {
    const github = fakeGitHub(twoPulls, { 11: ["a1", "a2"], 12: ["b1"] }, [
      artifact("a1", 101),
      artifact("a2", 102),
      artifact("b1", 201),
    ]);
    const plan = await planRelease({ repo, commits: [commit("b"), commit("a")], github });
    expect(plan).toMatchObject({
      action: "release",
      pulls: [
        {
          number: 11,
          branch: "service-sheet/2026-10-19",
          artifacts: [
            { name: "content-uploads-a1", runId: 101 },
            { name: "content-uploads-a2", runId: 102 },
          ],
        },
        { number: 12, artifacts: [{ name: "content-uploads-b1", runId: 201 }] },
      ],
    });
  });

  it("skips the bot's commits without an artifact", async () => {
    const github = fakeGitHub(twoPulls, { 11: ["a1", "a2"] }, [artifact("a1", 101)]);
    const plan = await planRelease({ repo, commits: [commit("a")], github });
    expect(plan).toMatchObject({ action: "release", pulls: [{ number: 11, artifacts: [{ runId: 101 }] }] });
    if (plan.action === "release") expect(plan.pulls[0].artifacts).toHaveLength(1);
  });

  it("takes the newest unexpired artifact of a commit", async () => {
    const github = fakeGitHub(twoPulls, { 11: ["a1"] }, [artifact("a1", 101, { expired: true }), artifact("a1", 105)]);
    const plan = await planRelease({ repo, commits: [commit("a")], github });
    expect(plan).toMatchObject({ action: "release", pulls: [{ artifacts: [{ runId: 105 }] }] });
  });

  it("blocks on an expired artifact", async () => {
    const sha = "a1b2c3d4e5f6";
    const github = fakeGitHub(twoPulls, { 11: [sha] }, [artifact(sha, 101, { expired: true })]);
    const plan = await planRelease({ repo, commits: [commit("a")], github });
    expect(plan).toMatchObject({ action: "blocked", pulls: [{ number: 11 }] });
    if (plan.action !== "blocked") return;
    expect(plan.reason).toContain(sha.slice(0, 7));
    expect(plan.reason).toContain("#11");
    expect(plan.reason).toContain("expired");
  });

  it("blocks when main has other unreleased commits", async () => {
    const github = fakeGitHub(twoPulls, { 12: ["b1"] }, [artifact("b1", 201)]);
    const other = commit("x123456789", "feat(news): add the Hubertská mše event");
    const plan = await planRelease({ repo, commits: [commit("b"), other], github });
    expect(plan).toMatchObject({ action: "blocked", pulls: [{ number: 12 }] });
    if (plan.action !== "blocked") return;
    expect(plan.pulls).toHaveLength(1);
    expect(plan.reason).toContain("only a release by hand may publish");
    expect(plan.reason).toContain("feat(news): add the Hubertská mše event");
  });

  it.each<[string, CommitPull[]]>([
    ["no PR", []],
    ["another branch", [sheetPull(12, "b", "2026-10-19T10:05:00Z", { branch: "feature/x" })]],
    ["a fork", [sheetPull(12, "b", "2026-10-19T10:05:00Z", { headRepo: "someone/farakurim" })]],
    ["an unmerged PR", [sheetPull(12, "b", "2026-10-19T10:05:00Z", { mergedAt: null })]],
    ["a rebase", [sheetPull(12, "b", "2026-10-19T10:05:00Z", { mergeSha: "other" })]],
  ])("skips when no unreleased commit is a content PR merge (%s)", async (_, pulls) => {
    const github = fakeGitHub({ b: pulls }, { 12: ["b1"] }, [artifact("b1", 201)]);
    const plan = await planRelease({ repo, commits: [commit("b")], github });
    expect(plan.action).toBe("skip");
  });

  it("blocks a later push while a merged sheet PR is unreleased", async () => {
    const github = fakeGitHub(twoPulls, { 12: ["b1"] }, [artifact("b1", 201)]);
    const plan = await planRelease({
      repo,
      commits: [commit("c123456789", "feat(news): add an event"), commit("b")],
      github,
    });
    expect(plan).toMatchObject({ action: "blocked", pulls: [{ number: 12 }] });
  });

  it("does nothing when everything is released", async () => {
    const github = fakeGitHub(twoPulls, {}, []);
    const plan = await planRelease({ repo, commits: [], github });
    expect(plan.action).toBe("none");
  });

  it("ignores an artifact that a fork's run uploaded under the same name", async () => {
    const github = fakeGitHub(twoPulls, { 11: ["a1"] }, [artifact("a1", 101), artifact("a1", 999, { trusted: false })]);
    const plan = await planRelease({ repo, commits: [commit("a")], github });
    expect(plan).toMatchObject({ action: "release", pulls: [{ artifacts: [{ runId: 101 }] }] });
  });

  it("blocks a sheet PR with a commit pushed by hand without an artifact", async () => {
    // A sheet record links no file: its PDF's name comes from the code, so the link check cannot see it.
    const github = fakeGitHub(twoPulls, { 11: ["a1", "m1b2c3d4e5"] }, [artifact("a1", 101)]);
    const plan = await planRelease({ repo, commits: [commit("a")], github });
    expect(plan).toMatchObject({ action: "blocked", pulls: [{ number: 11 }] });
    if (plan.action !== "blocked") return;
    expect(plan.reason).toContain("m1b2c3d");
    expect(plan.reason).toContain("#11");
  });

  it("releases an events PR with a commit pushed by hand", async () => {
    const pulls = { b: [sheetPull(12, "b", "2026-10-22T10:05:00Z", { branch: "events/2026-10-22" })] };
    const github = fakeGitHub(pulls, { 12: ["b1", "m1b2c3d4e5"] }, [artifact("b1", 201)]);
    const plan = await planRelease({ repo, commits: [commit("b")], github });
    expect(plan).toMatchObject({ action: "release", pulls: [{ number: 12, sha: "b", artifacts: [{ runId: 201 }] }] });
  });

  it("treats a bot commit with only a fork's artifact as having none", async () => {
    const github = fakeGitHub(twoPulls, { 11: ["a1b2c3d4e5"] }, [artifact("a1b2c3d4e5", 999, { trusted: false })]);
    const plan = await planRelease({ repo, commits: [commit("a")], github });
    expect(plan.action).toBe("release");
    if (plan.action === "release") expect(plan.pulls[0].artifacts).toEqual([]);
  });

  it("releases a sheet PR and an events PR in merge order", async () => {
    const pulls = {
      a: [sheetPull(11, "a", "2026-10-22T10:00:00Z")],
      b: [sheetPull(12, "b", "2026-10-22T10:05:00Z", { branch: "events/2026-10-22" })],
    };
    const github = fakeGitHub(pulls, { 11: ["a1"], 12: ["b1"] }, [artifact("a1", 101), artifact("b1", 201)]);
    const plan = await planRelease({
      repo,
      commits: [commit("b", "feat(content): add an event"), commit("a")],
      github,
    });
    expect(plan).toMatchObject({
      action: "release",
      pulls: [
        {
          number: 11,
          sha: "a",
          kind: "sheet",
          page: "/porad_bohosluzeb/",
          artifacts: [{ name: "content-uploads-a1" }],
        },
        { number: 12, sha: "b", kind: "events", page: "/aktuality/", artifacts: [{ name: "content-uploads-b1" }] },
      ],
    });
  });

  it("lets a docs commit and a Dependabot merge go out", async () => {
    const github = fakeGitHub(twoPulls, { 12: ["b1"] }, [artifact("b1", 201)]);
    const commits = [
      commit("b"),
      commit("d1", "docs: generalise a rule"),
      commit("e1", "Merge pull request #3 from oplaner4/dependabot/github_actions/x", true),
      commit("c1", "ci: bump actions/download-artifact from 8.0.1 to 8.0.2"),
    ];
    const plan = await planRelease({ repo, commits, github });
    expect(plan).toMatchObject({ action: "release", pulls: [{ number: 12 }] });
  });

  it("blocks on fix(content) and feat commits, naming them", async () => {
    const github = fakeGitHub(twoPulls, { 12: ["b1"] }, [artifact("b1", 201)]);
    const commits = [
      commit("b"),
      commit("f1", "fix(content): fix the poster"),
      commit("f2", "feat(gallery): add x"),
      commit("d1", "docs: generalise a rule"),
    ];
    const plan = await planRelease({ repo, commits, github });
    expect(plan).toMatchObject({ action: "blocked", pulls: [{ number: 12 }] });
    if (plan.action !== "blocked") return;
    expect(plan.reason).toContain("fix(content): fix the poster");
    expect(plan.reason).toContain("feat(gallery): add x");
    expect(plan.reason).not.toContain("docs: generalise a rule");
  });

  it("accepts the legacy sheet artifact", async () => {
    const github = fakeGitHub(twoPulls, { 11: ["a1"] }, [artifact("a1", 101, { legacy: true })]);
    const plan = await planRelease({ repo, commits: [commit("a")], github });
    expect(plan).toMatchObject({ action: "release", pulls: [{ artifacts: [{ name: "service-sheet-pdf-a1" }] }] });
  });

  it("takes the newest of the legacy and the new artifact", async () => {
    const github = fakeGitHub(twoPulls, { 11: ["a1"] }, [artifact("a1", 105, { legacy: true }), artifact("a1", 101)]);
    const plan = await planRelease({ repo, commits: [commit("a")], github });
    expect(plan).toMatchObject({
      action: "release",
      pulls: [{ artifacts: [{ name: "service-sheet-pdf-a1", runId: 105 }] }],
    });
    if (plan.action === "release") expect(plan.pulls[0].artifacts).toHaveLength(1);
  });

  it("ignores a legacy artifact for an events PR", async () => {
    const pulls = { b: [sheetPull(12, "b", "2026-10-22T10:05:00Z", { branch: "events/2026-10-22" })] };
    const bot = fakeGitHub(pulls, { 12: ["b1"] }, [artifact("b1", 201, { legacy: true })]);
    const byBot = await planRelease({ repo, commits: [commit("b")], github: bot });
    expect(byBot.action).toBe("release");
    if (byBot.action === "release") expect(byBot.pulls[0].artifacts).toEqual([]);
    const hand = fakeGitHub(pulls, { 12: ["m1"] }, [artifact("m1", 201, { legacy: true })]);
    expect(await planRelease({ repo, commits: [commit("b")], github: hand })).toMatchObject({
      action: "release",
      pulls: [{ artifacts: [] }],
    });
  });

  it("treats a PR from another prefix as an ordinary commit", async () => {
    const pulls = { ...twoPulls, f: [sheetPull(13, "f", "2026-10-19T10:10:00Z", { branch: "feature/x" })] };
    const github = fakeGitHub(pulls, { 12: ["b1"] }, [artifact("b1", 201)]);
    const alone = await planRelease({ repo, commits: [commit("f", "feat(news): x")], github });
    expect(alone.action).toBe("skip");
    const withSheet = await planRelease({ repo, commits: [commit("f", "feat(news): x"), commit("b")], github });
    expect(withSheet.action).toBe("blocked");
  });
});

describe("content-release.yml", () => {
  const workflow = readFileSync(join(ROOT, ".github/workflows/content-release.yml"), "utf8");
  const BRANCH_TEST = "startsWith(github.event.pull_request.head.ref, ";

  it("names every kind's prefix in the job's if and the concurrency group", () => {
    for (const { prefix } of Object.values(KINDS)) {
      expect(workflow.split(`${BRANCH_TEST}'${prefix}')`)).toHaveLength(3);
    }
    expect(workflow.split(BRANCH_TEST)).toHaveLength(Object.keys(KINDS).length * 2 + 1);
  });
});
