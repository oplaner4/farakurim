// `pnpm stage porad` (scripts/stage/cli.ts): reads the week from the pořad bohoslužeb heading ("od 4. 10. 2026
// do 11. 10. 2026"), stages uploads/porady_bohosluzeb/<validFrom>-porad-bohosluzeb[-<N>].pdf and, with a record, adds
// the sheet to src/content/ohlasky/ (scripts/add-ohlasky.ts).

import { extname } from "node:path";
import { addDays, differenceInCalendarDays, format, getISODay } from "date-fns";
import { addOhlasky, ohlaskyLines } from "../add-ohlasky";
import { MAX_MB, sourceFile, stage, stagedLine, type StageEnv } from "./core";
import { pdfFirstPageText } from "../upload-images";

const WEEKDAYS = ["po", "út", "st", "čt", "pá", "so", "ne"];

/** An ISO date of a valid day, month and year; throws for 31. 2. */
function isoDate(day: number, month: number, year: number): string {
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`${day}. ${month}. ${year} is not a date`);
  }
  return format(date, "yyyy-MM-dd");
}

/** A local date of an ISO date, for the day arithmetic. */
const localDate = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
};

/**
 * The week of a pořad bohoslužeb from its heading: "od 30. 11. 2025 do 7. 12. 2025", or without the first year
 * ("od 30. 11. do 7. 12. 2025", the year before when the week crosses New Year). Null without a heading.
 */
export function parseWeek(text: string): { validFrom: string; validTo: string } | null {
  const m = /od (\d{1,2})\. ?(\d{1,2})\. ?(\d{4})? ?do (\d{1,2})\. ?(\d{1,2})\. ?(\d{4})/i.exec(
    text.replace(/\s+/g, " "),
  );
  if (!m) return null;
  const [day, month, endDay, endMonth, endYear] = [m[1], m[2], m[4], m[5], m[6]].map(Number);
  const year = m[3] ? Number(m[3]) : month > endMonth ? endYear - 1 : endYear;
  return { validFrom: isoDate(day, month, year), validTo: isoDate(endDay, endMonth, endYear) };
}

/** Every date from `validFrom` to `validTo` with its Czech weekday: "so 2026-10-03". */
export const weekDays = (validFrom: string, validTo: string) =>
  Array.from({ length: differenceInCalendarDays(localDate(validTo), localDate(validFrom)) + 1 }, (_, i) => {
    const date = addDays(localDate(validFrom), i);
    return `${WEEKDAYS[getISODay(date) - 1]} ${format(date, "yyyy-MM-dd")}`;
  });

export interface PoradOptions {
  source: string;
  validFrom?: string;
  validTo?: string;
  rev?: number;
  /** The confirmed sheet record (days and announcements), added to src/content/ohlasky/. */
  record?: Record<string, unknown>;
  check?: boolean;
}

/** Stages the weekly PDF and, with a record, adds the sheet; returns the lines to print and the files written. */
export async function stagePorad(env: StageEnv, options: PoradOptions) {
  const { rev, check = false } = options;
  const src = sourceFile(options.source, MAX_MB.porad, env.home);
  if (extname(src).toLowerCase() !== ".pdf") throw new Error("the pořad bohoslužeb is a PDF");
  let week: { validFrom: string; validTo: string } | null = null;
  if (options.validFrom && options.validTo) {
    week = { validFrom: options.validFrom, validTo: options.validTo };
    for (const date of [week.validFrom, week.validTo]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`${date} is not a YYYY-MM-DD date`);
      const [year, month, day] = date.split("-").map(Number);
      isoDate(day, month, year);
    }
  } else {
    week = parseWeek(pdfFirstPageText(src));
    if (!week) throw new Error("no 'od … do …' week in the PDF heading: pass --from and --to");
  }
  const { validFrom, validTo } = week;
  // One week, or two around holidays (Sunday to Sunday is 14 days); anything longer is a misread heading.
  const days = differenceInCalendarDays(localDate(validTo), localDate(validFrom));
  if (days <= 0 || days > 21) throw new Error(`the period ${validFrom} – ${validTo} looks wrong: pass --from and --to`);
  const rel = `porady_bohosluzeb/${validFrom}-porad-bohosluzeb${rev ? `-${rev}` : ""}.pdf`;
  const hint = `this week is already published; for a corrected PDF pass --rev ${(rev ?? 1) + 1}`;
  const sheetWeek = { pdfUrl: `/uploads/${rel}`, validFrom, validTo };
  const lines: string[] = [];
  // Validate before anything is copied, so a bad record leaves nothing staged.
  if (options.record) {
    const checked = addOhlasky(env.ohlaskyDir, env.newsDir, options.record, sheetWeek, { check: true });
    if (check) lines.push(...ohlaskyLines(checked, true));
  }
  await stage(env, src, rel, check, hint);
  lines.push(stagedLine(check, `uploads/${rel}`));
  if (!options.record) {
    lines.push(
      `  pdfUrl: "/uploads/${rel}",\n  validFrom: "${validFrom}",\n  validTo: "${validTo}",`,
      `days: ${weekDays(validFrom, validTo).join(", ")}`,
    );
    return { lines, written: [] };
  }
  if (check) return { lines, written: [] };
  const result = addOhlasky(env.ohlaskyDir, env.newsDir, options.record, sheetWeek);
  lines.push(...ohlaskyLines(result, false));
  return { lines, written: result.written };
}
