import type { IsoDate, YearlyBreak } from "@/content/types/shared";

/** Whether a date falls in a yearly break (both ends included); the break may wrap over New Year (`from > to`). */
export function inYearlyBreak(date: IsoDate, closed: YearlyBreak): boolean {
  const day = date.slice(5);
  const { from, to } = closed;
  return from <= to ? day >= from && day <= to : day >= from || day <= to;
}
