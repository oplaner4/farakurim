// Stages a service sheet PDF as porady_bohosluzeb/<validFrom>-porad-bohosluzeb[-r<rev>].pdf, with the
// week read from its heading ("od 4. 10. 2026 do 11. 10. 2026"), and adds the sheet to src/content/service-sheets.json
// (addServiceSheet()); without a record it only checks and prints the week. The week is checked against the sheets
// first, with or without a record: one before the current sheet or overlapping another is refused, and one already
// there is named. The sheet stores the rev, so a rerun keeps it and a corrected PDF gets the next one. The source can
// also be the parish's DOCX of the whole year: then the week is its newest one (or the one --from names, and the DOCX's
// newer week is named, also in a refusal), its PDF that week's page of the converted document, and its draft record is
// read from the week's table and announcements.
// Without a record it also lists the events an announcement can link, so the newsIds need no search of the news.
// draftSheet() is that check on a DOCX that also writes the week's draft record; replaceSheetRecord() replaces the
// record of a sheet already there without a source, which keeps its PDF and rev.

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { addDays } from "date-fns";
import { readEvents } from "@/content/news";
import type { IsoDate } from "@/content/types/shared";
import { WEEKDAY_SHORT } from "@/lib/shared/czech";
import { inPrague, pragueDate, pragueDateTime, pragueWeekday } from "@/lib/shared/prague";
import { period, periodDates, periodLength, sheetPdfFile } from "@/lib/services/service-sheet";
import {
  addServiceSheet,
  placeSheet,
  serviceSheetLines,
  readServiceSheets,
  type SheetWeek,
} from "../services/add-service-sheet";
import { writeContentFile } from "../content-files";
import { docxToPdf } from "../services/docx-to-pdf";
import { docxWeeks, type DocxWeek } from "../services/sheet-docx";
import { newestWeek, parseWeek, weekPages } from "../services/sheet-week";
import { eventLine, notEndedBy } from "../news/upcoming-events";
import { correctedHint, correctedRev, MAX_MB, sourceFile, stage, stagedLine, type StageEnv } from "./core";
import { extractPdfPages, pdfFirstPageText, pdfPageTexts } from "../images";

/** Every date from `validFrom` to `validTo` with its Czech weekday: "so 2026-10-03". */
export const weekDays = (validFrom: IsoDate, validTo: IsoDate) =>
  periodDates(validFrom, validTo).map((date) => `${WEEKDAY_SHORT[pragueWeekday(date)].toLowerCase()} ${date}`);

export type SheetOptions = {
  /** The PDF or DOCX. */
  source: string;
  validFrom?: string;
  validTo?: string;
  /** A corrected PDF of a week already in service-sheets.json. */
  corrected?: boolean;
  /** The confirmed sheet record (days and announcements), added to src/content/service-sheets.json. */
  record?: Record<string, unknown>;
  check?: boolean;
};

export type DraftOptions = Omit<SheetOptions, "record" | "check"> & {
  /** Where to write the DOCX week's draft record. */
  out: string;
};

export type ReplaceOptions = {
  validFrom: string;
  validTo: string;
  /** The sheet's corrected record (days and announcements). */
  record: Record<string, unknown>;
  check?: boolean;
};

/** A run of stageSheet() or draftSheet(): with `draft`, it writes the draft record there and stages nothing. */
type RunOptions = SheetOptions & { draft?: string };

type Week = { validFrom: string; validTo: string };

/** Throws for a period that is not one week, or two around holidays: a misread heading. */
function checkLength(week: Week) {
  // Sunday to Sunday is 14 days for two weeks.
  const days = periodLength(week);
  if (days <= 0 || days > 21) throw new Error(`the period ${period(week)} looks wrong: pass --from and --to`);
  return week;
}

/** The week of the PDF `src`: --from and --to when given, else its heading. */
function pdfWeek(src: string, options: RunOptions): Week {
  // --from and --to are checked by the command line (scripts/lib/stage/command.ts): real dates, both or neither.
  const week =
    options.validFrom && options.validTo
      ? { validFrom: options.validFrom, validTo: options.validTo }
      : parseWeek(pdfFirstPageText(src));
  if (!week) throw new Error("no 'od … do …' week in the PDF heading: pass --from and --to");
  return checkLength(week);
}

/**
 * The week of the DOCX `src`: the one --from and --to name, else the newest; with `newer`, the DOCX's newest week when
 * the named one is not it.
 */
async function docxWeek(src: string, options: RunOptions): Promise<{ week: DocxWeek; newer?: Week }> {
  const weeks = await docxWeeks(src);
  if (weeks.length === 0) throw new Error("no 'ROZPIS BOHOSLUŽEB … od … do …' heading in the DOCX");
  const newest = newestWeek(weeks)!;
  if (!options.validFrom) return { week: newest };
  const week = weeks.find((w) => w.validFrom === options.validFrom && w.validTo === options.validTo);
  if (!week) {
    const listed = weeks.slice(0, 5).map(period).join(", ");
    throw new Error(`no week ${options.validFrom} – ${options.validTo} in the DOCX; it has ${listed}, …`);
  }
  checkLength(week);
  return { week, ...(period(newest) !== period(week) && { newer: newest }) };
}

/**
 * The note on the DOCX's `newer` week, which a run on its older `week` does not stage: whether service-sheets.json
 * already has it, and, when `week` ended before `today` (Prague) and the newer week is not there, that it is likely
 * the one meant.
 */
function newerWeekNote(env: StageEnv, week: Week, newer: Week, today = pragueDate(new Date())): string {
  const there = readServiceSheets(env.serviceSheetsFile).sheets.some((sheet) => sheet.validFrom === newer.validFrom);
  const where = there ? "it is already staged, and this DOCX's version of it is not checked" : "it is not staged yet";
  const meant =
    !there && week.validTo < today
      ? `. This week ended on ${week.validTo}: the newer week is likely the one meant`
      : "";
  return `Not the DOCX's newest week: its newest, ${period(newer)}, is left out of this run; ${where}${meant} (tell the user)`;
}

/**
 * The week's pages of the DOCX `src` as a PDF in `dir`: the document converted, then cut from the page with the
 * week's heading to the page before the next heading.
 */
function docxWeekPdf(src: string, week: Week, dir: string) {
  const converted = docxToPdf(src, join(dir, "converted"));
  const pdf = join(dir, "week.pdf");
  extractPdfPages(converted, weekPages(pdfPageTexts(converted), week), pdf);
  return pdf;
}

/** The rev of the week's PDF: the sheet's, or with `corrected` the next one once the sheet's PDF is on the server. */
async function sheetRev(env: StageEnv, validFrom: string, corrected: boolean): Promise<number | undefined> {
  const current = readServiceSheets(env.serviceSheetsFile).sheets.find((sheet) => sheet.validFrom === validFrom);
  if (!corrected) return current?.rev;
  if (!current)
    throw new Error(`no sheet of ${validFrom} in service-sheets.json: --corrected is for a week already there`);
  return correctedRev(env, current.rev, (r) => sheetPdfFile({ validFrom, rev: r }));
}

/** The lines printing the week and its days, for a check without a record. */
const weekLines = ({ validFrom, validTo, rev }: { validFrom: string; validTo: string; rev?: number }) => [
  `  validFrom: "${validFrom}",\n  validTo: "${validTo}",${rev ? `\n  rev: ${rev},` : ""}`,
  `days: ${weekDays(validFrom, validTo).join(", ")}`,
];

/** How long before the week an event may have ended and still be announced (a thanks for it). */
const NEWS_DAYS_BEFORE = 14;

/** The lines listing the events an announcement of the week can link (`newsId`): those not ended 14 days before it. */
function newsLines(newsDir: string, validFrom: IsoDate): string[] {
  const from = pragueDate(addDays(pragueDateTime(validFrom, "12:00"), -NEWS_DAYS_BEFORE, { in: inPrague }));
  const events = notEndedBy(readEvents(newsDir), from).toSorted((a, b) => a.start.localeCompare(b.start));
  return [
    `Events for newsId (not ended by ${from}):`,
    ...(events.length ? events.map((e) => `  ${eventLine(e)}`) : ["  none"]),
  ];
}

/**
 * The PDF to stage and its week: the PDF `src` itself, or the week's page of the DOCX `src` converted in `dir` (and,
 * with `draft`, the week's draft record written there). Returns the lines to print too.
 */
async function sourceWeek(
  env: StageEnv,
  src: string,
  options: RunOptions,
  dir: string,
  notes: string[],
): Promise<{ pdf: string; week: Week; lines: string[] }> {
  if (!isDocx(src)) {
    if (extname(src).toLowerCase() !== ".pdf") throw new Error("the service sheet is a PDF or a DOCX");
    return { pdf: src, week: pdfWeek(src, options), lines: [] };
  }
  const { week: docxSheet, newer } = await docxWeek(src, options);
  const week = { validFrom: docxSheet.validFrom, validTo: docxSheet.validTo };
  // Kept in `notes` before anything can throw, so a refusal names the newer week too.
  if (newer) notes.push(newerWeekNote(env, week, newer));
  const lines = [...notes];
  // Written before the conversion, so the draft is there to check even without a converter.
  if (options.draft !== undefined) {
    const draft = docxSheet.draft();
    writeContentFile(options.draft, draft);
    lines.push(`Wrote the draft record of ${period(week)} to ${options.draft}`);
    const empty = draft.days.filter((day) => day.rows.length === 0).map((day) => day.date);
    if (empty.length > 0) lines.push(`Days without services (tell the user): ${empty.join(", ")}`);
  }
  return { pdf: docxWeekPdf(src, week, dir), week, lines };
}

const isDocx = (src: string) => extname(src).toLowerCase() === ".docx";

/**
 * Replaces the record of the sheet of `validFrom` to `validTo`, keeping its PDF and rev: a correction of the record
 * alone, which stages nothing. Returns the lines to print and the files written.
 */
export function replaceSheetRecord(env: StageEnv, { validFrom, validTo, record, check = false }: ReplaceOptions) {
  const current = readServiceSheets(env.serviceSheetsFile).sheets.find(
    (sheet) => sheet.validFrom === validFrom && sheet.validTo === validTo,
  );
  if (!current) throw new Error(`no sheet of ${period({ validFrom, validTo })} in service-sheets.json`);
  const sheet = { validFrom, validTo, ...(current.rev !== undefined && { rev: current.rev }) };
  const result = addServiceSheet(env, record, sheet, { check });
  return { lines: serviceSheetLines(result, check), written: result.written };
}

/**
 * Writes the draft record of the DOCX's week (its newest, or the one --from and --to name) to `out`, read from its
 * table and announcements, and prints what a check prints; stages nothing. Returns the lines to print.
 */
export async function draftSheet(env: StageEnv, { out, ...options }: DraftOptions) {
  if (!isDocx(options.source)) throw new Error("a draft is read from the parish's DOCX, not a PDF");
  return runSheet(env, { ...options, draft: out, check: true });
}

/**
 * Stages the weekly PDF (or the week's page of the DOCX) and adds its sheet (the record); without a record, `check`
 * only prints the week, its days and the events its announcements can link. Returns the lines to print and the files
 * written.
 */
export async function stageSheet(env: StageEnv, options: SheetOptions) {
  // A PDF staged without its sheet would go to the server with nothing linking it, and take the week's name there.
  if (!options.record && !options.check) {
    throw new Error(
      isDocx(options.source)
        ? "--record is required to stage the week's page; for a DOCX, first write the draft record with `pnpm stage sheet draft` (or only print the week with --check)"
        : "--record is required to stage the PDF; without it, only --check",
    );
  }
  return runSheet(env, options);
}

async function runSheet(env: StageEnv, options: RunOptions) {
  const { corrected = false, check = false } = options;
  const src = sourceFile(options.source, MAX_MB.sheet, env.home);
  const dir = mkdtempSync(join(tmpdir(), "sheet-"));
  const notes: string[] = [];
  try {
    const { pdf, week, lines } = await sourceWeek(env, src, options, dir, notes);
    const { validFrom, validTo } = week;
    // Refuses a week before the current sheet or overlapping another before anything else, even without a record.
    const there = placeSheet<SheetWeek>(readServiceSheets(env.serviceSheetsFile).sheets, week).replaced;
    const rev = await sheetRev(env, validFrom, corrected);
    const rel = sheetPdfFile({ validFrom, rev });
    const sheet = { validFrom, validTo, ...(rev !== undefined && { rev }) };
    // Validate before anything is copied, so a bad record leaves nothing staged.
    if (options.record) {
      const checked = addServiceSheet(env, options.record, sheet, { check: true });
      if (check) lines.push(...serviceSheetLines(checked, true));
    }
    // Each conversion writes a new file, so a DOCX's page replaces the one staged before (never one on the server).
    await stage(env, pdf, rel, check, correctedHint("this week"), corrected || pdf !== src);
    lines.push(stagedLine(check, rel));
    if (!options.record) {
      // Past the server check, so the week is not released: a record replaces its sheet, as a correction does.
      const note =
        there && !corrected
          ? [
              `The sheet ${period(week)} is already in src/content/service-sheets.json, not released yet: --record replaces it, so start the record from that sheet to keep its fixes`,
            ]
          : [];
      return { lines: [...lines, ...weekLines(sheet), ...newsLines(env.newsDir, validFrom), ...note], written: [] };
    }
    if (check) return { lines, written: [] };
    const result = addServiceSheet(env, options.record, sheet);
    lines.push(...serviceSheetLines(result, false));
    return { lines, written: result.written };
  } catch (error) {
    if (notes.length === 0 || !(error instanceof Error)) throw error;
    throw new Error(`${error.message}\n${notes.join("\n")}`, { cause: error });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
