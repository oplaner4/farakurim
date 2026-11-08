// The week a service sheet e-mail's subject names, if any: a date ("15. 11.", "15. 11. 2026") or a range
// ("16.–22. 11.", "16. 11. – 22. 11. 2026", "od 15. 11. do 22. 11."), matched to a week of the sheet DOCX. A subject
// without a date names no week, and so does a reply's or a forward's ("Re: Pořad 1.–8. 11."): it keeps the subject
// of an earlier mail, whose week is not the one sent now. A heading's form ("od … do …" with the year) is read as
// the DOCX's heading is (sheet-week.ts); the subject's looser forms add a missing year and month.

import type { IsoDate } from "@/content/types/shared";
import { pragueDate } from "@/lib/shared/prague";
import { isoDate, newestWeek, parseWeek, startYear, type Week } from "./sheet-week";

/** The dates a subject names: none, a range (`from` = `to` for one date), or a date that does not exist (31. 2.). */
export type SubjectDates = { kind: "none" } | { kind: "dates"; from: IsoDate; to: IsoDate } | { kind: "invalid" };

/** The prefixes a mail program puts before a reply's or a forward's subject (Czech and English clients). */
const REPLY = /^\s*(?:re|odp|fwd?|tr|vs)\s*(?:\[\d+\])?\s*:/i;

const DAY = String.raw`(\d{1,2})\.`;
const MONTH = String.raw`(?:\s*(\d{1,2})\.)`;
const YEAR = String.raw`(?:\s*(\d{4}))`;
const RANGE = new RegExp(
  String.raw`(?:^|[^\d.])(?:od\s+)?${DAY}${MONTH}?${YEAR}?\s*(?:[-–—]|\bdo\b)\s*${DAY}${MONTH}${YEAR}?`,
  "i",
);
const SINGLE = new RegExp(String.raw`(?:^|[^\d.])${DAY}${MONTH}${YEAR}?`);

/** The year of a day and month without one: the year that puts it closest to `sent` (Prague time). */
function nearestYear(month: number, day: number, sent: Date): number {
  const [year, sentMonth, sentDay] = pragueDate(sent).split("-").map(Number);
  const distance = (y: number) => Math.abs(Date.UTC(y, month - 1, day) - Date.UTC(year, sentMonth - 1, sentDay));
  return [year - 1, year, year + 1].reduce((a, b) => (distance(b) < distance(a) ? b : a));
}

/** `from` to `to` as dates, or `invalid` when one does not exist or the range runs backwards. */
function datesOf(from: () => IsoDate, to: () => IsoDate): SubjectDates {
  try {
    const dates = { from: from(), to: to() };
    return dates.from <= dates.to ? { kind: "dates", ...dates } : { kind: "invalid" };
  } catch {
    return { kind: "invalid" };
  }
}

/** The dates the subject of a mail `sent` then names; a missing year is the one closest to `sent`. */
export function subjectDates(subject: string, sent: Date): SubjectDates {
  if (REPLY.test(subject)) return { kind: "none" };
  const text = subject.replace(/\s+/g, " ");
  try {
    const week = parseWeek(text);
    if (week)
      return datesOf(
        () => week.validFrom,
        () => week.validTo,
      );
  } catch {
    return { kind: "invalid" };
  }
  const range = RANGE.exec(text);
  if (range) {
    const [day, month, year, endDay, endMonth, endYear] = range.slice(1).map((v) => (v ? Number(v) : undefined));
    const toYear = endYear ?? nearestYear(endMonth!, endDay!, sent);
    // "30.–6. 12." starts in the month before.
    const fromMonth = month ?? (day! > endDay! ? ((endMonth! + 10) % 12) + 1 : endMonth!);
    return datesOf(
      () => isoDate(day!, fromMonth, year ?? startYear(fromMonth, endMonth!, toYear)),
      () => isoDate(endDay!, endMonth!, toYear),
    );
  }
  const single = SINGLE.exec(text);
  if (!single) return { kind: "none" };
  const [day, month, year] = single.slice(1).map((v) => (v ? Number(v) : undefined));
  const date = () => isoDate(day!, month!, year ?? nearestYear(month!, day!, sent));
  return datesOf(date, date);
}

/**
 * The week of `weeks` that holds every day from `from` to `to`; on the Sunday two weeks share, the newer one. Undefined
 * when no week holds them all.
 */
export const weekOf = <W extends Week>(weeks: W[], { from, to }: { from: IsoDate; to: IsoDate }): W | undefined =>
  newestWeek(weeks.filter((week) => week.validFrom <= from && to <= week.validTo));
