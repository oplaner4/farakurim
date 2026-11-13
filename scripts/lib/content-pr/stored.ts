// Finding the report a content PR stored: the per-commit artifact `content-report-<sha>` of the newest commit that
// has one, so a commit pushed by hand on top of the bot's falls back to the report below it.

import type { GitHubReader } from "../content-release/sources";

export const reportArtifactName = (sha: string) => `content-report-${sha}`;

/** The PR's newest live, trusted report artifact (its newest run when a commit has several), or undefined. */
export async function storedReportOf(
  pr: number,
  github: GitHubReader,
): Promise<{ name: string; runId: number } | undefined> {
  for (const { sha } of (await github.commitsOfPull(pr)).reverse()) {
    const live = (await github.artifactsNamed(reportArtifactName(sha)))
      .filter((artifact) => artifact.trusted && !artifact.expired)
      .sort((a, b) => b.runId - a.runId)[0];
    if (live) return { name: live.name, runId: live.runId };
  }
  return undefined;
}
