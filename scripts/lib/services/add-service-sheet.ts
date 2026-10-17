// Adds a service sheet to src/content/service-sheets.json, with its week (validFrom, validTo, rev) from the staged PDF,
// never from the record; a sheet of the same week (rerun, or a corrected PDF's rev) replaces the old one. Sheets may
// share only their boundary day (sheetOrderProblems()). The sheets before the current one (the last whose week has
// started, today in Prague) are removed, and so are the changes announced for later
// (src/content/schedule-exceptions.json) that a kept sheet covers or that are before the current sheet. The files'
// rules are serviceSheetsFileSchema's and scheduleExceptionsFileSchema's (src/lib/services/schema.ts).

import type { ServiceSheetsFile, ScheduleExceptionsFile, ServiceSheetRecord } from "@/content/types/services";
import type { IsoDate } from "@/content/types/shared";
import { serviceSheetsFileSchema, scheduleExceptionsFileSchema, serviceSheetSchema } from "@/lib/services/schema";
import { currentSheet, period, sheetCovering, sheetOrderProblems } from "@/lib/services/service-sheet";
import { pragueDate } from "@/lib/shared/prague";
import { parseOrThrow, readJsonFile } from "@/lib/shared/json-file";
import { actionVerb } from "../command";
import { newsIds, writeContentFile } from "../content-files";

/** The fields the script takes from the staged PDF, never from the record. */
const WEEK_FIELDS = ["validFrom", "validTo", "rev"] as const;
export type SheetWeek = Pick<ServiceSheetRecord, (typeof WEEK_FIELDS)[number]>;

/** The service sheets in `serviceSheetsFile`; throws naming the file when it is not valid JSON or breaks the schema. */
export const readServiceSheets = (serviceSheetsFile: string): ServiceSheetsFile =>
  readJsonFile(serviceSheetsFile, serviceSheetsFileSchema);

/** The changes announced for later in `exceptionsFile`; throws naming the file when it is broken. */
export const readScheduleExceptions = (exceptionsFile: string): ScheduleExceptionsFile =>
  readJsonFile(exceptionsFile, scheduleExceptionsFileSchema);

/**
 * `sheets` with `sheet` added (a sheet of the same week replaced, `replaced`), sorted (`all`), and those from the
 * current one on (`kept`; the current sheet is the last whose week has started, today in Prague). Throws when `sheet`
 * is before the current sheet or overlaps another kept sheet.
 */
export function placeSheet<T extends Pick<ServiceSheetRecord, "validFrom" | "validTo">>(
  sheets: T[],
  sheet: T,
  now = new Date(),
) {
  const replaced = sheets.some((s) => s.validFrom === sheet.validFrom);
  const all = [...sheets.filter((s) => s.validFrom !== sheet.validFrom), sheet].sort((a, b) =>
    a.validFrom < b.validFrom ? -1 : 1,
  );
  const current = currentSheet(all, pragueDate(now))!;
  const kept = all.filter((s) => s.validFrom >= current.validFrom);
  if (!kept.includes(sheet)) {
    throw new Error(`the sheet ${period(sheet)} is before the current sheet (${current.validFrom}): nothing to add`);
  }
  const problems = sheetOrderProblems(kept);
  if (problems.length > 0) throw new Error(problems.join("\n"));
  return { all, current, kept, replaced };
}

export type AddServiceSheetResult = {
  sheet: ServiceSheetRecord;
  /** A sheet of the same week was replaced. */
  replaced: boolean;
  /** The periods of the outdated sheets removed (or that would be). */
  removed: string[];
  /** The dates of the changes announced for later that a kept sheet covers, removed (or that would be). */
  coveredExceptions: IsoDate[];
  /** The dates of those before the current sheet (in a gap the sheets left), removed (or that would be). */
  pastExceptions: IsoDate[];
  /** The files written, for formatAndTest; empty with `check`. */
  written: string[];
};

/**
 * Adds `input` (the record: days and announcements) for the staged PDF's `week` to `serviceSheetsFile`, prunes the sheets
 * before the current one and the covered changes in `exceptionsFile`, and returns what it did; `check` only
 * validates. Throws with every problem found, before anything is written.
 */
export function addServiceSheet(
  {
    serviceSheetsFile,
    exceptionsFile,
    newsDir,
  }: { serviceSheetsFile: string; exceptionsFile: string; newsDir: string },
  input: unknown,
  week: SheetWeek,
  { check = false, now = new Date() } = {},
): AddServiceSheetResult {
  if (input === null || typeof input !== "object" || Array.isArray(input))
    throw new Error("the record is not an object");
  if (WEEK_FIELDS.some((field) => field in input)) {
    throw new Error(
      "leave validFrom, validTo and rev out of the record: the script reads validFrom, validTo and rev from the PDF",
    );
  }
  const sheet = parseOrThrow(serviceSheetSchema, { ...week, ...input }, "the record");
  const ids = newsIds(newsDir);
  const unknown = sheet.announcements.flatMap((a, i) =>
    a.newsId && !ids.has(a.newsId) ? [`announcement ${i + 1}: no event with the id ${a.newsId}`] : [],
  );
  if (unknown.length > 0) throw new Error(unknown.join("\n"));

  const { sheets } = readServiceSheets(serviceSheetsFile);
  const { exceptions } = readScheduleExceptions(exceptionsFile);
  const { all, current, kept, replaced } = placeSheet(sheets, sheet, now);
  const removed = all.filter((s) => !kept.includes(s)).map(period);
  const coveredExceptions = exceptions.filter((x) => sheetCovering(kept, x.date)).map((x) => x.date);
  const pastExceptions = exceptions
    .filter((x) => x.date < current.validFrom && !coveredExceptions.includes(x.date))
    .map((x) => x.date);
  const written: string[] = [];
  if (!check) {
    writeContentFile(serviceSheetsFile, { sheets: kept } satisfies ServiceSheetsFile);
    written.push(serviceSheetsFile);
    const gone = [...coveredExceptions, ...pastExceptions];
    if (gone.length > 0) {
      const later: ScheduleExceptionsFile = { exceptions: exceptions.filter((x) => !gone.includes(x.date)) };
      writeContentFile(exceptionsFile, later);
      written.push(exceptionsFile);
    }
  }
  return { sheet, replaced, removed, coveredExceptions, pastExceptions, written };
}

/** The lines the command prints for `result`. */
export function serviceSheetLines(result: AddServiceSheetResult, check: boolean): string[] {
  const { sheet, replaced, removed, coveredExceptions, pastExceptions } = result;
  const verb = actionVerb(check, replaced ? "replace" : "add");
  const remove = actionVerb(check, "remove");
  const exceptionLine = (date: IsoDate, why: string) =>
    `${remove} the later change on ${date} from src/content/schedule-exceptions.json (${why})`;
  return [
    `${verb} the sheet ${period(sheet)}${sheet.rev ? ` with rev ${sheet.rev}` : ""} ${replaced ? "in" : "to"} src/content/service-sheets.json`,
    ...removed.map((p) => `${remove} the outdated sheet ${p}`),
    ...coveredExceptions.map((date) => exceptionLine(date, "a sheet covers it")),
    ...pastExceptions.map((date) => exceptionLine(date, "it is past")),
  ];
}
