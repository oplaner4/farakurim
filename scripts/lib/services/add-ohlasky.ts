// Adds a confirmed ohlášky sheet to src/content/ohlasky.json (farnost-create-porad-bohosluzeb skill, through
// `pnpm stage porad <pdf> --record <record.json>`, which stages the PDF and passes its week); a sheet of the same week
// (rerun, or a corrected PDF's rev) replaces the old one. Sheets may share only their boundary day (sheetOrderProblems()). The sheets
// before the current one (the last whose week has started, today in Prague) are removed, and so are the changes
// announced for later (src/content/schedule-exceptions.json) that a kept sheet covers or that are before the current
// sheet. The files' rules are ohlaskyFileSchema's and scheduleExceptionsFileSchema's (src/lib/services/schema.ts).

import * as z from "zod";
import type { OhlaskyFile, ScheduleExceptionsFile, ServiceSheetRecord } from "@/content/types/services";
import type { IsoDate } from "@/content/types/shared";
import { ohlaskyFileSchema, scheduleExceptionsFileSchema, serviceSheetSchema } from "@/lib/services/schema";
import { currentSheet, sheetCovering, sheetOrderProblems } from "@/lib/services/service-sheet";
import { pragueDate } from "@/lib/shared/prague";
import { readJsonFile } from "@/lib/shared/json-file";
import { newsIds, writeContentFile } from "../content-files";

/** The fields the script takes from the staged PDF, never from the record. */
const WEEK_FIELDS = ["validFrom", "validTo", "rev"] as const;
export type SheetWeek = Pick<ServiceSheetRecord, (typeof WEEK_FIELDS)[number]>;

const period = (s: Pick<ServiceSheetRecord, "validFrom" | "validTo">) => `${s.validFrom} – ${s.validTo}`;

/** The ohlášky in `ohlaskyFile`; throws naming the file when it is not valid JSON or breaks the schema. */
export const readOhlasky = (ohlaskyFile: string): OhlaskyFile => readJsonFile(ohlaskyFile, ohlaskyFileSchema);

/** The changes announced for later in `exceptionsFile`; throws naming the file when it is broken. */
export const readScheduleExceptions = (exceptionsFile: string): ScheduleExceptionsFile =>
  readJsonFile(exceptionsFile, scheduleExceptionsFileSchema);

export type AddOhlaskyResult = {
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
 * Adds `input` (the record: days and announcements) for the staged PDF's `week` to `ohlaskyFile`, prunes the sheets
 * before the current one and the covered changes in `exceptionsFile`, and returns what it did; `check` only
 * validates. Throws with every problem found, before anything is written.
 */
export function addOhlasky(
  { ohlaskyFile, exceptionsFile, newsDir }: { ohlaskyFile: string; exceptionsFile: string; newsDir: string },
  input: unknown,
  week: SheetWeek,
  { check = false, now = new Date() } = {},
): AddOhlaskyResult {
  if (input === null || typeof input !== "object" || Array.isArray(input))
    throw new Error("the record is not an object");
  if (WEEK_FIELDS.some((field) => field in input)) {
    throw new Error(
      "leave validFrom, validTo and rev out of the record: the script reads validFrom, validTo and rev from the PDF",
    );
  }
  const parsed = serviceSheetSchema.safeParse({ ...week, ...input });
  if (!parsed.success) throw new Error(`the record is not valid:\n${z.prettifyError(parsed.error)}`);
  const sheet = parsed.data;
  const ids = newsIds(newsDir);
  const unknown = sheet.announcements.flatMap((a, i) =>
    a.newsId && !ids.has(a.newsId) ? [`announcement ${i + 1}: no aktualita with the id ${a.newsId}`] : [],
  );
  if (unknown.length > 0) throw new Error(unknown.join("\n"));

  const { sheets } = readOhlasky(ohlaskyFile);
  const { exceptions } = readScheduleExceptions(exceptionsFile);
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

  const removed = all.filter((s) => !kept.includes(s)).map(period);
  const coveredExceptions = exceptions.filter((x) => sheetCovering(kept, x.date)).map((x) => x.date);
  const pastExceptions = exceptions
    .filter((x) => x.date < current.validFrom && !coveredExceptions.includes(x.date))
    .map((x) => x.date);
  const written: string[] = [];
  if (!check) {
    writeContentFile(ohlaskyFile, { sheets: kept } satisfies OhlaskyFile);
    written.push(ohlaskyFile);
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
export function ohlaskyLines(result: AddOhlaskyResult, check: boolean): string[] {
  const { sheet, replaced, removed, coveredExceptions, pastExceptions } = result;
  const verb = replaced ? (check ? "Would replace" : "Replaced") : check ? "Would add" : "Added";
  const remove = check ? "Would remove" : "Removed";
  const exceptionLine = (date: IsoDate, why: string) =>
    `${remove} the later change on ${date} from src/content/schedule-exceptions.json (${why})`;
  return [
    `${verb} the sheet ${period(sheet)}${sheet.rev ? ` with rev ${sheet.rev}` : ""} ${replaced ? "in" : "to"} src/content/ohlasky.json`,
    ...removed.map((p) => `${remove} the outdated sheet ${p}`),
    ...coveredExceptions.map((date) => exceptionLine(date, "a sheet covers it")),
    ...pastExceptions.map((date) => exceptionLine(date, "it is past")),
  ];
}
