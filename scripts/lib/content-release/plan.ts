// Plans the release of merged content PRs (service sheets, events): from the commits since the last release tag and
// the GitHub API it decides whether to skip (no unreleased commit is a content PR's squash commit), do nothing
// (released already), stop (main holds a commit only a release by hand may publish, an artifact expired, or a sheet
// PR's commit pushed by hand has none) or release the PRs, each with the artifacts of its commits in the order to apply
// them, so the newest file of a path wins.
// Only an artifact of a run on this repo's main counts: a fork's pull request run can upload one under any name.

import { links } from "@/content/site";
import { SHEETS_FOLDER } from "@/lib/services/service-sheet";
import { EVENTS_FOLDER } from "../stage/event";
import type { CommitPull, GitHubReader, UnreleasedCommit } from "./sources";

/** The kinds of content PR: the branch prefix, the only folder under uploads/ its artifacts may write, its page. */
export const KINDS = {
  sheet: { prefix: "service-sheet/", folder: SHEETS_FOLDER, page: links.services },
  events: { prefix: "events/", folder: EVENTS_FOLDER, page: links.news },
} as const satisfies Record<string, { prefix: string; folder: string; page: string }>;

export type Kind = keyof typeof KINDS;

export type ContentPull = {
  number: number;
  /** The PR's squash commit on main. */
  sha: string;
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
  // A squash merge in GitHub's UI skips the commitlint hook, so the case is not guaranteed.
  const [, type, scope, breaking] = header;
  return type.toLowerCase() === "feat" || scope?.toLowerCase() === "content" || breaking === "!";
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
 * or a sheet PR's commit pushed by hand without one.
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
    // A commit without an artifact staged nothing, or was pushed by hand. An events record links its files, so the
    // release checks them (missingLinks()); a sheet record links none (its PDF's name comes from the code), so a sheet
    // commit pushed by hand may need a PDF staged only on that machine.
    else if (!bot && pull.kind === "sheet") byHand.push(`${short(sha)} (PR #${pull.number})`);
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
    const { number, kind, branch, mergedAt, mergeSha } = pull;
    const page = KINDS[kind].page;
    pulls.push({ number, sha: mergeSha!, kind, branch, page, mergedAt: mergedAt!, artifacts: found.artifacts });
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
    const reason = `${byHand.join(", ")} was pushed by hand and has no artifact: stage its PDF and release by hand`;
    return { action: "blocked", reason, pulls };
  }
  return { action: "release", pulls };
}
