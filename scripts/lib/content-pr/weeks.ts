// The weeks of a service sheet report: a `## ` heading read back into its dates, and the dates written as the commit
// message names them ("19.–25. 10. 2026", "26. 10.–1. 11. 2026"). The dates are checked as the sheet's own heading's
// are (sheet-week.ts); only the form differs, as a report heading is the week alone, always with its year.

import type { IsoDate } from "@/content/types/shared";
import { isoDate, startYear, type Week } from "../services/sheet-week";

/**
 * The week a heading names, in any of the forms `19.–25. 10. 2026`, `26. 10.–1. 11. 2026` or
 * `28. 12. 2026–3. 1. 2027` (with or without spaces, an en dash or a hyphen); undefined for anything else, a day that
 * does not exist or a week that ends before it starts.
 */
export function parseWeekHeading(heading: string): Week | undefined {
  const text = heading.replace(/\s+/g, "").replace(/[‐-―−-]/g, "–");
  const match = /^(\d{1,2})\.(?:(\d{1,2})\.(?:(\d{4}))?)?–(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text);
  if (!match) return undefined;
  const [day, month, year, endDay, endMonth, endYear] = match.slice(1).map((part) => (part ? Number(part) : undefined));
  const fromMonth = month ?? endMonth!;
  try {
    const validFrom = isoDate(day!, fromMonth, year ?? startYear(fromMonth, endMonth!, endYear!));
    const validTo = isoDate(endDay!, endMonth!, endYear!);
    return validFrom <= validTo ? { validFrom, validTo } : undefined;
  } catch {
    return undefined; // isoDate throws for a day that does not exist (31. 2.)
  }
}

const parts = (date: IsoDate) => ({
  day: Number(date.slice(8, 10)),
  month: Number(date.slice(5, 7)),
  year: Number(date.slice(0, 4)),
});

/** `19.–25. 10.`, `26. 10.–1. 11.` or `28. 12. 2026–3. 1.`: a week without the year it ends in. */
function weekWithoutYear({ validFrom, validTo }: Week): string {
  const from = parts(validFrom);
  const to = parts(validTo);
  const end = `${to.day}. ${to.month}.`;
  if (from.year !== to.year) return `${from.day}. ${from.month}. ${from.year}–${end}`;
  if (from.month !== to.month) return `${from.day}. ${from.month}.–${end}`;
  return `${from.day}.–${end}`;
}

/**
 * The weeks as a commit message names them, oldest first: `19.–25. 10. 2026`, or
 * `19.–25. 10. and 26. 10.–1. 11. 2026` with the year once when every week ends in the same one.
 */
export function formatWeeks(weeks: Week[]): string {
  const sorted = [...weeks].sort((a, b) => a.validFrom.localeCompare(b.validFrom));
  const years = new Set(sorted.map((week) => parts(week.validTo).year));
  const labels = sorted.map((week, i) =>
    years.size > 1 || i === sorted.length - 1
      ? `${weekWithoutYear(week)} ${parts(week.validTo).year}`
      : weekWithoutYear(week),
  );
  return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}` : (labels[0] ?? "");
}
