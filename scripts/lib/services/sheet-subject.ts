// The week a service sheet e-mail's subject names, if any: a date ("15. 11.", "15. 11. 2026") or a range
// ("16.–22. 11.", "16. 11. – 22. 11. 2026", "od 15. 11. do 22. 11."), matched to a week of the sheet DOCX. A subject
// without a date names no week.

import type { IsoDate } from "@/content/types/shared";
import { isIsoDate, pragueDate } from "@/lib/shared/prague";

export type Week = { validFrom: IsoDate; validTo: IsoDate };

/** The dates a subject names: none, a range (`from` = `to` for one date), or a date that does not exist (31. 2.). */
export type SubjectDates = { kind: "none" } | { kind: "dates"; from: IsoDate; to: IsoDate } | { kind: "invalid" };

const DAY = String.raw`(\d{1,2})\.`;
const MONTH = String.raw`(?:\s*(\d{1,2})\.)`;
const YEAR = String.raw`(?:\s*(\d{4}))`;
const RANGE = new RegExp(
  String.raw`(?:^|[^\d.])(?:od\s+)?${DAY}${MONTH}?${YEAR}?\s*(?:[-–—]|\bdo\b)\s*${DAY}${MONTH}${YEAR}?`,
  "i",
);
const SINGLE = new RegExp(String.raw`(?:^|[^\d.])${DAY}${MONTH}${YEAR}?`);

const iso = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

/** The year of a day and month without one: the year that puts it closest to `sent` (Prague time). */
function nearestYear(month: number, day: number, sent: Date): number {
  const year = Number(pragueDate(sent).slice(0, 4));
  const at = Date.parse(pragueDate(sent));
  const distance = (y: number) => Math.abs(Date.parse(iso(y, month, day)) - at);
  return [year - 1, year, year + 1].reduce((a, b) => (distance(b) < distance(a) ? b : a));
}

/** The dates the subject of a mail `sent` then names; a missing year is the one closest to `sent`. */
export function subjectDates(subject: string, sent: Date): SubjectDates {
  const text = subject.replace(/\s+/g, " ");
  const range = RANGE.exec(text);
  if (range) {
    const [day, month, year, endDay, endMonth, endYear] = range.slice(1).map((v) => (v ? Number(v) : undefined));
    const toYear = endYear ?? nearestYear(endMonth!, endDay!, sent);
    // "30.–6. 12." starts in the month before; "30. 12. – 5. 1." in the year before.
    const fromMonth = month ?? (day! > endDay! ? ((endMonth! + 10) % 12) + 1 : endMonth!);
    const fromYear = year ?? (fromMonth > endMonth! ? toYear - 1 : toYear);
    const from = iso(fromYear, fromMonth, day!);
    const to = iso(toYear, endMonth!, endDay!);
    return isIsoDate(from) && isIsoDate(to) && from <= to ? { kind: "dates", from, to } : { kind: "invalid" };
  }
  const single = SINGLE.exec(text);
  if (!single) return { kind: "none" };
  const [day, month, year] = single.slice(1).map((v) => (v ? Number(v) : undefined));
  const date = iso(year ?? nearestYear(month!, day!, sent), month!, day!);
  return isIsoDate(date) ? { kind: "dates", from: date, to: date } : { kind: "invalid" };
}

/** The newest week of `weeks` (the latest start), as the DOCX's week when none is named. */
export const newestWeek = <W extends Week>(weeks: W[]): W | undefined =>
  weeks.reduce<W | undefined>(
    (newest, week) => (!newest || week.validFrom > newest.validFrom ? week : newest),
    undefined,
  );

/**
 * The week of `weeks` that holds every day from `from` to `to`; on the Sunday two weeks share, the newer one. Undefined
 * when no week holds them all.
 */
export const weekOf = <W extends Week>(weeks: W[], { from, to }: { from: IsoDate; to: IsoDate }): W | undefined =>
  newestWeek(weeks.filter((week) => week.validFrom <= from && to <= week.validTo));
