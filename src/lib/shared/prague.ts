import { tz, type TZDate } from "@date-fns/tz";
import { format, getDay, isMatch, parse } from "date-fns";
import type { ClockTime, IsoDate, Weekday } from "@/content/types/shared";

// All parish data is Europe/Prague wall-clock time; visitors' browsers may run in any zone.
// Pass `{ in: inPrague }` to date-fns functions so they calculate in Prague time.
export const inPrague = tz("Europe/Prague");

/** Whether `value` is a real date written as an IsoDate: "2026-10-18", not "2026-02-30" or "18. 10.". */
export const isIsoDate = (value: string): value is IsoDate =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && isMatch(value, "yyyy-MM-dd");

/** Prague date and wall-clock time as an instant. */
export function pragueDateTime(date: IsoDate, time: ClockTime): TZDate {
  return parse(`${date} ${time}`, "yyyy-MM-dd H:mm", new Date(), { in: inPrague });
}

/** Prague calendar date (`YYYY-MM-DD`) of an instant. */
export function pragueDate(instant: Date | number): IsoDate {
  return format(instant, "yyyy-MM-dd", { in: inPrague });
}

/** Weekday of a Prague date: 0 = neděle … 6 = sobota. */
export function pragueWeekday(date: IsoDate): Weekday {
  return getDay(pragueDateTime(date, "12:00"), { in: inPrague });
}
