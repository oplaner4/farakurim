// Plans the release of merged service sheet PRs: from the commits since the last release tag and the GitHub API it
// decides whether to skip (the pushed commit is not a sheet PR's squash commit), do nothing (released already), stop
// (main holds other unreleased commits, or a PDF artifact expired) or release the PRs, each with the PDF artifacts of
// its commits in the order to apply them, so the newest PDF of a week wins.

import { execFileSync } from "node:child_process";
import { parseCommandLine } from "../command";

export type UnreleasedCommit = { sha: string; subject: string };

/** A PR that contains a commit, as GET /repos/{repo}/commits/{sha}/pulls gives it. */
export type CommitPull = {
  number: number;
  branch: string;
  /** null when the fork is gone. */
  headRepo: string | null;
  mergedAt: string | null;
  mergeSha: string | null;
};

export type Artifact = { name: string; runId: number; expired: boolean };

export type GitHubReader = {
  pullsOfCommit(sha: string): Promise<CommitPull[]>;
  /** The PR's commit shas, oldest first. */
  commitsOfPull(number: number): Promise<string[]>;
  artifactsNamed(name: string): Promise<Artifact[]>;
};

export type SheetPull = {
  number: number;
  branch: string;
  mergedAt: string;
  /** The PDF artifacts to apply in this order. */
  artifacts: { name: string; runId: number }[];
};

export type ReleasePlan =
  | { action: "skip"; reason: string }
  | { action: "none"; reason: string }
  | { action: "blocked"; reason: string; pulls: SheetPull[] }
  | { action: "release"; pulls: SheetPull[] };

export const SHEET_BRANCH_PREFIX = "service-sheet/";

/** The artifact in which the service sheet workflow hands on the PDFs staged for a commit. */
export const pdfArtifactName = (sha: string) => `service-sheet-pdf-${sha}`;

const short = (sha: string) => sha.slice(0, 7);

/** The merged sheet PR of this repo whose squash commit is `sha`, if any. */
export function sheetPullOf(sha: string, pulls: CommitPull[], repo: string): CommitPull | undefined {
  return pulls.find(
    (pull) =>
      pull.mergedAt !== null &&
      pull.mergeSha === sha &&
      pull.branch.startsWith(SHEET_BRANCH_PREFIX) &&
      pull.headRepo === repo,
  );
}

/**
 * The release plan for the push of `pushed`, given the `commits` since the last tag (newest first): released only
 * when every one of them is a sheet PR's squash commit.
 */
export async function planRelease({
  repo,
  pushed,
  commits,
  github,
}: {
  repo: string;
  pushed: string;
  commits: UnreleasedCommit[];
  github: GitHubReader;
}): Promise<ReleasePlan> {
  if (!sheetPullOf(pushed, await github.pullsOfCommit(pushed), repo))
    return { action: "skip", reason: `${short(pushed)} is not a merged service sheet PR` };
  if (!commits.length) return { action: "none", reason: "Nothing to release since the last tag" };

  const sheetPulls: CommitPull[] = [];
  const others: UnreleasedCommit[] = [];
  for (const commit of commits) {
    const pull = sheetPullOf(commit.sha, await github.pullsOfCommit(commit.sha), repo);
    if (pull) sheetPulls.push(pull);
    else others.push(commit);
  }
  sheetPulls.sort((a, b) => a.mergedAt!.localeCompare(b.mergedAt!));

  const pulls: SheetPull[] = [];
  const expired: string[] = [];
  for (const pull of sheetPulls) {
    const artifacts: SheetPull["artifacts"] = [];
    for (const sha of await github.commitsOfPull(pull.number)) {
      const found = await github.artifactsNamed(pdfArtifactName(sha));
      if (!found.length) continue; // a commit the workflow did not make
      const live = found.filter((artifact) => !artifact.expired).sort((a, b) => b.runId - a.runId)[0];
      if (live) artifacts.push({ name: live.name, runId: live.runId });
      else expired.push(`${short(sha)} (PR #${pull.number})`);
    }
    pulls.push({ number: pull.number, branch: pull.branch, mergedAt: pull.mergedAt!, artifacts });
  }

  if (others.length) {
    const list = others.map((commit) => `${short(commit.sha)} ${commit.subject}`).join(", ");
    return { action: "blocked", reason: `main has other unreleased commits: release by hand (${list})`, pulls };
  }
  if (expired.length) {
    const reason = `The PDF artifact of ${expired.join(", ")} expired: stage the PDF and release by hand`;
    return { action: "blocked", reason, pulls };
  }
  return { action: "release", pulls };
}

type ApiPull = {
  number: number;
  merged_at: string | null;
  merge_commit_sha: string | null;
  head: { ref: string; repo: { full_name: string } | null };
};
type ApiArtifact = { name: string; expired: boolean; workflow_run: { id: number } };

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
      (await get<{ sha: string }[]>(`/pulls/${number}/commits?per_page=100`)).map((commit) => commit.sha),
    artifactsNamed: async (name) =>
      (
        await get<{ artifacts: ApiArtifact[] }>(`/actions/artifacts?name=${encodeURIComponent(name)}&per_page=100`)
      ).artifacts.map((artifact) => ({
        name: artifact.name,
        runId: artifact.workflow_run.id,
        expired: artifact.expired,
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
  return git("log", "--format=%H%x09%s", tag ? `${tag}..HEAD` : "HEAD")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, ...subject] = line.split("\t");
      return { sha, subject: subject.join("\t") };
    });
}

const USAGE = "Usage: pnpm --silent sheet-release --pushed <sha>";

export function parseCommand(args: string[]): { pushed: string } {
  const { values, positionals } = parseCommandLine(args, { pushed: { type: "string" } }, USAGE);
  if (positionals.length) throw new Error(`unexpected argument ${positionals[0]}\n${USAGE}`);
  if (!values.pushed) throw new Error(`--pushed is required\n${USAGE}`);
  return { pushed: values.pushed };
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export async function execute({ pushed }: { pushed: string }): Promise<void> {
  const repo = env("GITHUB_REPOSITORY");
  const github = gitHubReader(repo, env("GH_TOKEN"));
  console.log(JSON.stringify(await planRelease({ repo, pushed, commits: unreleasedCommits(), github })));
}
