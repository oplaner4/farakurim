// Reads the files of a content PR's run: the agent's JSON report (a full one, or a sheet mail run's merged into the
// PR's previous report), a comment fix's result, and the report a job summary shows whatever state it is in.

import { readFileSync } from "node:fs";
import { readJsonRecord } from "../command";
import type { Kind } from "../content-release/plan";
import { mergeSheetReport } from "./merge";
import {
  parseFixResult,
  parseReport,
  parseSheetReport,
  parseSheetRunReport,
  type FixResult,
  type Report,
  type SheetReport,
} from "./report-schema";

/** The message of a PR whose report or previous report cannot be read: it cannot be continued. */
export const RESEND =
  "The PR's report is missing or from another version: close the PR and send the sheet or event again.";

/** Where the report comes from: a full report, or (`run`) a sheet mail run's merged into `previous`; `fix` a fix result. */
export type ReportInput = { kind: Kind; report: string; run: boolean; previous?: string; fix?: string };

/** The PR's previous sheet report; one that is missing, unreadable or of another version cannot be continued. */
function readPrevious(file: string): SheetReport {
  try {
    return parseSheetReport(JSON.parse(readFileSync(file, "utf8")));
  } catch {
    throw new Error(RESEND);
  }
}

/** The full report the input gives: a sheet run's merged into the previous report, or the report as written. */
export function readReport({ kind, report, run, previous }: ReportInput): Report {
  const value = readJsonRecord(report);
  if (!run) return parseReport(kind, value);
  const before = previous === undefined ? undefined : readPrevious(previous);
  return mergeSheetReport(before, parseSheetRunReport(value));
}

/** The fix result in `file`, none without one. */
export const readFix = (file: string | undefined): FixResult | undefined =>
  file === undefined ? undefined : parseFixResult(readJsonRecord(file));

/** The report for the job summary: a full one, else a sheet run's on its own, else none. Never throws. */
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
    if (kind !== "sheet") return undefined;
  }
  try {
    return mergeSheetReport(undefined, parseSheetRunReport(value));
  } catch {
    return undefined;
  }
}
