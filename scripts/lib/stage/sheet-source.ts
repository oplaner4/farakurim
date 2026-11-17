// Reads a service sheet's source, the parish's weekly PDF or its DOCX of the whole year, for staging: the week (from
// the heading, or the one --from and --to name), the PDF to stage (the PDF itself, or the week's page of the converted
// DOCX) and, when asked, the week's draft record (read from the DOCX's table and announcements; for a PDF, whose table
// is not read, every day of the week without services). A DOCX's newer week is named in a note, and an error in the
// parish's document is a DocumentError.

import { extname, join } from "node:path";
import { pragueDate } from "@/lib/shared/prague";
import { period, periodDates, periodLength } from "@/lib/services/service-sheet";
import { readServiceSheets } from "../services/add-service-sheet";
import { writeContentFile } from "../content-files";
import { docxToPdf } from "../services/docx-to-pdf";
import { docxWeeks, type DocxWeek, type DraftRecord } from "../services/sheet-docx";
import { emptyDay, newestWeek, parseWeek, weekPages } from "../services/sheet-week";
import { next, refusal, tell } from "../output";
import { extractPdfPages, pdfFirstPageText, pdfPageTexts } from "../images";
import type { StageEnv } from "./core";

/** The week a run names (--from and --to, checked by the command line) and where to write its draft, if anywhere. */
export type SourceOptions = { validFrom?: string; validTo?: string; draft?: string };

export type Week = { validFrom: string; validTo: string };

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
function pdfWeek(src: string, options: SourceOptions): Week {
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
async function docxWeek(src: string, options: SourceOptions): Promise<{ week: DocxWeek; newer?: Week }> {
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

/** What a run knows before it may fail: the notes a refusal repeats, and the week once it is read. */
export type Known = { notes: string[]; week?: Week };

/**
 * The PDF to stage and its week: the PDF `src` itself, or the week's page of the DOCX `src` converted in `dir` (and,
 * with `draft`, the week's draft record written there). Returns the lines to print too.
 */
export async function sourceWeek(
  env: StageEnv,
  src: string,
  options: SourceOptions,
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
