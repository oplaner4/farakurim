import { tz } from "@date-fns/tz";
import { addDays, format } from "date-fns";
import { createEvents, type DateArray, type DateTime, type EventAttributes } from "ics";
import type { NewsEvent } from "@/content/types/news";
import type { ClockTime, IsoDate } from "@/content/types/shared";
import { eventMeetings, eventSlug, type Meeting } from "./events";
import { inPrague, pragueDate, pragueDateTime } from "@/lib/shared/prague";

// "Přidat do kalendáře" (design/DESIGN.md §13.2): one .ics file per event, generated at build time.
// Times are Prague wall-clock and written in UTC, so no VTIMEZONE block is needed.

/** "9:30" or "18:00–20:30"; other time texts ("po mši") make the event all-day. */
const CLOCK = /^(\d{1,2}:\d{2})(?:\s*[–-]\s*(\d{1,2}:\d{2}))?$/;

/** Start (and end) time of a time text, if it is a clock time. */
export function parseClock(time: string | undefined): { from: ClockTime; to?: ClockTime } | undefined {
  const match = CLOCK.exec(time ?? "");
  return match ? { from: match[1], to: match[2] } : undefined;
}

/** Start (and end) time of a single-day event's or weekly series' time text, if it is a clock time. */
export function eventClock(event: NewsEvent): { from: ClockTime; to?: ClockTime } | undefined {
  const weeklyAt = event.longTerm && event.longTerm !== true ? event.longTerm.weeklyAt : undefined;
  return parseClock(weeklyAt ?? event.time);
}

const dateArray = (date: IsoDate) => date.split("-").map(Number) as DateArray;
const nextDay = (date: IsoDate) => pragueDate(addDays(pragueDateTime(date, "12:00"), 1, { in: inPrague }));
const utcStamp = (instant: Date) => format(instant, "yyyyMMdd'T'HHmmss'Z'", { in: tz("UTC") });

type Timing = Pick<EventAttributes, "start" | "startInputType" | "recurrenceRule"> & { end?: DateTime };

/** A single day with a clock time is timed; anything longer, or with another time text, is all-day. */
function timing({ start, end, time }: Meeting): Timing {
  const clock = parseClock(time);
  if (clock && end === start) {
    const { from, to } = clock;
    return {
      start: pragueDateTime(start, from).getTime(),
      startInputType: "utc",
      end: to ? pragueDateTime(start, to).getTime() : undefined,
    };
  }
  return { start: dateArray(start), end: dateArray(nextDay(end)) };
}

/**
 * The VEVENTs of an event: one per meeting of a series (each with its own UID, or calendar apps keep only one),
 * one that repeats for a weekly long-term event, otherwise one.
 */
function occurrences(event: NewsEvent): (Timing & { uid: string })[] {
  const { start, end = start, longTerm } = event;
  const slug = eventSlug(event);
  if (event.sessions) {
    return eventMeetings(event).map((meeting) => ({
      ...timing(meeting),
      uid: `${slug}-${meeting.start}@farakurim.cz`,
    }));
  }
  const uid = `${slug}@farakurim.cz`;
  if (longTerm && longTerm !== true) {
    const until = utcStamp(pragueDateTime(end, "23:59"));
    return [
      { ...timing({ start, end: start, time: longTerm.weeklyAt }), recurrenceRule: `FREQ=WEEKLY;UNTIL=${until}`, uid },
    ];
  }
  return [{ ...timing({ start, end, time: event.time }), uid }];
}

/** iCalendar text of one event, with the detail page's absolute URL. */
export function eventCalendar(event: NewsEvent, url: string): string {
  const attributes = occurrences(event).map(
    ({ start, startInputType, end, recurrenceRule, uid }) =>
      ({
        start,
        startInputType,
        ...(end === undefined ? {} : { end }),
        recurrenceRule,
        title: event.title,
        location: event.place,
        description: `${event.lead ?? event.text}\n\n${url}`,
        url,
        uid,
      }) as EventAttributes,
  );
  const { error, value } = createEvents(attributes, { productId: "farakurim.cz" });
  if (error || !value) throw error ?? new Error(`No calendar for ${event.id}`);
  return value;
}
