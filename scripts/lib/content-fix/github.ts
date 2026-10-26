// What the comment fix workflow reads from the GitHub REST API: a PR, its comments, a commenter's permission and the
// failed steps of a commit's `check` run.

import { gitHubGet, gitHubText } from "../github";
import type { IssueComment } from "./comments";

export type FixPull = {
  open: boolean;
  head: string;
  branch: string;
  /** null when the fork is gone. */
  headRepo: string | null;
  title: string;
  draft: boolean;
  body: string;
};

export type FailedStep = { step: string; log: string };

export type FixReader = {
  pull(number: number): Promise<FixPull>;
  /** All comments of the PR, oldest first. */
  comments(number: number): Promise<IssueComment[]>;
  /** The user's repo permission: `admin`, `maintain`, `write`, `triage` or `read`. */
  permission(user: string): Promise<string>;
  /** The failed steps of the `check` run of `sha` (`[]` unless it failed). */
  failedCheck(sha: string): Promise<FailedStep[]>;
};

/** The workflow job (.github/workflows/check.yml) whose check run is read. */
const CHECK_RUN = "check";
const LOG_LINES = 150;

/** Reads the GitHub REST API of `repo` with `token`. */
export function fixReader(repo: string, token: string, fetchImpl: typeof fetch = fetch): FixReader {
  const get = gitHubGet(repo, token, fetchImpl);
  const text = gitHubText(repo, token, fetchImpl);
  return {
    pull: async (number) => {
      const pull = await get<{
        state: string;
        title: string;
        draft: boolean;
        body: string | null;
        head: { sha: string; ref: string; repo: { full_name: string } | null };
      }>(`/pulls/${number}`);
      return {
        open: pull.state === "open",
        head: pull.head.sha,
        branch: pull.head.ref,
        headRepo: pull.head.repo?.full_name ?? null,
        title: pull.title,
        draft: pull.draft,
        body: pull.body ?? "",
      };
    },
    comments: async (number) => {
      const found: IssueComment[] = [];
      for (let page = 1; ; page++) {
        const batch = await get<
          {
            id: number;
            body: string;
            created_at: string;
            user: { login: string; type: string } | null;
            author_association: string;
          }[]
        >(`/issues/${number}/comments?per_page=100&page=${page}`);
        found.push(
          ...batch.map((comment) => ({
            id: comment.id,
            body: comment.body,
            createdAt: comment.created_at,
            author: comment.user?.login ?? "",
            authorType: comment.user?.type ?? "",
            association: comment.author_association,
          })),
        );
        if (batch.length < 100) return found;
      }
    },
    permission: async (user) =>
      (await get<{ permission: string }>(`/collaborators/${encodeURIComponent(user)}/permission`)).permission,
    failedCheck: async (sha) => {
      const { check_runs: runs } = await get<{ check_runs: { id: number; conclusion: string | null }[] }>(
        `/commits/${sha}/check-runs?check_name=${CHECK_RUN}`,
      );
      // The newest run (the highest id) answers for the commit.
      const run = runs.sort((a, b) => b.id - a.id)[0];
      if (run?.conclusion !== "failure") return [];
      // For GitHub Actions the check run's id is the job's.
      const job = await get<{ steps: { name: string; conclusion: string | null }[] }>(`/actions/jobs/${run.id}`);
      const failed = job.steps.filter((step) => step.conclusion === "failure");
      if (!failed.length) return [];
      const log = (await text(`/actions/jobs/${run.id}/logs`)).trimEnd().split("\n").slice(-LOG_LINES).join("\n");
      return failed.map((step) => ({ step: step.name, log }));
    },
  };
}
