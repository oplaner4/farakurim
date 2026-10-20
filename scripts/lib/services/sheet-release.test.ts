import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { freshTempDir } from "../test-helpers";
import {
  gitHubReader,
  parseCommand,
  planRelease,
  unreleasedCommits,
  type Artifact,
  type CommitPull,
  type GitHubReader,
  type UnreleasedCommit,
} from "./sheet-release";

const repo = "oplaner4/farakurim";

function sheetPull(number: number, sha: string, mergedAt: string, overrides: Partial<CommitPull> = {}): CommitPull {
  return { number, branch: "service-sheet/2026-10-19", headRepo: repo, mergedAt, mergeSha: sha, ...overrides };
}

const artifact = (sha: string, runId: number, expired = false): Artifact => ({
  name: `service-sheet-pdf-${sha}`,
  runId,
  expired,
});

function fakeGitHub(
  pulls: Record<string, CommitPull[]>,
  commits: Record<number, string[]>,
  artifacts: Artifact[],
): GitHubReader {
  return {
    pullsOfCommit: async (sha) => pulls[sha] ?? [],
    commitsOfPull: async (number) => commits[number] ?? [],
    artifactsNamed: async (name) => artifacts.filter((a) => a.name === name),
  };
}

const commit = (sha: string, subject = "feat(content): add the service sheet"): UnreleasedCommit => ({ sha, subject });

describe("planRelease", () => {
  const twoPulls = { b: [sheetPull(12, "b", "2026-10-19T10:05:00Z")], a: [sheetPull(11, "a", "2026-10-19T10:00:00Z")] };

  it("releases two PRs in merge order", async () => {
    const github = fakeGitHub(twoPulls, { 11: ["a1", "a2"], 12: ["b1"] }, [
      artifact("a1", 101),
      artifact("a2", 102),
      artifact("b1", 201),
    ]);
    const plan = await planRelease({ repo, pushed: "b", commits: [commit("b"), commit("a")], github });
    expect(plan).toMatchObject({
      action: "release",
      pulls: [
        {
          number: 11,
          branch: "service-sheet/2026-10-19",
          artifacts: [
            { name: "service-sheet-pdf-a1", runId: 101 },
            { name: "service-sheet-pdf-a2", runId: 102 },
          ],
        },
        { number: 12, artifacts: [{ name: "service-sheet-pdf-b1", runId: 201 }] },
      ],
    });
  });

  it("skips commits without an artifact", async () => {
    const github = fakeGitHub(twoPulls, { 11: ["a1", "m1"] }, [artifact("a1", 101)]);
    const plan = await planRelease({ repo, pushed: "a", commits: [commit("a")], github });
    expect(plan).toMatchObject({ action: "release", pulls: [{ number: 11, artifacts: [{ runId: 101 }] }] });
    if (plan.action === "release") expect(plan.pulls[0].artifacts).toHaveLength(1);
  });

  it("takes the newest unexpired artifact of a commit", async () => {
    const github = fakeGitHub(twoPulls, { 11: ["a1"] }, [artifact("a1", 101, true), artifact("a1", 105)]);
    const plan = await planRelease({ repo, pushed: "a", commits: [commit("a")], github });
    expect(plan).toMatchObject({ action: "release", pulls: [{ artifacts: [{ runId: 105 }] }] });
  });

  it("blocks on an expired artifact", async () => {
    const sha = "a1b2c3d4e5f6";
    const github = fakeGitHub(twoPulls, { 11: [sha] }, [artifact(sha, 101, true)]);
    const plan = await planRelease({ repo, pushed: "a", commits: [commit("a")], github });
    expect(plan).toMatchObject({ action: "blocked", pulls: [{ number: 11 }] });
    if (plan.action !== "blocked") return;
    expect(plan.reason).toContain(sha.slice(0, 7));
    expect(plan.reason).toContain("#11");
    expect(plan.reason).toContain("expired");
  });

  it("blocks when main has other unreleased commits", async () => {
    const github = fakeGitHub(twoPulls, { 12: ["b1"] }, [artifact("b1", 201)]);
    const other = commit("x123456789", "feat(news): add the Hubertská mše event");
    const plan = await planRelease({ repo, pushed: "b", commits: [commit("b"), other], github });
    expect(plan).toMatchObject({ action: "blocked", pulls: [{ number: 12 }] });
    if (plan.action !== "blocked") return;
    expect(plan.pulls).toHaveLength(1);
    expect(plan.reason).toContain("main has other unreleased commits");
    expect(plan.reason).toContain("feat(news): add the Hubertská mše event");
  });

  it.each<[string, CommitPull[]]>([
    ["no PR", []],
    ["another branch", [sheetPull(12, "b", "2026-10-19T10:05:00Z", { branch: "feature/x" })]],
    ["a fork", [sheetPull(12, "b", "2026-10-19T10:05:00Z", { headRepo: "someone/farakurim" })]],
    ["an unmerged PR", [sheetPull(12, "b", "2026-10-19T10:05:00Z", { mergedAt: null })]],
    ["a rebase", [sheetPull(12, "b", "2026-10-19T10:05:00Z", { mergeSha: "other" })]],
  ])("skips a push that is not a sheet merge (%s)", async (_, pulls) => {
    const github = fakeGitHub({ b: pulls }, { 12: ["b1"] }, [artifact("b1", 201)]);
    const plan = await planRelease({ repo, pushed: "b", commits: [commit("b")], github });
    expect(plan.action).toBe("skip");
  });

  it("does nothing when everything is released", async () => {
    const github = fakeGitHub(twoPulls, {}, []);
    const plan = await planRelease({ repo, pushed: "b", commits: [], github });
    expect(plan.action).toBe("none");
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

    const artifacts = stubFetch({ artifacts: [{ name: "n", expired: false, workflow_run: { id: 9 } }] });
    expect(await gitHubReader(repo, "t0k", artifacts.fetchImpl).artifactsNamed("n")).toEqual([
      { name: "n", runId: 9, expired: false },
    ]);
    expect(artifacts.calls[0].url).toBe(`https://api.github.com/repos/${repo}/actions/artifacts?name=n&per_page=100`);

    const commits = stubFetch([{ sha: "c1" }, { sha: "c2" }]);
    expect(await gitHubReader(repo, "t0k", commits.fetchImpl).commitsOfPull(7)).toEqual(["c1", "c2"]);
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
  const dir = freshTempDir("sheet-release");
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
});

describe("parseCommand", () => {
  it("reads --pushed", () => {
    expect(parseCommand(["--pushed", "abc"])).toEqual({ pushed: "abc" });
  });

  it("needs --pushed", () => {
    expect(() => parseCommand([])).toThrow(/--pushed/);
  });
});
