// The DOCX's newest week a sheet mail run left out because the mail's subject named an older week: the two weeks from
// the workflow's step outputs, whether the checkout's service sheets hold the newest one, and the note that says so.
// A PR gets the note as a comment, once per left-out week (its marker); a run without a PR shows it in the job
// summary when that week is not staged yet.

import { sheetWeekSchema } from "@/lib/services/schema";
import { pragueDate } from "@/lib/shared/prague";
import type { Env } from "../command";
import { gitHubGet, gitHubPost, issueComments } from "../github";
import type { Week } from "../services/sheet-week";
import { inCheckout } from "./changes";
import { formatWeeks } from "./weeks";

const SHEETS = "src/content/service-sheets.json";

/** The week the mail named and handled, and the DOCX's newest week it left out. */
export type NewerWeek = { week: Week; skipped: Week };

/** The week `from` to `to` in `env`, none unless both are dates. */
function weekFromEnv(env: Env, from: string, to: string): Week | undefined {
  const parsed = sheetWeekSchema.safeParse({ validFrom: env[from], validTo: env[to] });
  return parsed.success ? parsed.data : undefined;
}

/**
 * The handled week (WEEK_FROM, WEEK_TO) and the newest week it left out (SKIPPED_FROM, SKIPPED_TO) from the
 * workflow's step outputs; none unless all four are dates.
 */
export function newerWeekFromEnv(env: Env): NewerWeek | undefined {
  const week = weekFromEnv(env, "WEEK_FROM", "WEEK_TO");
  const skipped = weekFromEnv(env, "SKIPPED_FROM", "SKIPPED_TO");
  return week && skipped ? { week, skipped } : undefined;
}

/** Whether the service sheets in the checkout `cwd` hold `week`; an unreadable file counts as not. */
export function isStaged(cwd: string, week: Week): boolean {
  try {
    const sheets = (JSON.parse(inCheckout(cwd, SHEETS) ?? "{}") as { sheets?: Week[] }).sheets ?? [];
    return sheets.some((sheet) => sheet.validFrom === week.validFrom);
  } catch {
    return false;
  }
}

/**
 * The note on the left-out week: whether it is staged, and, when it is not and the named week ended before `today`
 * (Prague), that it is likely the one meant.
 */
export function newerWeekNote({ week, skipped }: NewerWeek, staged: boolean, today = pragueDate(new Date())): string {
  const head = `The mail named the week ${formatWeeks([week])}; the DOCX's newest week, ${formatWeeks([skipped])}, was not handled:`;
  if (staged) return `${head} it is already staged, and this DOCX's version of it was not checked.`;
  const meant = week.validTo < today ? " The named week has ended, so the newest one is likely the one meant." : "";
  return `${head} it is not staged yet.${meant}`;
}

/** The hidden marker of the comment on the left-out week `skipped`, so the next mail that leaves it out adds none. */
export const newerWeekMarker = (skipped: Week) => `<!-- newer-week:${skipped.validFrom} -->`;

/** Where `commentNewerWeek` reads and writes the PR's comments: the GitHub REST API, or a fake in the tests. */
export type CommentWriter = {
  /** The bodies of the PR's comments. */
  bodies(pr: number): Promise<string[]>;
  post(pr: number, body: string): Promise<void>;
};

/** The PR comments of `repo`, with `token`. */
export function commentWriter(repo: string, token: string, fetchImpl: typeof fetch = fetch): CommentWriter {
  const get = gitHubGet(repo, token, fetchImpl);
  const post = gitHubPost(repo, token, fetchImpl);
  return {
    bodies: async (pr) => (await issueComments(get, pr)).map((comment) => comment.body),
    post: (pr, body) => post(`/issues/${pr}/comments`, { body }),
  };
}

/**
 * Comments the note on the left-out week on the PR `pr`, unless a comment with its marker is there; returns the line
 * to print.
 */
export async function commentNewerWeek(
  writer: CommentWriter,
  pr: number,
  newer: NewerWeek,
  staged: boolean,
  today?: string,
): Promise<string> {
  const marker = newerWeekMarker(newer.skipped);
  if ((await writer.bodies(pr)).some((body) => body.includes(marker))) {
    return `PR #${pr} already has the comment on ${formatWeeks([newer.skipped])}.`;
  }
  await writer.post(pr, `${newerWeekNote(newer, staged, today)}\n\n${marker}`);
  return `Commented on ${formatWeeks([newer.skipped])} in PR #${pr}.`;
}

/**
 * Comments the left-out week on the PR of PR_URL (`…/pull/<number>`) from the step outputs in `env`
 * (`newerWeekFromEnv`), staged or not in the checkout `cwd`; throws when one of them is missing. Returns the line to
 * print.
 */
export async function commentFromEnv(writer: CommentWriter, env: Env, cwd: string): Promise<string> {
  const pr = /\/pull\/([1-9]\d*)$/.exec(env.PR_URL ?? "")?.[1];
  if (!pr) throw new Error("newer-week needs PR_URL, the PR's URL (…/pull/<number>)");
  const newer = newerWeekFromEnv(env);
  if (!newer) throw new Error("newer-week needs WEEK_FROM, WEEK_TO, SKIPPED_FROM and SKIPPED_TO, YYYY-MM-DD dates");
  return commentNewerWeek(writer, Number(pr), newer, isStaged(cwd, newer.skipped));
}
