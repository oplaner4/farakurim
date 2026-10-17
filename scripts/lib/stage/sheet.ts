// Stages a service sheet PDF as uploads/porady_bohosluzeb/<validFrom>-porad-bohosluzeb[-r<rev>].pdf, with the
// week read from its heading ("od 4. 10. 2026 do 11. 10. 2026"), and adds the sheet to src/content/service-sheets.json
// (addServiceSheet()); without a record it only checks and prints the week. The week is checked against the sheets
// first, with or without a record: one before the current sheet or overlapping another is refused, and one already
// there is named. The sheet stores the rev, so a rerun keeps it and a corrected PDF gets the next one. The source can
// also be the parish's DOCX of the whole year: then the week is its newest one (or the one --from names), its PDF that
// week's page of the converted document, and its draft record is read from the week's table and announcements.

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import type { IsoDate } from "@/content/types/shared";
import { WEEKDAY_SHORT } from "@/lib/shared/czech";
import { pragueWeekday } from "@/lib/shared/prague";
import { period, periodDates, periodLength, sheetPdfFile } from "@/lib/services/service-sheet";
import {
  addServiceSheet,
  placeSheet,
  serviceSheetLines,
  readServiceSheets,
  type SheetWeek,
} from "../services/add-service-sheet";
import { docxToPdf } from "../services/docx-to-pdf";
import { docxWeeks, type DocxWeek } from "../services/sheet-docx";
import { parseWeek, weekPages } from "../services/sheet-week";
import { correctedHint, correctedRev, MAX_MB, sourceFile, stage, stagedLine, type StageEnv } from "./core";
import { extractPdfPages, pdfFirstPageText, pdfPageTexts } from "../images";

/** Every date from `validFrom` to `validTo` with its Czech weekday: "so 2026-10-03". */
export const weekDays = (validFrom: IsoDate, validTo: IsoDate) =>
  periodDates(validFrom, validTo).map((date) => `${WEEKDAY_SHORT[pragueWeekday(date)].toLowerCase()} ${date}`);

export type SheetOptions = {
  source: string;
  validFrom?: string;
  validTo?: string;
  /** A corrected PDF of a week already in service-sheets.json. */
  corrected?: boolean;
  /** The confirmed sheet record (days and announcements), added to src/content/service-sheets.json. */
  record?: Record<string, unknown>;
  /** With a DOCX source: where to write the week's draft record; like `check`, it stages nothing. */
  draft?: string;
  check?: boolean;
};

type Week = { validFrom: string; validTo: string };

/** Throws for a period that is not one week, or two around holidays: a misread heading. */
function checkLength(week: Week) {
  // Sunday to Sunday is 14 days for two weeks.
  const days = periodLength(week);
  if (days <= 0 || days > 21) throw new Error(`the period ${period(week)} looks wrong: pass --from and --to`);
  return week;
}

/** The week of the PDF `src`: --from and --to when given, else its heading. */
function pdfWeek(src: string, options: SheetOptions): Week {
  // --from and --to are checked by the command line (scripts/lib/stage/command.ts): real dates, both or neither.
  const week =
    options.validFrom && options.validTo
      ? { validFrom: options.validFrom, validTo: options.validTo }
      : parseWeek(pdfFirstPageText(src));
  if (!week) throw new Error("no 'od … do …' week in the PDF heading: pass --from and --to");
  return checkLength(week);
}

/** The week of the DOCX `src`: the one --from and --to name, else the newest. */
async function docxWeek(src: string, options: SheetOptions): Promise<DocxWeek> {
  const weeks = await docxWeeks(src);
  if (weeks.length === 0) throw new Error("no 'ROZPIS BOHOSLUŽEB … od … do …' heading in the DOCX");
  if (!options.validFrom) return weeks.reduce((newest, week) => (week.validFrom > newest.validFrom ? week : newest));
  const week = weeks.find((w) => w.validFrom === options.validFrom && w.validTo === options.validTo);
  if (!week) {
    const listed = weeks.slice(0, 5).map(period).join(", ");
    throw new Error(`no week ${options.validFrom} – ${options.validTo} in the DOCX; it has ${listed}, …`);
  }
  checkLength(week);
  return week;
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

/**
 * The PDF to stage and its week: the PDF `src` itself, or the week's page of the DOCX `src` converted in `dir` (and,
 * with `draft`, the week's draft record written there). Returns the lines to print too.
 */
async function sourceWeek(
  src: string,
  options: SheetOptions,
  dir: string,
): Promise<{ pdf: string; week: Week; lines: string[] }> {
  const docx = extname(src).toLowerCase() === ".docx";
  if (!docx && extname(src).toLowerCase() !== ".pdf") throw new Error("the service sheet is a PDF or a DOCX");
  if (!docx) {
    if (options.draft !== undefined) throw new Error("--draft reads the week from a DOCX");
    return { pdf: src, week: pdfWeek(src, options), lines: [] };
  }
  const docxSheet = await docxWeek(src, options);
  const week = { validFrom: docxSheet.validFrom, validTo: docxSheet.validTo };
  const lines: string[] = [];
  // Written before the conversion, so the draft is there to check even without a converter.
  if (options.draft !== undefined) {
    const draft = docxSheet.draft();
    writeFileSync(options.draft, `${JSON.stringify(draft, null, 2)}\n`);
    lines.push(`Wrote the draft record of ${period(week)} to ${options.draft}`);
    const empty = draft.days.filter((day) => day.rows.length === 0).map((day) => day.date);
    if (empty.length > 0) lines.push(`Days without services (tell the user): ${empty.join(", ")}`);
  }
  return { pdf: docxWeekPdf(src, week, dir), week, lines };
}

/**
 * Stages the weekly PDF (or the week's page of the DOCX) and adds its sheet (the record); without a record, `check`
 * only prints the week and its days, and `draft` writes the DOCX week's draft record. Returns the lines to print and
 * the files written.
 */
export async function stageSheet(env: StageEnv, options: SheetOptions) {
  const { corrected = false } = options;
  const check = options.check || options.draft !== undefined;
  // A PDF staged without its sheet would go to the server with nothing linking it, and take the week's name there.
  if (!options.record && !check) throw new Error("--record is required to stage the PDF; without it, only --check");
  if (options.draft !== undefined && options.record) {
    throw new Error("--draft writes a record to check: not with --record");
  }
  const src = sourceFile(options.source, MAX_MB.sheet, env.home);
  const dir = mkdtempSync(join(tmpdir(), "sheet-"));
  try {
    const { pdf, week, lines } = await sourceWeek(src, options, dir);
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
      return { lines: [...lines, ...weekLines(sheet), ...note], written: [] };
    }
    if (check) return { lines, written: [] };
    const result = addServiceSheet(env, options.record, sheet);
    lines.push(...serviceSheetLines(result, false));
    return { lines, written: result.written };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
