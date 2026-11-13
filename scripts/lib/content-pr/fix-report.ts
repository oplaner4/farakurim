// Compares a comment fix's corrected report with the PR's report the fix started from. The fix may resolve an open
// question with an answer, append venues to and change the title and origin of an event whose record it changed, and
// change the summary of a week it changed; every other difference is an issue, `<dotted path>: <message>`.

import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { contentChanges, type ContentChanges } from "./changes";
import { RESEND } from "./report-files";
import {
  parseReport,
  ReportError,
  type EventsReport,
  type Question,
  type Report,
  type SheetReport,
} from "./report-schema";

type Issues = string[];

/** Flags each of `fields` that differs between `before` and `after`, at `path`. */
function sameFields<T extends object>(path: string, before: T, after: T, fields: (keyof T)[], issues: Issues): void {
  for (const field of fields) {
    const at = path ? `${path}.${String(field)}` : String(field);
    if (!isDeepStrictEqual(before[field], after[field])) issues.push(`${at}: may not change`);
  }
}

/** The questions at `path`: the same ids in the same order, each only resolved with an answer when it was open. */
function compareQuestions(path: string, before: Question[], after: Question[], issues: Issues): void {
  const ids = (questions: Question[]) => questions.map((question) => question.id);
  if (!isDeepStrictEqual(ids(before), ids(after))) {
    issues.push(`${path}: a fix may not add, drop or reorder questions`);
    return;
  }
  before.forEach((old, index) => {
    const question = after[index]!;
    const at = `${path}.${index}`;
    sameFields(at, old, question, ["blocking", "where", "text", "proposal"], issues);
    if (old.status === "open" && question.status === "resolved") {
      if (!question.answer?.trim()) issues.push(`${at}.answer: a question the fix resolves needs its answer`);
    } else {
      sameFields(at, old, question, ["status", "answer"], issues);
    }
  });
}

/** A field the fix may change only on an item whose record it changed. */
function changedOnlyWithRecord(path: string, changed: boolean, what: string, issues: Issues): void {
  if (changed) issues.push(`${path}: changes, but the fix did not change ${what}`);
}

function compareEvents(before: EventsReport, after: EventsReport, changes: ContentChanges, issues: Issues): void {
  sameFields("", before, after, ["droppedAttachments"], issues);
  if (before.events.length !== after.events.length) {
    issues.push("events: a fix may not add or drop an event");
    return;
  }
  const touched = new Set(changes.kind === "events" ? changes.changed.map((record) => record.id) : []);
  before.events.forEach((old, index) => {
    const event = after.events[index]!;
    const at = `events.${index}`;
    sameFields(at, old, event, ["outcome"], issues);
    const id = old.outcome.kind === "created" ? old.outcome.id : undefined;
    const what = id === undefined ? "a record of this refused event" : `the event ${id}`;
    const withRecord = id !== undefined && touched.has(id);
    if (!withRecord) {
      changedOnlyWithRecord(`${at}.title`, old.title !== event.title, what, issues);
      changedOnlyWithRecord(`${at}.origin`, old.origin !== event.origin, what, issues);
    }
    if (!isDeepStrictEqual(event.venues.slice(0, old.venues.length), old.venues)) {
      issues.push(`${at}.venues: a fix may only append venues`);
    } else if (!withRecord) {
      changedOnlyWithRecord(`${at}.venues`, event.venues.length > old.venues.length, what, issues);
    }
    compareQuestions(`${at}.questions`, old.questions, event.questions, issues);
  });
}

function compareWeeks(before: SheetReport, after: SheetReport, changes: ContentChanges, issues: Issues): void {
  if (before.weeks.length !== after.weeks.length) {
    issues.push("weeks: a fix may not add or drop a week");
    return;
  }
  const touched = changes.kind === "sheet" ? changes.changed : [];
  before.weeks.forEach((old, index) => {
    const week = after.weeks[index]!;
    const at = `weeks.${index}`;
    sameFields(at, old, week, ["validFrom", "validTo", "outcome", "notOnTheNewest", "senderNote"], issues);
    const withRecord = touched.some((t) => t.validFrom === old.validFrom && t.validTo === old.validTo);
    if (!withRecord) {
      const what = `the week from ${old.validFrom}`;
      changedOnlyWithRecord(`${at}.summary`, old.summary !== week.summary, what, issues);
    }
    compareQuestions(`${at}.questions`, old.questions, week.questions, issues);
  });
}

/**
 * The differences between the PR's report `before` and the fix's corrected report `after` that the fix may not make,
 * given `changes`, what the fix changed in the content (against the PR's head).
 */
export function fixReportIssues(before: Report, after: Report, changes: ContentChanges): string[] {
  const issues: Issues = [];
  compareQuestions("questions", before.questions, after.questions, issues);
  if (before.kind === "events" && after.kind === "events") compareEvents(before, after, changes, issues);
  if (before.kind === "sheet" && after.kind === "sheet") compareWeeks(before, after, changes, issues);
  return issues;
}

/** The PR's report the fix started from; one that cannot be read cannot be continued. */
function readOriginal(report: Report, file: string): Report {
  try {
    return parseReport(report.kind, JSON.parse(readFileSync(file, "utf8")));
  } catch {
    throw new Error(RESEND);
  }
}

/**
 * Checks the fix's corrected `report` against the PR's report in `original`, with what the working tree in `cwd`
 * changed in the content against HEAD (the PR's head); throws a ReportError listing each difference it may not make.
 */
export function checkFixReport(cwd: string, report: Report, original: string): void {
  const issues = fixReportIssues(readOriginal(report, original), report, contentChanges(cwd, report.kind, "HEAD"));
  if (issues.length) throw new ReportError(issues);
}
