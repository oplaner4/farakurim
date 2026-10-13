// The week of a service sheet, read from its heading ("ROZPIS BOHOSLUŽEB V TÝDNU od 4. 10. 2026 do 11. 10. 2026")
// in the PDF or the DOCX.

import type { IsoDate } from "@/content/types/shared";
import { isIsoDate } from "@/lib/shared/prague";

/** An ISO date of a valid day, month and year; throws for 31. 2. */
function isoDate(day: number, month: number, year: number): IsoDate {
  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (!isIsoDate(date)) throw new Error(`${day}. ${month}. ${year} is not a date`);
  return date;
}

/**
 * The week of a service sheet from its heading: "od 30. 11. 2025 do 7. 12. 2025", or without the first year
 * ("od 30. 11. do 7. 12. 2025", the year before when the week crosses New Year). Null without a heading.
 */
export function parseWeek(text: string): { validFrom: IsoDate; validTo: IsoDate } | null {
  const m = /od (\d{1,2})\. ?(\d{1,2})\. ?(\d{4})? ?do (\d{1,2})\. ?(\d{1,2})\. ?(\d{4})/i.exec(
    text.replace(/\s+/g, " "),
  );
  if (!m) return null;
  const [day, month, endDay, endMonth, endYear] = [m[1], m[2], m[4], m[5], m[6]].map(Number);
  const year = m[3] ? Number(m[3]) : month > endMonth ? endYear - 1 : endYear;
  return { validFrom: isoDate(day, month, year), validTo: isoDate(endDay, endMonth, endYear) };
}

/** The week of a heading ("ROZPIS BOHOSLUŽEB V TÝDNU od … do …") in `text` (a paragraph or a page), else null. */
export const weekHeading = (text: string) => (/rozpis|po[řr]ad/i.test(text) ? parseWeek(text) : null);
