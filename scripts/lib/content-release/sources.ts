// What a content release is planned from: the commits since the last release tag (git) and, from the GitHub REST API,
// the PRs of a commit, the commits of a PR and the artifacts of a name.

import { execFileSync } from "node:child_process";

/** `merge` when the commit has more than one parent. */
export type UnreleasedCommit = { sha: string; subject: string; merge: boolean };

/** A PR that contains a commit, as GET /repos/{repo}/commits/{sha}/pulls gives it. */
export type CommitPull = {
  number: number;
  branch: string;
  /** null when the fork is gone. */
  headRepo: string | null;
  mergedAt: string | null;
  mergeSha: string | null;
};

export type Artifact = {
  name: string;
  runId: number;
  expired: boolean;
  /** Uploaded by a run on this repo's main (a content workflow), not by a fork's or a branch's run. */
  trusted: boolean;
};

/** A commit of a PR; `bot` when a GitHub App's bot authored it (a content workflow), not a person. */
export type PullCommit = { sha: string; bot: boolean };

export type GitHubReader = {
  pullsOfCommit(sha: string): Promise<CommitPull[]>;
  /** The PR's commits, oldest first. */
  commitsOfPull(number: number): Promise<PullCommit[]>;
  artifactsNamed(name: string): Promise<Artifact[]>;
};

type ApiPull = {
  number: number;
  merged_at: string | null;
  merge_commit_sha: string | null;
  head: { ref: string; repo: { full_name: string } | null };
};
type ApiArtifact = {
  name: string;
  expired: boolean;
  workflow_run: { id: number; repository_id: number; head_repository_id: number; head_branch: string };
};

/** Reads the GitHub REST API of `repo` with `token`. A PR's commits and the artifacts of a name fit one page. */
export function gitHubReader(repo: string, token: string, fetchImpl: typeof fetch = fetch): GitHubReader {
  async function get<T>(path: string): Promise<T> {
    const response = await fetchImpl(`https://api.github.com/repos/${repo}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!response.ok) throw new Error(`GitHub ${path}: ${response.status}`);
    return (await response.json()) as T;
  }
  return {
    pullsOfCommit: async (sha) =>
      (await get<ApiPull[]>(`/commits/${sha}/pulls`)).map((pull) => ({
        number: pull.number,
        branch: pull.head.ref,
        headRepo: pull.head.repo?.full_name ?? null,
        mergedAt: pull.merged_at,
        mergeSha: pull.merge_commit_sha,
      })),
    commitsOfPull: async (number) =>
      (await get<{ sha: string; author: { type: string } | null }[]>(`/pulls/${number}/commits?per_page=100`)).map(
        (commit) => ({ sha: commit.sha, bot: commit.author?.type === "Bot" }),
      ),
    artifactsNamed: async (name) =>
      (
        await get<{ artifacts: ApiArtifact[] }>(`/actions/artifacts?name=${encodeURIComponent(name)}&per_page=100`)
      ).artifacts.map(({ name, expired, workflow_run: run }) => ({
        name,
        runId: run.id,
        expired,
        trusted: run.head_repository_id === run.repository_id && run.head_branch === "main",
      })),
  };
}

/** The commits of the checkout in `cwd` since the last `v*` tag (all of them without one), newest first. */
export function unreleasedCommits(cwd = process.cwd()): UnreleasedCommit[] {
  const git = (...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" });
  let tag = "";
  try {
    tag = git("describe", "--tags", "--abbrev=0", "--match", "v*").trim();
  } catch {
    // no release tag yet
  }
  return git("log", "--format=%H%x09%P%x09%s", tag ? `${tag}..HEAD` : "HEAD")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, parents, ...subject] = line.split("\t");
      return { sha, subject: subject.join("\t"), merge: parents.split(" ").length > 1 };
    });
}
