// What a content release is planned from: the commits since the last release tag and the uploaded-file links a commit
// adds to the content (git) and, from the GitHub REST API, the PRs of a commit, the commits of a PR and the artifacts
// of a name.

import { execFileSync } from "node:child_process";
import { UPLOAD_EXTENSIONS, UPLOADS_PATH } from "@/lib/shared/uploads";

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

/** A commit of a PR. */
export type PullCommit = { sha: string };

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
      (await get<{ sha: string }[]>(`/pulls/${number}/commits?per_page=100`)).map((commit) => ({ sha: commit.sha })),
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

/** A link to an uploaded file in the content, as `git grep -E` matches it: "/uploads/aktuality/x-plakat.pdf". */
const UPLOAD_LINK = `${UPLOADS_PATH}[A-Za-z0-9._/%-]+\\.(${UPLOAD_EXTENSIONS.map((e) => e.slice(1)).join("|")})`;

/** The uploaded-file links in src/content at `rev` of the repo in `cwd`. */
export function uploadLinksAt(rev: string, cwd = process.cwd()): Set<string> {
  let out = "";
  try {
    out = execFileSync("git", ["grep", "-ohE", UPLOAD_LINK, rev, "--", "src/content"], {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (error) {
    // git grep exits 1 when nothing matches.
    if ((error as { status?: number }).status !== 1) throw error;
  }
  return new Set(
    out
      .split("\n")
      .filter(Boolean)
      .map((line) => line.slice(line.indexOf(UPLOADS_PATH))),
  );
}

/**
 * The uploaded-file links the commit `sha` adds to src/content, sorted: in the whole content at `sha` and not at its
 * parent, so a link moved or reused from another record is not new.
 */
export function newUploadLinks(sha: string, cwd = process.cwd()): string[] {
  const before = uploadLinksAt(`${sha}^`, cwd);
  return [...uploadLinksAt(sha, cwd)].filter((link) => !before.has(link)).sort();
}
