// Reads the files of a content PR's run: the JSON report (a stored one, or the agent's of a mail run, completed with
// what the run changed and, for a sheet, merged into the PR's previous report), a comment fix's result, and the report
// a job summary shows whatever state it is in.

import { readFileSync } from "node:fs";
import { readJsonRecord } from "../command";
import type { Kind } from "../content-release/plan";
import { completeAgentReport } from "./agent-report";
import { parseAgentReport } from "./agent-report-schema";
import { contentChanges } from "./changes";
import { readKnownEvents } from "../news/known-events";
import { checkRefusals } from "./refusals";
import {
  parseFixResult,
  parseReport,
  parseSheetReport,
  type FixResult,
  type Report,
  type SheetReport,
} from "./report-schema";

/** The message of a PR whose report or previous report cannot be read: it cannot be continued. */
export const RESEND = "The PR's report is missing or unreadable: close the PR and send the sheet or event again.";

/**
 * Where the report comes from: a stored report, or (`run`) the agent's of a mail run, a sheet's merged into
 * `previous`, an events one's refusals checked against the known events in `known`; `fix` a comment fix's result, with
 * `original` the PR's report the fix corrected.
 */
export type ReportInput = {
  kind: Kind;
  report: string;
  run: boolean;
  previous?: string;
  known?: string;
  fix?: string;
  original?: string;
};

/** The PR's previous sheet report; one that is missing or that the schema refuses cannot be continued. */
function readPrevious(file: string): SheetReport {
  try {
    return parseSheetReport(JSON.parse(readFileSync(file, "utf8")));
  } catch {
    throw new Error(RESEND);
  }
}

/**
 * Reads the report the input gives and returns what makes the full report of it in the checkout `cwd`: a stored one
 * as written; the agent's (`run`) completed with what the run changed there (the working tree against HEAD), a
 * sheet's merged into the previous report, an events one's refusals checked against `known` and the site there. The files are checked at once, so one the schema refuses fails before
 * anything is applied.
 */
export function readReport({ kind, report, run, previous, known }: ReportInput): (cwd: string) => Report {
  const value = readJsonRecord(report);
  if (!run) {
    const stored = parseReport(kind, value);
    return () => stored;
  }
  const agent = parseAgentReport(kind, value);
  const before = previous === undefined ? undefined : readPrevious(previous);
  const knownEvents = known === undefined ? undefined : readKnownEvents(known);
  return (cwd) => {
    const full = completeAgentReport(agent, kind === "sheet" ? contentChanges(cwd, kind, "HEAD") : undefined, before);
    if (full.kind === "events" && knownEvents) checkRefusals(full, knownEvents, cwd);
    return full;
  };
}

/** The fix result in `file`, none without one. */
export const readFix = (file: string | undefined): FixResult | undefined =>
  file === undefined ? undefined : parseFixResult(readJsonRecord(file));

/**
 * The report for the job summary: a stored one, else the agent's completed on its own (without the change, so a sheet
 * run's published week makes none: the summary lists only what was not published), else none. Never throws.
 */
export function summaryReport(kind: Kind, file: string): Report | undefined {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return undefined;
  }
  try {
    return parseReport(kind, value);
  } catch {
    // Not a stored report: the agent's, when the run stopped before `apply` wrote one.
  }
  try {
    return completeAgentReport(parseAgentReport(kind, value));
  } catch {
    return undefined;
  }
}
