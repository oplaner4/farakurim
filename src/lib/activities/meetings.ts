import { addDays } from "date-fns";
import type { CalendarEntry } from "@/content/types/calendar";
import type { IsoDate } from "@/content/types/shared";
import type { DateRange } from "@/lib/calendar/agenda";
import { capitalize, fold, formatShortDate, weekdayName, WEEKDAY_SHORT } from "@/lib/shared/czech";
import { inPrague, pragueDate, pragueDateTime } from "@/lib/shared/prague";

// "Příští setkání" of a group page (design/DESIGN.md §27.1): the group's next meeting in the parish calendars.

/** How far ahead the next meeting is looked for: eight weeks from `today`. */
export function meetingRange(today: IsoDate): DateRange {
  return { from: today, to: pragueDate(addDays(pragueDateTime(today, "12:00"), 55, { in: inPrague })) };
}

/** Whether a calendar entry is the group's meeting: its title contains `title`, ignoring case and diacritics. */
export const isMeeting = (entry: Pick<CalendarEntry, "title">, title: string) =>
  fold(entry.title).includes(fold(title));

/** "2026-10-11 09:30": sorts entries by day, then by start time (all-day entries first). */
const startKey = ({ date, time }: CalendarEntry) => `${date} ${time?.padStart(5, "0") ?? ""}`;

/** The first meeting on `today` or later; a meeting stays the next one until its day ends. */
export function nextMeeting(entries: CalendarEntry[], title: string, today: IsoDate): CalendarEntry | undefined {
  let next: CalendarEntry | undefined;
  for (const e of entries) {
    if ((e.end ?? e.date) < today || !isMeeting(e, title)) continue;
    if (!next || startKey(e) < startKey(next)) next = e;
  }
  return next;
}

/** "Neděle 11. 10. v 18:30" (without the time for an all-day entry). */
export function meetingLabel({ date, time }: Pick<CalendarEntry, "date" | "time">): string {
  const day = `${capitalize(weekdayName(date))} ${formatShortDate(date)}`;
  return time ? `${day} v ${time}` : day;
}

/** The date tile: "NE" and "11". */
export function meetingTile(date: IsoDate): { weekday: string; day: string } {
  const at = pragueDateTime(date, "12:00");
  return { weekday: WEEKDAY_SHORT[at.getDay()].toUpperCase(), day: String(at.getDate()) };
}

/** "Křížkovského 55, Kuřim": a Google Calendar address without the postcode and the country. */
export const shortPlace = (place: string) =>
  place
    .replace(/,\s*(Česko|Česká republika|Czechia)$/i, "")
    .replace(/\b\d{3}\s?\d{2}\s+/, "")
    .trim();
