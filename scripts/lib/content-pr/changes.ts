// What an applied content patch changed, read from the checkout against HEAD: the weeks a sheet run added or changed,
// the events an events run added. Checked against the items the report gives, and named in the commit message, so
// neither rests on the agent's word alone.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import type { Kind } from "../content-release/plan";
import { git } from "../git";
import { REPORT_RULES, type MailReport } from "./report";
import type { Week } from "../services/sheet-week";
import { formatWeeks, parseWeekHeading } from "./weeks";

const SHEETS = "src/content/service-sheets.json";
const NEWS = "src/content/news";
const MONTH_FILE = /^src\/content\/news\/\d{4}\/\d{2}\.json$/;

type NewsRecord = { id: string; title: string };

export type ContentChanges =
  { kind: "sheet"; added: Week[]; changed: Week[] } | { kind: "events"; added: NewsRecord[] };

/** The text of `path` at HEAD, undefined when HEAD has no such file. */
const atHead = (cwd: string, path: string) =>
  git(cwd, "ls-tree", "--name-only", "HEAD", path).trim() ? git(cwd, "show", `HEAD:${path}`) : undefined;

/** The text of `path` in the working tree (what `git apply` wrote), undefined when there is no such file. */
function inCheckout(cwd: string, path: string): string | undefined {
  const file = join(cwd, path);
  return existsSync(file) ? readFileSync(file, "utf8") : undefined;
}

type SheetRecord = Week & Record<string, unknown>;

const sheetsOf = (text: string | undefined): SheetRecord[] =>
  text ? ((JSON.parse(text) as { sheets?: SheetRecord[] }).sheets ?? []) : [];

const eventsOf = (text: string | undefined): NewsRecord[] => (text ? (JSON.parse(text) as NewsRecord[]) : []);

/** The paths under `dir` that differ from HEAD in the working tree, new files included. */
function changedPaths(cwd: string, dir: string): string[] {
  const listed = [
    ...git(cwd, "diff", "--name-only", "HEAD", "--", dir).split("\n"),
    ...git(cwd, "ls-files", "--others", "--exclude-standard", "--", dir).split("\n"),
  ];
  return [...new Set(listed.filter(Boolean))];
}

/** What the content of `kind` in the checkout `cwd` adds or changes against HEAD. A removed record is not listed. */
export function contentChanges(cwd: string, kind: Kind): ContentChanges {
  if (kind === "sheet") {
    const before = new Map(sheetsOf(atHead(cwd, SHEETS)).map((sheet) => [sheet.validFrom, sheet]));
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
  const known = new Set<string>();
  const after: NewsRecord[] = [];
  for (const path of changedPaths(cwd, NEWS).filter((p) => MONTH_FILE.test(p))) {
    for (const event of eventsOf(atHead(cwd, path))) known.add(event.id);
    after.push(...eventsOf(inCheckout(cwd, path)));
  }
  return { kind, added: after.filter((event) => !known.has(event.id)).map(({ id, title }) => ({ id, title })) };
}

const sameWeek = (a: Week, b: Week | undefined) => a.validFrom === b?.validFrom && a.validTo === b.validTo;

/** A title as compared with a heading: without case, diacritics or extra spaces. */
const titleKey = (title: string) =>
  title
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** The heading's outcome, when it has exactly one (`checkReport` throws otherwise). */
const outcomeOfItem = (item: MailReport["items"][number]) => item.outcomes[0] ?? "";

/** Why the sheet report does not match the weeks the change adds or changes, if it does not. */
function sheetProblem(report: MailReport, { added, changed }: { added: Week[]; changed: Week[] }): string | undefined {
  const items = report.items.map((item) => ({ week: parseWeekHeading(item.name), outcome: outcomeOfItem(item) }));
  const reported = (week: Week) => items.find((item) => sameWeek(week, item.week));
  for (const week of added) {
    const item = reported(week);
    if (item?.outcome !== "created") {
      return `the change adds the week ${formatWeeks([week])}, which the report does not give as created`;
    }
  }
  for (const week of changed) {
    const item = reported(week);
    if (item?.outcome !== "created" && item?.outcome !== "corrected") {
      return `the change corrects the week ${formatWeeks([week])}, which the report does not give as created or corrected`;
    }
  }
  return undefined;
}

/** Why the events report does not match the events the change adds, if it does not. */
function eventsProblem(report: MailReport, { added }: { added: NewsRecord[] }): string | undefined {
  const created = report.items.filter((item) => outcomeOfItem(item) === "created").map((item) => titleKey(item.name));
  if (created.length !== added.length) {
    return `the report gives ${created.length} events as created, but the change adds ${added.length}`;
  }
  const missing = added.find((event) => !created.includes(titleKey(event.title)));
  return missing && `the change adds the event ${missing.id}, which no created section of the report is titled after`;
}

/**
 * Why the report's items do not match `changes`, if they do not: a sheet's week the change adds must be reported
 * `created`, one it changes `created` or `corrected` (a sheet report covers the whole PR, so it may give more weeks
 * than this change touches); an events report's `created` sections are the events the change adds, by title.
 */
export function changesProblem(report: MailReport, changes: ContentChanges): string | undefined {
  const problem = changes.kind === "sheet" ? sheetProblem(report, changes) : eventsProblem(report, changes);
  return problem && `The report does not match the change (${problem}): not applied.`;
}

/** The weeks of the report's created or corrected items, when every such heading names one. */
function reportedWeeks(report: MailReport) {
  const { changing } = REPORT_RULES.sheet;
  const weeks: (Week & { created: boolean })[] = [];
  for (const item of report.items) {
    const outcome = outcomeOfItem(item);
    if (!changing.some((re) => re.test(outcome))) continue;
    const week = parseWeekHeading(item.name);
    if (!week) return undefined;
    weeks.push({ ...week, created: outcome === "created" });
  }
  return weeks;
}

/**
 * The commit message of the PR, from the report's items and the change: a sheet PR names every week the report gives
 * as created or corrected (`feat` when one was created), an events PR the event it adds or their number. Undefined
 * when a heading does not name a week, or nothing is published.
 */
export function commitMessage(report: MailReport, changes: ContentChanges): string | undefined {
  if (changes.kind === "events") {
    const [first] = changes.added;
    if (!first) return undefined;
    return changes.added.length === 1
      ? `feat(content): add the ${first.title} event`
      : `feat(content): add ${changes.added.length} events`;
  }
  const weeks = reportedWeeks(report);
  if (!weeks?.length) return undefined;
  const created = weeks.some((week) => week.created);
  const sheets = weeks.length === 1 ? "service sheet" : "service sheets";
  return `${created ? "feat" : "fix"}(content): ${created ? "publish" : "correct"} the ${sheets} for ${formatWeeks(weeks)}`;
}
