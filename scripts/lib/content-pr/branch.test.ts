import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Artifact, GitHubReader, OpenPull } from "../content-release/sources";
import { freshTempDir, testGit } from "../test-helpers/files";
import { branchOutputs, chooseBranch, MISSING_REPORT, newBranchName } from "./branch";

describe("chooseBranch", () => {
  const dir = freshTempDir("content-pr-branch");

  /** A checkout with one commit on main and these branches on origin, each at a commit of its own; returns HEAD. */
  function checkout(...originBranches: string[]): string {
    mkdirSync(dir(), { recursive: true });
    testGit(dir(), "init", "-q", "-b", "main");
    writeFileSync(join(dir(), "a.txt"), "a\n");
    testGit(dir(), "add", ".");
    testGit(dir(), "commit", "-q", "-m", "main");
    for (const branch of originBranches) {
      testGit(dir(), "commit", "-q", "--allow-empty", "-m", branch);
      testGit(dir(), "update-ref", `refs/remotes/origin/${branch}`, "HEAD");
      testGit(dir(), "reset", "-q", "--hard", "HEAD~1");
    }
    return testGit(dir(), "rev-parse", "HEAD");
  }

  const originHead = (branch: string) => testGit(dir(), "rev-parse", `refs/remotes/origin/${branch}`);

  /** A GitHub with these open PRs, the PR's commit `c1` and these report artifacts. */
  const fakeGitHub =
    (pulls: OpenPull[], artifacts: Artifact[] = []) =>
    (): GitHubReader => ({
      pullsOfCommit: async () => [],
      commitsOfPull: async () => [{ sha: "c1", bot: true }],
      artifactsNamed: async (name) => artifacts.filter((a) => a.name === name),
      openPulls: async () => pulls,
    });
  const noGitHub = (): GitHubReader => {
    throw new Error("no GitHub for this kind");
  };
  const report: Artifact = { name: "content-report-c1", runId: 41, expired: false, trusted: true };

  it("continues the newest open sheet PR of this repo with its stored report", async () => {
    checkout("service-sheet/2026-11-14", "service-sheet/2026-11-07");
    const github = fakeGitHub(
      [
        { number: 12, branch: "service-sheet/x", fork: true },
        { number: 11, branch: "events/2026-11-15", fork: false },
        { number: 10, branch: "service-sheet/2026-11-14", fork: false },
        { number: 9, branch: "service-sheet/2026-11-07", fork: false },
      ],
      [report],
    );
    const choice = await chooseBranch("sheet", { cwd: dir(), date: "2026-11-21", today: "2026-11-21", github });
    expect(choice).toEqual({
      branch: "service-sheet/2026-11-14",
      base: originHead("service-sheet/2026-11-14"),
      pr: 10,
      report: { runId: 41, name: "content-report-c1" },
    });
    expect(branchOutputs(choice)).toEqual({
      branch: "service-sheet/2026-11-14",
      base: originHead("service-sheet/2026-11-14"),
      pr: "10",
      report_run: "41",
      report_name: "content-report-c1",
    });
  });

  it("refuses an open sheet PR without a stored report", async () => {
    checkout("service-sheet/2026-11-14");
    const github = fakeGitHub(
      [{ number: 10, branch: "service-sheet/2026-11-14", fork: false }],
      [{ ...report, expired: true }],
    );
    await expect(
      chooseBranch("sheet", { cwd: dir(), date: "2026-11-21", today: "2026-11-21", github }),
    ).rejects.toThrow(MISSING_REPORT);
  });

  it("names a new sheet branch after the mail's date without an open PR of this repo", async () => {
    const head = checkout();
    const github = fakeGitHub([{ number: 12, branch: "service-sheet/x", fork: true }]);
    const choice = await chooseBranch("sheet", { cwd: dir(), date: "2026-11-20", today: "2026-11-21", github });
    expect(choice).toEqual({ branch: "service-sheet/2026-11-20", base: head });
    expect(branchOutputs(choice)).toEqual({
      branch: "service-sheet/2026-11-20",
      base: head,
      pr: "",
      report_run: "",
      report_name: "",
    });
  });

  it("names an events branch without asking GitHub", async () => {
    const head = checkout("events/2026-11-20");
    expect(
      await chooseBranch("events", { cwd: dir(), date: "2026-11-20", today: "2026-11-21", github: noGitHub }),
    ).toEqual({ branch: "events/2026-11-20-2", base: head });
  });
});

describe("newBranchName", () => {
  const dir = freshTempDir("content-pr-branch-name");

  function checkout(...originBranches: string[]) {
    testGit(dir(), "init", "-q", "-b", "main");
    testGit(dir(), "commit", "-q", "--allow-empty", "-m", "main");
    for (const branch of originBranches) testGit(dir(), "update-ref", `refs/remotes/origin/${branch}`, "HEAD");
  }

  it("adds a suffix while origin has the name, a closed PR's branch too", () => {
    checkout("service-sheet/2026-11-21", "service-sheet/2026-11-21-2", "events/2026-11-21");
    expect(newBranchName(dir(), "sheet", "2026-11-21", "2026-11-22")).toBe("service-sheet/2026-11-21-3");
    expect(newBranchName(dir(), "events", "2026-11-20", "2026-11-22")).toBe("events/2026-11-20");
  });

  it("takes today's date when the mail's is missing or not a date", () => {
    checkout();
    expect(newBranchName(dir(), "events", "", "2026-11-22")).toBe("events/2026-11-22");
    expect(newBranchName(dir(), "events", "2026-02-30", "2026-11-22")).toBe("events/2026-11-22");
    expect(newBranchName(dir(), "events", "x; rm -rf /", "2026-11-22")).toBe("events/2026-11-22");
  });
});
