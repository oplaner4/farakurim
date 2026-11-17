// Stages a service sheet PDF as porady_bohosluzeb/<validFrom>-porad-bohosluzeb[-r<rev>].pdf, with the
// week read from its heading ("od 4. 10. 2026 do 11. 10. 2026"), and adds the sheet (the record) to
// src/content/service-sheets.json (addServiceSheet()). The week is checked against the sheets first: one before the
// current sheet or overlapping another is refused. The sheet stores the rev, so a rerun keeps it and a corrected PDF
// gets the next one. The source can also be the parish's DOCX of the whole year: then the week is its newest one (or
// the one --from names, and the DOCX's newer week is named, also in a refusal) and its PDF that week's page of the
// converted document.
// draftSheet() runs the same checks without a record and stages nothing: it writes the week's draft record (read from
// the DOCX's table and announcements; for a PDF every day of the week without services, to fill from the PDF), names
// a week already there and lists the events an announcement can link, so the newsIds need no search of the news.
// With a result file (StageEnv.result), a draft or staging run writes what it did with its week (sheet-result.ts):
// drafted, staged, refused, or a document error when the parish's DOCX cannot be read.

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { addDays } from "date-fns";
import { readEvents } from "@/content/news";
import type { IsoDate } from "@/content/types/shared";
import { inPrague, pragueDate, pragueDateTime } from "@/lib/shared/prague";
import { period, periodDates, periodLength, sheetPdfFile } from "@/lib/services/service-sheet";
import {
  addServiceSheet,
  placeSheet,
  serviceSheetLines,
  readServiceSheets,
  type SheetWeek,
} from "../services/add-service-sheet";
import { writeContentFile } from "../content-files";
import { writeSheetResult } from "./sheet-result";
import type { SheetResult } from "./sheet-result-schema";
import { docxToPdf } from "../services/docx-to-pdf";
import { docxWeeks, type DocxWeek, type DraftRecord } from "../services/sheet-docx";
import { emptyDay, newestWeek, parseWeek, weekPages } from "../services/sheet-week";
import { eventLine, notEndedBy } from "../news/upcoming-events";
import { next, refusal, refusalReason, state, tell } from "../output";
import { correctedHint, correctedRev, MAX_MB, sourceFile, stage, stagedLine, type StageEnv } from "./core";
import { extractPdfPages, pdfFirstPageText, pdfPageTexts } from "../images";

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
  /** Where to write the week's draft record. */
  out: string;
};

/** A run of stageSheet() or draftSheet(): with `draft`, it writes the draft record there and stages nothing. */
type RunOptions = SheetOptions & { draft?: string };

type Week = { validFrom: string; validTo: string };

/**
 * An error in the parish's document: a DOCX that cannot be read, has no week heading or a table that does not fit its
 * week. The run's result is then a document error, not a refusal.
 */
export class DocumentError extends Error {}

/** `read()`'s value; whatever it throws is a DocumentError. */
async function fromDocument<T>(read: () => T | Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    // No cause: errorMessage() would print the message again after it.
    throw new DocumentError(error instanceof Error ? error.message : String(error));
  }
}

/** Throws for a period that is not one week, or two around holidays: a misread heading. */
function checkLength(week: Week) {
  // Sunday to Sunday is 14 days for two weeks.
  const days = periodLength(week);
  if (days <= 0 || days > 21) throw refusal(`the period ${period(week)} looks wrong`, next("pass --from and --to"));
  return week;
}

/** The week of the PDF `src`: --from and --to when given, else its heading. */
function pdfWeek(src: string, options: RunOptions): Week {
  // --from and --to are checked by the command line (scripts/lib/stage/command.ts): real dates, both or neither.
  const week =
    options.validFrom && options.validTo
      ? { validFrom: options.validFrom, validTo: options.validTo }
      : parseWeek(pdfFirstPageText(src));
  if (!week) throw refusal("no 'od … do …' week in the PDF heading", next("pass --from and --to"));
  return checkLength(week);
}

/**
 * The week of the DOCX `src`: the one --from and --to name, else the newest; with `newer`, the DOCX's newest week when
 * the named one is not it.
 */
async function docxWeek(src: string, options: RunOptions): Promise<{ week: DocxWeek; newer?: Week }> {
  const weeks = await fromDocument(() => docxWeeks(src));
  if (weeks.length === 0) throw new DocumentError("no 'ROZPIS BOHOSLUŽEB … od … do …' heading in the DOCX");
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
  return tell(`Not the DOCX's newest week: its newest, ${period(newer)}, is left out of this run; ${where}${meant}`);
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
  if (!current) throw refusal(`no sheet of ${validFrom} is added`, next("leave out --corrected for a new week"));
  return correctedRev(env, current.rev, (r) => sheetPdfFile({ validFrom, rev: r }));
}

/** A PDF week's draft record: every day of the week without services, and no announcements. */
const pdfDraft = (week: Week): DraftRecord => ({
  days: periodDates(week.validFrom, week.validTo).map(emptyDay),
  announcements: [],
});

/** Writes `draft`, the draft record of `week`, to `out`; returns the line saying so. */
function writeDraft(out: string, week: Week, draft: DraftRecord) {
  writeContentFile(out, draft);
  return `Wrote the draft record of ${period(week)} to ${out}`;
}

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

/** What a run knows before it may fail: the notes a refusal repeats, and the week once it is read. */
type Known = { notes: string[]; week?: Week };

/**
 * The PDF to stage and its week: the PDF `src` itself, or the week's page of the DOCX `src` converted in `dir` (and,
 * with `draft`, the week's draft record written there). Returns the lines to print too.
 */
async function sourceWeek(
  env: StageEnv,
  src: string,
  options: RunOptions,
  dir: string,
  known: Known,
): Promise<{ pdf: string; week: Week; lines: string[] }> {
  if (!isDocx(src)) {
    if (extname(src).toLowerCase() !== ".pdf") throw new Error("the service sheet is a PDF or a DOCX");
    const week = pdfWeek(src, options);
    known.week = week;
    // The script cannot read the PDF's table: the draft holds only the week's days.
    const lines =
      options.draft === undefined
        ? []
        : [
            writeDraft(options.draft, week, pdfDraft(week)),
            next("fill each day's feast and rows, and the announcements, from the PDF"),
          ];
    return { pdf: src, week, lines };
  }
  const { week: docxSheet, newer } = await docxWeek(src, options);
  const week = { validFrom: docxSheet.validFrom, validTo: docxSheet.validTo };
  known.week = week;
  // Kept in `notes` before anything can throw, so a refusal names the newer week too.
  if (newer) known.notes.push(newerWeekNote(env, week, newer));
  const lines = [...known.notes];
  // Written before the conversion, so the draft is there to check even without a converter.
  if (options.draft !== undefined) {
    const draft = await fromDocument(() => docxSheet.draft());
    lines.push(writeDraft(options.draft, week, draft));
    const empty = draft.days.filter((day) => day.rows.length === 0).map((day) => day.date);
    if (empty.length > 0) lines.push(tell(`Days without services: ${empty.join(", ")}`));
  }
  return { pdf: docxWeekPdf(src, week, dir), week, lines };
}

const isDocx = (src: string) => extname(src).toLowerCase() === ".docx";
/**
 * Writes the week's draft record to `out`: the DOCX's week (its newest, or the one --from and --to name) read from its
 * table and announcements, or the PDF's week without services. Checks the week as staging does, stages nothing and
 * prints the events its announcements can link. Returns the lines to print.
 */
export async function draftSheet(env: StageEnv, { out, ...options }: DraftOptions) {
  return runSheet(env, { ...options, draft: out, check: true });
}

/**
 * Stages the weekly PDF (or the week's page of the DOCX) and adds its sheet (the record); with `check` it only
 * validates the record. Returns the lines to print and the files written.
 */
export async function stageSheet(env: StageEnv, options: SheetOptions) {
  // A PDF staged without its sheet would go to the server with nothing linking it, and take the week's name there.
  if (!options.record) {
    throw refusal(
      "--record is required, also with --check",
      next("write the draft record with `pnpm stage-content sheet draft` first"),
    );
  }
  return runSheet(env, options);
}

/** The result of a run that failed with `error`: a document error or a refusal, with its first line and the week. */
function failedResult(error: unknown, week: Week | undefined): SheetResult {
  const reason = refusalReason(error instanceof Error ? error.message : String(error));
  return { ...week, result: error instanceof DocumentError ? "document-error" : "refused", reason };
}

/**
 * Runs the sheet command and, for a draft or a staging run (not a check), writes its result to `env.result`: drafted
 * or staged, or why it failed. A refusal is printed with the notes of the run, keeping its kind.
 */
async function runSheet(env: StageEnv, options: RunOptions) {
  const recorded = env.result !== undefined && (options.draft !== undefined || (!!options.record && !options.check));
  const record = (result: SheetResult) => {
    if (recorded) writeSheetResult(env.result!, result);
  };
  const known: Known = { notes: [] };
  try {
    const done = await runSheetWeek(env, options, known);
    record({ ...known.week!, result: options.draft !== undefined ? "drafted" : "staged" });
    return done;
  } catch (error) {
    record(failedResult(error, known.week));
    if (known.notes.length === 0 || !(error instanceof Error)) throw error;
    // The same error, so a DocumentError stays one; the message holds the refusal, the notes follow it.
    error.message = `${error.message}\n${known.notes.join("\n")}`;
    throw error;
  }
}

async function runSheetWeek(env: StageEnv, options: RunOptions, known: Known) {
  const { corrected = false, check = false } = options;
  const src = sourceFile(options.source, MAX_MB.sheet, env.home);
  const dir = mkdtempSync(join(tmpdir(), "sheet-"));
  try {
    const { pdf, week, lines } = await sourceWeek(env, src, options, dir, known);
    const { validFrom, validTo } = week;
    // Refuses a week before the current sheet or overlapping another before anything else, also for a draft.
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
    await stage(env, pdf, rel, check, correctedHint(), corrected || pdf !== src);
    if (options.draft !== undefined) {
      // Past the server check, so the week is not released: a record replaces its sheet, as a correction does.
      const note =
        there && !corrected
          ? [state("staged"), next("start the record from the staged sheet to keep its fixes; --record replaces it")]
          : [];
      return { lines: [...lines, ...newsLines(env.newsDir, validFrom), ...note], written: [] };
    }
    lines.push(stagedLine(check, rel));
    if (check) return { lines, written: [] };
    const result = addServiceSheet(env, options.record, sheet);
    lines.push(...serviceSheetLines(result, false));
    return { lines, written: result.written };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
