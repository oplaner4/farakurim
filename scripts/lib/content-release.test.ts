import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { freshTempDir } from "./test-helpers";
import {
  applyArtifacts,
  blocksRelease,
  gitHubReader,
  parseCommand,
  planRelease,
  unreleasedCommits,
  type Artifact,
  type CommitPull,
  type ContentPull,
  type GitHubReader,
  type ReleasePlan,
  type UnreleasedCommit,
} from "./content-release";

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

  it("blocks on a commit pushed by hand without an artifact", async () => {
    const github = fakeGitHub(twoPulls, { 11: ["a1", "m1b2c3d4e5"] }, [artifact("a1", 101)]);
    const plan = await planRelease({ repo, commits: [commit("a")], github });
    expect(plan).toMatchObject({ action: "blocked", pulls: [{ number: 11 }] });
    if (plan.action !== "blocked") return;
    expect(plan.reason).toContain("m1b2c3d");
    expect(plan.reason).toContain("#11");
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
        { number: 11, kind: "sheet", page: "/porad_bohosluzeb/", artifacts: [{ name: "content-uploads-a1" }] },
        { number: 12, kind: "events", page: "/aktuality/", artifacts: [{ name: "content-uploads-b1" }] },
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
    expect((await planRelease({ repo, commits: [commit("b")], github: hand })).action).toBe("blocked");
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

describe("gitHubReader", () => {
  function stubFetch(body: unknown, status = 200) {
    const calls: { url: string; headers: Record<string, string> }[] = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, headers: init?.headers as Record<string, string> });
      return new Response(JSON.stringify(body), { status });
    }) as typeof fetch;
    return { calls, fetchImpl };
  }

  it("reads the API with the token", async () => {
    const pulls = stubFetch([
      {
        number: 7,
        merged_at: "2026-10-19T10:00:00Z",
        merge_commit_sha: "abc",
        head: { ref: "service-sheet/2026-10-19", repo: { full_name: repo } },
      },
    ]);
    expect(await gitHubReader(repo, "t0k", pulls.fetchImpl).pullsOfCommit("abc")).toEqual([
      sheetPull(7, "abc", "2026-10-19T10:00:00Z"),
    ]);
    expect(pulls.calls[0].url).toBe(`https://api.github.com/repos/${repo}/commits/abc/pulls`);
    expect(pulls.calls[0].headers.Authorization).toBe("Bearer t0k");

    const run = { id: 9, repository_id: 1, head_repository_id: 1, head_branch: "main" };
    const artifacts = stubFetch({
      artifacts: [
        { name: "n", expired: false, workflow_run: run },
        { name: "n", expired: false, workflow_run: { ...run, id: 10, head_repository_id: 2 } },
        { name: "n", expired: true, workflow_run: { ...run, id: 11, head_branch: "service-sheet/x" } },
      ],
    });
    expect(await gitHubReader(repo, "t0k", artifacts.fetchImpl).artifactsNamed("n")).toEqual([
      { name: "n", runId: 9, expired: false, trusted: true },
      { name: "n", runId: 10, expired: false, trusted: false },
      { name: "n", runId: 11, expired: true, trusted: false },
    ]);
    expect(artifacts.calls[0].url).toBe(`https://api.github.com/repos/${repo}/actions/artifacts?name=n&per_page=100`);

    const commits = stubFetch([
      { sha: "c1", author: { login: "farakurim-sheet[bot]", type: "Bot" } },
      { sha: "c2", author: { login: "oplaner4", type: "User" } },
      { sha: "c3", author: null },
    ]);
    expect(await gitHubReader(repo, "t0k", commits.fetchImpl).commitsOfPull(7)).toEqual([
      { sha: "c1", bot: true },
      { sha: "c2", bot: false },
      { sha: "c3", bot: false },
    ]);
    expect(commits.calls[0].url).toBe(`https://api.github.com/repos/${repo}/pulls/7/commits?per_page=100`);
  });

  it("maps a deleted fork to a null head repository", async () => {
    const { fetchImpl } = stubFetch([
      { number: 7, merged_at: null, merge_commit_sha: null, head: { ref: "service-sheet/x", repo: null } },
    ]);
    expect(await gitHubReader(repo, "t0k", fetchImpl).pullsOfCommit("abc")).toMatchObject([{ headRepo: null }]);
  });

  it("fails on an error status", async () => {
    const { fetchImpl } = stubFetch({ message: "Not Found" }, 404);
    await expect(gitHubReader(repo, "t0k", fetchImpl).pullsOfCommit("abc")).rejects.toThrow(/404/);
  });
});

describe("unreleasedCommits", () => {
  const dir = freshTempDir("content-release");
  const git = (...args: string[]) =>
    execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args], {
      cwd: dir(),
      stdio: "pipe",
    });
  const commitEmpty = (subject: string) => git("commit", "--allow-empty", "--no-verify", "-q", "-m", subject);

  it("lists the commits since the last tag, newest first", () => {
    git("init", "-q");
    commitEmpty("chore: one");
    git("tag", "-a", "v1.0.0", "-m", "v1.0.0");
    commitEmpty("feat: two");
    commitEmpty("fix: three");
    const commits = unreleasedCommits(dir());
    expect(commits.map((c) => c.subject)).toEqual(["fix: three", "feat: two"]);
    for (const c of commits) expect(c.sha).toMatch(/^[0-9a-f]{40}$/);
  });

  it("lists every commit without a tag", () => {
    git("init", "-q");
    commitEmpty("chore: one");
    expect(unreleasedCommits(dir()).map((c) => c.subject)).toEqual(["chore: one"]);
  });

  it("marks merge commits", () => {
    git("init", "-q", "-b", "main");
    commitEmpty("chore: one");
    git("switch", "-q", "-c", "side");
    commitEmpty("ci: two");
    git("switch", "-q", "main");
    git("merge", "-q", "--no-ff", "--no-verify", "-m", "Merge pull request #3", "side");
    // The order of commits made within one second is not fixed.
    expect(
      unreleasedCommits(dir())
        .map((c) => [c.subject, c.merge])
        .sort(),
    ).toEqual([
      ["Merge pull request #3", true],
      ["chore: one", false],
      ["ci: two", false],
    ]);
  });
});

describe("parseCommand", () => {
  it("takes no arguments", () => {
    expect(parseCommand([])).toEqual({ action: "plan" });
    expect(parseCommand(["apply", "p.json", "d"])).toEqual({ action: "apply", plan: "p.json", from: "d" });
    expect(() => parseCommand(["apply"])).toThrow(/apply <plan.json> <dir>/);
    expect(() => parseCommand(["abc"])).toThrow(/unexpected argument abc/);
  });
});

describe("applyArtifacts", () => {
  const dir = freshTempDir("content-release-apply");
  const from = () => join(dir(), "artifacts");
  const uploads = () => join(dir(), "uploads");

  function file(path: string, text = path) {
    const full = join(from(), path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, text);
  }

  const pull = (number: number, kind: ContentPull["kind"], names: string[]): ContentPull => ({
    number,
    kind,
    branch: kind === "sheet" ? "service-sheet/x" : "events/x",
    page: "/",
    mergedAt: "2026-10-22T10:00:00Z",
    artifacts: names.map((name, i) => ({ name, runId: number * 100 + i })),
  });
  const release = (...pulls: ContentPull[]): ReleasePlan => ({ action: "release", pulls });
  const apply = (plan: ReleasePlan) => applyArtifacts({ plan, from: from(), uploads: uploads() });

  it("copies each artifact's tree into the uploads folder, in the plan's order", () => {
    file("content-uploads-a1/porady_bohosluzeb/x.pdf");
    file("content-uploads-b1/aktuality/y-plakat.pdf");
    const plan = release(pull(11, "sheet", ["content-uploads-a1"]), pull(12, "events", ["content-uploads-b1"]));
    expect(apply(plan)).toEqual(["porady_bohosluzeb/x.pdf", "aktuality/y-plakat.pdf"]);
    expect(readFileSync(join(uploads(), "aktuality/y-plakat.pdf"), "utf8")).toBe(
      "content-uploads-b1/aktuality/y-plakat.pdf",
    );
  });

  it("maps a legacy sheet artifact's PDFs into the sheets folder", () => {
    file("service-sheet-pdf-a1/x.pdf");
    expect(apply(release(pull(11, "sheet", ["service-sheet-pdf-a1"])))).toEqual(["porady_bohosluzeb/x.pdf"]);
    expect(existsSync(join(uploads(), "porady_bohosluzeb/x.pdf"))).toBe(true);
  });

  it("lets the later PR's file of the same path win", () => {
    file("content-uploads-a1/porady_bohosluzeb/x.pdf", "first");
    file("content-uploads-a2/porady_bohosluzeb/x.pdf", "second");
    apply(release(pull(11, "sheet", ["content-uploads-a1"]), pull(12, "sheet", ["content-uploads-a2"])));
    expect(readFileSync(join(uploads(), "porady_bohosluzeb/x.pdf"), "utf8")).toBe("second");
  });

  it.each<[string, () => ReleasePlan, string]>([
    [
      "another kind's folder in a sheet PR",
      () => (file("content-uploads-a1/aktuality/x.pdf"), release(pull(11, "sheet", ["content-uploads-a1"]))),
      "aktuality/x.pdf",
    ],
    [
      "another kind's folder in an events PR",
      () => (file("content-uploads-b1/porady_bohosluzeb/x.pdf"), release(pull(12, "events", ["content-uploads-b1"]))),
      "porady_bohosluzeb/x.pdf",
    ],
    [
      "a file the site cannot link",
      () => (file("content-uploads-a1/porady_bohosluzeb/x.php"), release(pull(11, "sheet", ["content-uploads-a1"]))),
      "x.php",
    ],
    [
      "a file at the artifact's root",
      () => (file("content-uploads-a1/x.pdf"), release(pull(11, "sheet", ["content-uploads-a1"]))),
      "x.pdf",
    ],
    [
      "a folder in a legacy artifact",
      () => (file("service-sheet-pdf-a1/sub/x.pdf"), release(pull(11, "sheet", ["service-sheet-pdf-a1"]))),
      "sub/x.pdf",
    ],
    [
      "a legacy artifact in an events PR",
      () => (file("service-sheet-pdf-b1/x.pdf"), release(pull(12, "events", ["service-sheet-pdf-b1"]))),
      "service-sheet-pdf-b1",
    ],
    [
      "an artifact name with a path",
      () => (file("x/porady_bohosluzeb/x.pdf"), release(pull(11, "sheet", ["content-uploads-a1/../x"]))),
      "content-uploads-a1/../x",
    ],
    [
      "a symlink",
      () => {
        file("outside.pdf");
        mkdirSync(join(from(), "content-uploads-a1/porady_bohosluzeb"), { recursive: true });
        symlinkSync(join(from(), "outside.pdf"), join(from(), "content-uploads-a1/porady_bohosluzeb/x.pdf"));
        return release(pull(11, "sheet", ["content-uploads-a1"]));
      },
      "x.pdf",
    ],
  ])("refuses %s and copies nothing", (_, setup, named) => {
    file("content-uploads-0ff/porady_bohosluzeb/ok.pdf");
    const plan = setup();
    if (plan.action === "release") plan.pulls.unshift(pull(10, "sheet", ["content-uploads-0ff"]));
    expect(() => apply(plan)).toThrow(named);
    expect(existsSync(uploads())).toBe(false);
  });

  it("fails when an artifact of the plan was not downloaded", () => {
    expect(() => apply(release(pull(11, "sheet", ["content-uploads-a1"])))).toThrow("content-uploads-a1");
  });

  it("copies nothing for a plan that releases nothing", () => {
    expect(apply({ action: "none", reason: "x" })).toEqual([]);
  });
});
