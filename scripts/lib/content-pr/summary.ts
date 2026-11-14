// The job summary of a mail workflow (service sheet, events): what the mail was, what became of it, and whether the
// maintainer must act without a PR to look at, which fails the job so GitHub tells them. It holds dates, kinds, weeks,
// event titles and the scripts' messages only, never a mail's text.

import type { Env } from "../command";
import type { Kind } from "../content-release/plan";
import { newerWeekFromEnv, newerWeekNote, type NewerWeek } from "./newer-week";
import { outcomeLines, type EventTitle } from "./report";
import type { Report } from "./report-schema";

/** A step's or job's result as GitHub gives it; empty for one that did not run. */
type Result = "success" | "failure" | "cancelled" | "skipped" | "";

/** What the workflow's steps found and did, from their outputs. */
export type RunState = {
  /** Whether the fetch step ran to its end. */
  fetched: boolean;
  /** The fetch step's summary lines, one per message. */
  mail: string[];
  /** Whether there was a sheet or an event mail to handle. */
  handled: boolean;
  /** The result of the job that ran the agent, and of the agent's step in it. */
  job: Result;
  agent: Result;
  /** The publish job's steps: the artifact download, the apply step and the PR. */
  download: Result;
  apply: Result;
  changed?: boolean;
  pr: Result;
  prAction?: string;
  prUrl?: string;
  /** Sheet only: the messages without a single DOCX, with a subject naming no week, and the superseded ones naming another. */
  noDocx?: number;
  noWeek?: number;
  unhandled?: number;
  /** Sheet only: the week the subject named, and the DOCX's newest week it left out. */
  newerWeek?: NewerWeek;
  /** Sheet only: whether the checkout's service sheets hold that newest week. */
  newerWeekStaged?: boolean;
  /** Events only: the accepted senders' mail with nothing to read, and the known senders that failed DKIM. */
  incomplete?: number;
  knownDkim?: string;
};

const WORDS = {
  sheet: { title: "Service sheet", source: "sheet", job: "sheet job" },
  events: { title: "Events", source: "mail", job: "event job" },
} as const satisfies Record<Kind, unknown>;

/** The line saying what became of the sheet or mail, and whether it was refused (events: nothing new). */
function outcomeLine(kind: Kind, state: RunState): { line: string; refused: boolean } {
  const { source, job } = WORDS[kind];
  const retried = `the ${source} stays unread for the next run`;
  if (state.agent !== "success") {
    return { line: `The agent's run failed: the ${source} stays unread and the next run retries it.`, refused: false };
  }
  if (state.job !== "success" || state.download !== "success") {
    return { line: `The ${job} failed after the agent's run (see the log): ${retried}.`, refused: false };
  }
  if (state.apply !== "success") {
    return { line: `The change or the report was not accepted (see the log): ${retried}.`, refused: false };
  }
  if (state.changed === false) {
    return kind === "sheet"
      ? { line: "Nothing changed: no PR.", refused: false }
      : { line: "Nothing new in the mail (every event refused, or no event in it): refused, no PR.", refused: true };
  }
  if (state.pr === "success") return { line: `PR ${state.prAction ?? "opened"}: ${state.prUrl ?? ""}`, refused: false };
  return { line: `The commit or PR failed (see the log): ${retried}.`, refused: false };
}

/** The sheet's notes after the outcome, and whether any needs the maintainer. */
function sheetNotes(
  state: RunState,
  report: Report | undefined,
  today?: string,
): { lines: string[]; attention: boolean } {
  const lines: string[] = [];
  const failed = outcomeLines(report, { failed: true });
  if (failed.length) lines.push("", "Weeks not published:", ...failed.map((line) => `- ${line}`));
  if (state.noDocx) {
    lines.push("", `${state.noDocx} message(s) from the parish had no DOCX or several: ask the parish for the sheet.`);
  }
  if (state.noWeek) {
    lines.push(
      "",
      "The sheet's subject names a date no week of its DOCX holds: nothing was handled. Ask the parish to send it " +
        "again with the week's dates in the subject, or with none for the newest week.",
    );
  }
  // A subject naming an older week leaves the newest one out: a PR gets a comment on it (`content-pr newer-week`), and
  // a run that changed nothing fails here while that week is not staged, so it is never missed in silence.
  const { newerWeek } = state;
  const quiet = newerWeek !== undefined && state.changed === false && !state.newerWeekStaged;
  if (quiet) {
    lines.push(
      "",
      `${newerWeekNote(newerWeek, false, today)} Nothing changed in the named week: ask the parish to send the sheet ` +
        "again without dates in the subject (or with the newest week's).",
    );
  }
  if (state.unhandled) {
    lines.push(
      "",
      `${state.unhandled} older sheet message(s) named another week than the one handled: ask the parish to send ` +
        "them again.",
    );
  }
  return { lines, attention: failed.length > 0 || Boolean(state.noDocx || state.noWeek || state.unhandled) || quiet };
}

/** The events' notes after the outcome, and whether any needs the maintainer. */
function eventNotes(state: RunState): { lines: string[]; attention: boolean } {
  const lines: string[] = [];
  if (state.incomplete) {
    lines.push(
      "",
      `${state.incomplete} mail(s) from an accepted sender had neither an attachment nor a subject and a text.`,
    );
  }
  if (state.knownDkim) {
    lines.push("", `Mail from ${state.knownDkim} failed the DKIM check (forwarded, or another provider): refused.`);
  }
  return { lines, attention: Boolean(state.incomplete || state.knownDkim) };
}

const ERRORS = {
  sheet: "A week was refused or left out, a document error occurred or a parish message had no single DOCX.",
  events: "A mail added nothing, had nothing to read, or failed the DKIM check of a known sender.",
} as const satisfies Record<Kind, string>;

/**
 * The summary of a run of `kind` from its `state` and the agent's `report` (undefined without one): its markdown lines, and
 * the error that fails the job when the maintainer must act without a PR. `today` (Prague) dates the newer week's note;
 * `eventTitle` names a created event by its record.
 */
export function summarize(
  kind: Kind,
  state: RunState,
  report: Report | undefined,
  { today, eventTitle }: { today?: string; eventTitle?: EventTitle } = {},
): { lines: string[]; error?: string } {
  const lines = [`## ${WORDS[kind].title}`, ""];
  if (!state.fetched) lines.push("The mail could not be read.");
  else if (state.mail.length === 0) lines.push("No new mail.");
  else lines.push(...state.mail.map((line) => `- ${line}`));
  lines.push("");
  let refused = false;
  if (state.handled) {
    const outcome = outcomeLine(kind, state);
    refused = outcome.refused;
    lines.push(outcome.line);
    if (kind === "events") {
      // The PR shows the events it adds: with one, only the refused ones are left to list.
      const outcomes = outcomeLines(report, { failed: state.pr === "success", eventTitle });
      if (outcomes.length) lines.push("", ...outcomes.map((line) => `- ${line}`));
    }
  }
  const notes = kind === "sheet" ? sheetNotes(state, report, today) : eventNotes(state);
  lines.push(...notes.lines);
  return { lines, ...((refused || notes.attention) && { error: ERRORS[kind] }) };
}

const result = (value: string | undefined): Result =>
  value === "success" || value === "failure" || value === "cancelled" || value === "skipped" ? value : "";

const count = (value: string | undefined) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

/** The mail's summary lines from the fetch step's JSON array; none for a missing or broken one. */
function mailLines(value: string | undefined): string[] {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** The run's state from the environment the workflow's Summary step sets (one variable per step output). */
export function runStateFromEnv(env: Env): RunState {
  const newerWeek = newerWeekFromEnv(env);
  return {
    fetched: env.FETCHED === "true",
    mail: mailLines(env.SUMMARY),
    handled: Boolean(env.HANDLED),
    job: result(env.JOB_RESULT),
    agent: result(env.AGENT),
    download: result(env.DOWNLOAD),
    apply: result(env.APPLY),
    ...(env.CHANGED === "true" || env.CHANGED === "false" ? { changed: env.CHANGED === "true" } : {}),
    pr: result(env.PR_OUTCOME),
    ...(env.PR_ACTION && { prAction: env.PR_ACTION }),
    ...(env.PR_URL && { prUrl: env.PR_URL }),
    noDocx: count(env.NO_DOCX),
    noWeek: count(env.NO_WEEK),
    unhandled: count(env.UNHANDLED),
    ...(newerWeek && { newerWeek }),
    incomplete: count(env.INCOMPLETE),
    ...(env.KNOWN_DKIM && { knownDkim: env.KNOWN_DKIM }),
  };
}
