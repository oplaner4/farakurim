import { tz, TZDate } from "@date-fns/tz";
import { format, getDay, parse } from "date-fns";
import type { ClockTime, IsoDate, Weekday } from "@/content/types/shared";

// All parish data is Europe/Prague wall-clock time; visitors' browsers may run in any zone.
// Pass `{ in: inPrague }` to date-fns functions so they calculate in Prague time.
export const inPrague = tz("Europe/Prague");

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
