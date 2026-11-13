import { describe, expect, it } from "vitest";
import type { Artifact, GitHubReader } from "../content-release/sources";
import { reportArtifactName, storedReportOf } from "./stored";

const artifact = (sha: string, runId: number, { expired = false, trusted = true } = {}): Artifact => ({
  name: reportArtifactName(sha),
  runId,
  expired,
  trusted,
});

/** The PR's commits are given oldest first, as GitHub gives them. */
function fakeGitHub(commits: string[], artifacts: Artifact[]): GitHubReader {
  return {
    pullsOfCommit: async () => [],
    commitsOfPull: async () => commits.map((sha) => ({ sha, bot: true })),
    artifactsNamed: async (name) => artifacts.filter((a) => a.name === name),
  };
}

describe("reportArtifactName", () => {
  it("names the artifact after the commit", () => {
    expect(reportArtifactName("abc123")).toBe("content-report-abc123");
  });
});

describe("storedReportOf", () => {
  it("takes the head's report", async () => {
    const github = fakeGitHub(["a1", "b2"], [artifact("a1", 10), artifact("b2", 20)]);
    expect(await storedReportOf(7, github)).toEqual({ name: "content-report-b2", runId: 20 });
  });

  it("takes the newest run's report when a fix run uploaded it again for the same head", async () => {
    const github = fakeGitHub(["a1"], [artifact("a1", 10), artifact("a1", 30), artifact("a1", 20)]);
    expect(await storedReportOf(7, github)).toEqual({ name: "content-report-a1", runId: 30 });
  });

  it("falls back to the newest earlier commit when the head was pushed by hand", async () => {
    const github = fakeGitHub(["a1", "b2", "c3"], [artifact("a1", 10), artifact("b2", 20)]);
    expect(await storedReportOf(7, github)).toEqual({ name: "content-report-b2", runId: 20 });
  });

  it("ignores untrusted and expired artifacts", async () => {
    const github = fakeGitHub(
      ["a1", "b2", "c3"],
      [artifact("a1", 10), artifact("b2", 20, { expired: true }), artifact("c3", 30, { trusted: false })],
    );
    expect(await storedReportOf(7, github)).toEqual({ name: "content-report-a1", runId: 10 });
  });

  it("gives none without any", async () => {
    expect(await storedReportOf(7, fakeGitHub(["a1"], []))).toBeUndefined();
  });
});
