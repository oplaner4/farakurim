// Plans the release of merged content PRs (service sheets, events): from the commits since the last release tag and
// the GitHub API it decides whether to skip (no unreleased commit is a content PR's squash commit), do nothing
// (released already), stop (main holds a commit only a release by hand may publish, an artifact expired, or a commit
// pushed by hand has no artifact) or release the PRs, each with the artifacts of its commits in the order to apply
// them, so the newest file of a path wins.
// Only an artifact of a run on this repo's main counts: a fork's pull request run can upload one under any name.

import { execFileSync } from "node:child_process";
import { links } from "@/content/site";
import { SHEETS_FOLDER } from "@/lib/services/service-sheet";
import { parseCommandLine } from "./command";
import { EVENTS_FOLDER } from "./stage/event";

/** The kinds of content PR: the branch prefix, the only folder under uploads/ its artifacts may write, its page. */
export const KINDS = {
  sheet: { prefix: "service-sheet/", folder: SHEETS_FOLDER, page: links.services },
  events: { prefix: "events/", folder: EVENTS_FOLDER, page: links.news },
} as const satisfies Record<string, { prefix: string; folder: string; page: string }>;

export type Kind = keyof typeof KINDS;

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

export type ContentPull = {
  number: number;
  kind: Kind;
  branch: string;
  page: string;
  mergedAt: string;
  /** The artifacts to apply in this order. */
  artifacts: { name: string; runId: number }[];
};

export type ReleasePlan =
  | { action: "skip"; reason: string }
  | { action: "none"; reason: string }
  | { action: "blocked"; reason: string; pulls: ContentPull[] }
  | { action: "release"; pulls: ContentPull[] };

/** The artifact in which a content workflow hands on the files it staged for a commit, as paths under uploads/. */
export const uploadsArtifactName = (sha: string) => `content-uploads-${sha}`;

/** The service sheet workflow's former artifact: the commit's staged PDFs, flat. */
export const legacySheetArtifactName = (sha: string) => `service-sheet-pdf-${sha}`;

const short = (sha: string) => sha.slice(0, 7);

const HEADER = /^(\w+)(?:\(([\w-]+)\))?(!)?: \S/;

/**
 * Whether a commit outside the content PRs stops an automatic release: a feature (it goes live when the maintainer
 * releases it), the `content` scope (its staged files may exist only on the maintainer's machine), a breaking change,
 * or a header that does not parse.
 */
export function blocksRelease(subject: string): boolean {
  const header = HEADER.exec(subject);
  if (!header) return true;
  const [, type, scope, breaking] = header;
  return type === "feat" || scope === "content" || breaking === "!";
}

/** The merged content PR of this repo whose squash commit is `sha`, if any, with its kind. */
export function contentPullOf(
  sha: string,
  pulls: CommitPull[],
  repo: string,
): (CommitPull & { kind: Kind }) | undefined {
  for (const pull of pulls) {
    if (pull.mergedAt === null || pull.mergeSha !== sha || pull.headRepo !== repo) continue;
    const kind = (Object.keys(KINDS) as Kind[]).find((k) => pull.branch.startsWith(KINDS[k].prefix));
    if (kind) return { ...pull, kind };
  }
  return undefined;
}

/**
 * The artifacts of a content PR's commits, oldest first, and the commits that stop the release: an expired artifact,
 * or a commit pushed by hand without one.
 */
async function artifactsOfPull(pull: { number: number; kind: Kind }, github: GitHubReader) {
  const artifacts: ContentPull["artifacts"] = [];
  const expired: string[] = [];
  const byHand: string[] = [];
  for (const { sha, bot } of await github.commitsOfPull(pull.number)) {
    const names = [uploadsArtifactName(sha), ...(pull.kind === "sheet" ? [legacySheetArtifactName(sha)] : [])];
    const found = (await Promise.all(names.map((name) => github.artifactsNamed(name))))
      .flat()
      .filter((artifact) => artifact.trusted);
    const live = found.filter((artifact) => !artifact.expired).sort((a, b) => b.runId - a.runId)[0];
    if (live) artifacts.push({ name: live.name, runId: live.runId });
    else if (found.length) expired.push(`${short(sha)} (PR #${pull.number})`);
    // A workflow run that staged nothing; a commit pushed by hand may carry a file staged only on that machine,
    // even under the name of a file an artifact holds (a correction keeps its rev until it is on the server).
    else if (!bot) byHand.push(`${short(sha)} (PR #${pull.number})`);
  }
  return { artifacts, expired, byHand };
}

/**
 * The release plan for the `commits` since the last tag (newest first): released only when every one of them is a
 * content PR's squash commit, a merge commit or a commit `blocksRelease` lets through, skipped when none is a content
 * PR's.
 */
export async function planRelease({
  repo,
  commits,
  github,
}: {
  repo: string;
  commits: UnreleasedCommit[];
  github: GitHubReader;
}): Promise<ReleasePlan> {
  if (!commits.length) return { action: "none", reason: "Nothing to release since the last tag" };

  const contentPulls: (CommitPull & { kind: Kind })[] = [];
  const blocking: UnreleasedCommit[] = [];
  for (const commit of commits) {
    const pull = contentPullOf(commit.sha, await github.pullsOfCommit(commit.sha), repo);
    if (pull) contentPulls.push(pull);
    // A merge commit's own commits are in the list and judged on their own.
    else if (!commit.merge && blocksRelease(commit.subject)) blocking.push(commit);
  }
  if (!contentPulls.length) return { action: "skip", reason: "No unreleased commit is a merged content PR" };
  contentPulls.sort((a, b) => a.mergedAt!.localeCompare(b.mergedAt!));

  const pulls: ContentPull[] = [];
  const expired: string[] = [];
  const byHand: string[] = [];
  for (const pull of contentPulls) {
    const found = await artifactsOfPull(pull, github);
    expired.push(...found.expired);
    byHand.push(...found.byHand);
    const { number, kind, branch, mergedAt } = pull;
    pulls.push({ number, kind, branch, page: KINDS[kind].page, mergedAt: mergedAt!, artifacts: found.artifacts });
  }

  if (blocking.length) {
    const list = blocking.map((commit) => `${short(commit.sha)} ${commit.subject}`).join(", ");
    return { action: "blocked", reason: `main has commits only a release by hand may publish: ${list}`, pulls };
  }
  if (expired.length) {
    const reason = `The artifact of ${expired.join(", ")} expired: stage its files and release by hand`;
    return { action: "blocked", reason, pulls };
  }
  if (byHand.length) {
    const reason = `${byHand.join(", ")} was pushed by hand and has no artifact: stage its files and release by hand`;
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

const USAGE = "Usage: pnpm --silent content-release";

export type Command = { action: "plan" };

export function parseCommand(args: string[]): Command {
  const { positionals } = parseCommandLine(args, {}, USAGE);
  if (positionals.length) throw new Error(`unexpected argument ${positionals[0]}\n${USAGE}`);
  return { action: "plan" };
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export async function execute(): Promise<void> {
  const repo = env("GITHUB_REPOSITORY");
  const github = gitHubReader(repo, env("GH_TOKEN"));
  console.log(JSON.stringify(await planRelease({ repo, commits: unreleasedCommits(), github })));
}
