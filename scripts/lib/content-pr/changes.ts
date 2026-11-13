// What a content PR changed, read from the working tree against a base commit: the weeks a sheet PR added or changed,
// the events an events PR added or changed. Checked against the exact dates and record ids the JSON report gives, and
// named in the commit messages, so neither rests on the agent's word alone.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import type { Kind } from "../content-release/plan";
import { git } from "../git";
import type { Report, SheetReport, EventsReport } from "./report-schema";
import type { Week } from "../services/sheet-week";
import { formatWeeks } from "./weeks";

const SHEETS = "src/content/service-sheets.json";
const NEWS = "src/content/news";
const MONTH_FILE = /^src\/content\/news\/\d{4}\/\d{2}\.json$/;

export type NewsRecord = { id: string; title: string };

export type ContentChanges =
  { kind: "sheet"; added: Week[]; changed: Week[] } | { kind: "events"; added: NewsRecord[]; changed: NewsRecord[] };

/** The merge base of HEAD and `ref`: where the PR's branch left it. */
export const mergeBase = (cwd: string, ref: string): string => git(cwd, "merge-base", "HEAD", ref).trim();

/** The text of `path` at `base`, undefined when `base` has no such file. */
const atBase = (cwd: string, base: string, path: string) =>
  git(cwd, "ls-tree", "--name-only", base, path).trim() ? git(cwd, "show", `${base}:${path}`) : undefined;

/** The text of `path` in the working tree, undefined when there is no such file. */
function inCheckout(cwd: string, path: string): string | undefined {
  const file = join(cwd, path);
  return existsSync(file) ? readFileSync(file, "utf8") : undefined;
}

type SheetRecord = Week & Record<string, unknown>;
type EventRecord = NewsRecord & Record<string, unknown>;

const sheetsOf = (text: string | undefined): SheetRecord[] =>
  text ? ((JSON.parse(text) as { sheets?: SheetRecord[] }).sheets ?? []) : [];

const eventsOf = (text: string | undefined): EventRecord[] => (text ? (JSON.parse(text) as EventRecord[]) : []);

/** The paths under `dir` that differ from `base` in the working tree, new files included. */
function changedPaths(cwd: string, base: string, dir: string): string[] {
  const listed = [
    ...git(cwd, "diff", "--no-renames", "--name-only", base, "--", dir).split("\n"),
    ...git(cwd, "ls-files", "--others", "--exclude-standard", "--", dir).split("\n"),
  ];
  return [...new Set(listed.filter(Boolean))];
}

/** What the content of `kind` in the working tree adds or changes against `base`. A removed record is not listed. */
export function contentChanges(cwd: string, kind: Kind, base: string): ContentChanges {
  if (kind === "sheet") {
    const before = new Map(sheetsOf(atBase(cwd, base, SHEETS)).map((sheet) => [sheet.validFrom, sheet]));
    const added: Week[] = [];
    const changed: Week[] = [];
    for (const sheet of sheetsOf(inCheckout(cwd, SHEETS))) {
      const old = before.get(sheet.validFrom);
      const week = { validFrom: sheet.validFrom, validTo: sheet.validTo };
      if (!old) added.push(week);
      else if (!isDeepStrictEqual(old, sheet)) changed.push(week);
    }
    return { kind, added, changed };
  }
  const before = new Map<string, EventRecord>();
  const after: EventRecord[] = [];
  for (const path of changedPaths(cwd, base, NEWS).filter((p) => MONTH_FILE.test(p))) {
    for (const event of eventsOf(atBase(cwd, base, path))) before.set(event.id, event);
    after.push(...eventsOf(inCheckout(cwd, path)));
  }
  const added: NewsRecord[] = [];
  const changed: NewsRecord[] = [];
  for (const event of after) {
    const old = before.get(event.id);
    const record = { id: event.id, title: event.title };
    if (!old) added.push(record);
    else if (!isDeepStrictEqual(old, event)) changed.push(record);
  }
  return { kind, added, changed };
}

/** The sheet report's weeks that publish something. */
const publishedWeeks = (report: SheetReport) =>
  report.weeks.filter((week) => week.outcome.kind === "created" || week.outcome.kind === "corrected");

const sameWeek = (a: Week, b: Week) => a.validFrom === b.validFrom && a.validTo === b.validTo;

/** Why the sheet report does not match the weeks the change holds, if it does not. */
function sheetProblem(report: SheetReport, changes: ContentChanges): string | undefined {
  if (changes.kind !== "sheet") return undefined;
  const held = [...changes.added, ...changes.changed];
  for (const week of held) {
    const entry = report.weeks.find((candidate) => sameWeek(candidate, week));
    const label = `the change holds the week ${formatWeeks([week])}`;
    if (!entry) return `${label}, which the report does not give`;
    if (entry.outcome.kind !== "created" && entry.outcome.kind !== "corrected") {
      return `${label}, which the report gives as ${entry.outcome.kind}`;
    }
  }
  for (const entry of publishedWeeks(report)) {
    if (!held.some((week) => sameWeek(week, entry))) {
      return `the report gives the week ${formatWeeks([entry])} as ${entry.outcome.kind}, but the change does not hold it`;
    }
  }
  return undefined;
}

/** Why the events report does not match the events the change adds, if it does not. */
function eventsProblem(report: EventsReport, changes: ContentChanges): string | undefined {
  if (changes.kind !== "events") return undefined;
  const created = report.events.flatMap((event) =>
    event.outcome.kind === "created" ? [{ id: event.outcome.id, title: event.title }] : [],
  );
  for (const event of created) {
    const record = changes.added.find((candidate) => candidate.id === event.id);
    if (!record) return `the report gives the event ${event.id} as created, but the change does not add it`;
    if (record.title !== event.title) {
      return `the event ${event.id} is titled ${event.title} in the report, but ${record.title} in the change`;
    }
  }
  const missing = changes.added.find((record) => !created.some((event) => event.id === record.id));
  return missing && `the change adds the event ${missing.id}, which the report does not give as created`;
}

/**
 * Why the report does not match `changes` (the whole PR against the merge base), if it does not: every week the PR
 * adds or changes is a `created` or `corrected` entry with the same dates, and the reverse; the events the PR adds are
 * the `created` ones by id, each titled as its record.
 */
export function changesProblem(report: Report, changes: ContentChanges): string | undefined {
  const problem = report.kind === "sheet" ? sheetProblem(report, changes) : eventsProblem(report, changes);
  return problem && `The report does not match the change (${problem}): not applied.`;
}

const eventsSubject = (events: NewsRecord[]) =>
  events.length === 1 ? `the ${events[0]!.title} event` : `${events.length} events`;

const sheetsNoun = (weeks: Week[]) => (weeks.length === 1 ? "service sheet" : "service sheets");

/**
 * The commit message of the PR: a sheet PR names every week the report publishes (`feat` when the PR adds one), an
 * events PR the event it adds or their number. Undefined when nothing is published.
 */
export function commitMessage(report: Report, changes: ContentChanges): string | undefined {
  if (changes.kind === "events") {
    return changes.added.length ? `feat(content): add ${eventsSubject(changes.added)}` : undefined;
  }
  if (report.kind !== "sheet") return undefined;
  const weeks = publishedWeeks(report);
  if (!weeks.length) return undefined;
  const added = changes.added.length > 0;
  return `${added ? "feat" : "fix"}(content): ${added ? "publish" : "correct"} the ${sheetsNoun(weeks)} for ${formatWeeks(weeks)}`;
}

/** The commit message of a fix, from the changes of the fix alone (against HEAD). Undefined without changes. */
export function fixCommitMessage(changes: ContentChanges): string | undefined {
  if (changes.kind === "events") {
    const events = [...changes.added, ...changes.changed];
    return events.length ? `fix(content): correct ${eventsSubject(events)}` : undefined;
  }
  const weeks = [...changes.added, ...changes.changed];
  return weeks.length ? `fix(content): correct the ${sheetsNoun(weeks)} for ${formatWeeks(weeks)}` : undefined;
}
