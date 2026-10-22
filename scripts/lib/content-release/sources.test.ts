import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { freshTempDir } from "../test-helpers";
import { gitHubReader, unreleasedCommits, type CommitPull } from "./sources";

const repo = "oplaner4/farakurim";

const sheetPull = (number: number, sha: string, mergedAt: string): CommitPull => ({
  number,
  branch: "service-sheet/2026-10-19",
  headRepo: repo,
  mergedAt,
  mergeSha: sha,
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
