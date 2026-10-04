import { tz } from "@date-fns/tz";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { createEvent, type DateArray, type DateTime, type EventAttributes } from "ics";
import type { NewsEvent } from "@/content/types/news";
import type { ClockTime, IsoDate } from "@/content/types/shared";
import { eventSlug } from "./events";
import { inPrague, pragueDate, pragueDateTime } from "@/lib/shared/prague";

// "Přidat do kalendáře" (design/DESIGN.md §13.2): one .ics file per event, generated at build time.
// Times are Prague wall-clock and written in UTC, so no VTIMEZONE block is needed.

/** "9:30" or "18:00–20:30"; other time texts ("po mši") make the event all-day. */
const CLOCK = /^(\d{1,2}:\d{2})(?:\s*[–-]\s*(\d{1,2}:\d{2}))?$/;

/** Start (and end) time of a single-day event's or weekly series' time text, if it is a clock time. */
export function eventClock(event: NewsEvent): { from: ClockTime; to?: ClockTime } | undefined {
  const weeklyAt = event.longTerm && event.longTerm !== true ? event.longTerm.weeklyAt : undefined;
  const match = CLOCK.exec(weeklyAt ?? event.time ?? "");
  return match ? { from: match[1], to: match[2] } : undefined;
}

const dateArray = (date: IsoDate) => date.split("-").map(Number) as DateArray;
const nextDay = (date: IsoDate) => pragueDate(addDays(pragueDateTime(date, "12:00"), 1, { in: inPrague }));
const utcStamp = (instant: Date) => format(instant, "yyyyMMdd'T'HHmmss'Z'", { in: tz("UTC") });

type Timing = Pick<EventAttributes, "start" | "startInputType" | "recurrenceRule"> & { end?: DateTime };

function timing(event: NewsEvent): Timing {
  const { start, end = start, longTerm, sessions } = event;
  const weeklyAt = longTerm && longTerm !== true ? longTerm.weeklyAt : undefined;
  const clock = eventClock(event);
  if (clock) {
    const { from, to } = clock;
    const timed: Timing = {
      start: pragueDateTime(start, from).getTime(),
      startInputType: "utc",
      end: to ? pragueDateTime(start, to).getTime() : undefined,
    };
    if (weeklyAt) {
      return { ...timed, recurrenceRule: `FREQ=WEEKLY;UNTIL=${utcStamp(pragueDateTime(end, "23:59"))}` };
    }
    // A series of N meetings is weekly only when N weeks fit exactly from the first to the last.
    const span = differenceInCalendarDays(pragueDateTime(end, "12:00"), pragueDateTime(start, "12:00"), {
      in: inPrague,
    });
    if (sessions && span === (sessions - 1) * 7) return { ...timed, recurrenceRule: `FREQ=WEEKLY;COUNT=${sessions}` };
    if (end === start) return timed;
  }
  return { start: dateArray(start), end: dateArray(nextDay(end)) };
}

/** iCalendar text of one event, with the detail page's absolute URL. */
export function eventCalendar(event: NewsEvent, url: string): string {
  const { start, startInputType, end, recurrenceRule } = timing(event);
  const attributes = {
    start,
    startInputType,
    ...(end === undefined ? {} : { end }),
    recurrenceRule,
    title: event.title,
    location: event.place,
    description: `${event.lead ?? event.text}\n\n${url}`,
    url,
    uid: `${eventSlug(event)}@farakurim.cz`,
    productId: "farakurim.cz",
  } as EventAttributes;
  const { error, value } = createEvent(attributes);
  if (error || !value) throw error ?? new Error(`No calendar for ${event.id}`);
  return value;
}
