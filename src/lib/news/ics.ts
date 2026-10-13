import { tz } from "@date-fns/tz";
import { addDays, format } from "date-fns";
import { createEvents, type DateArray, type DateTime, type EventAttributes } from "ics";
import { SITE_HOST } from "@/content/site";
import type { NewsEvent } from "@/content/types/news";
import type { ClockTime, IsoDate } from "@/content/types/shared";
import { eventEnd, meetingsOf, type Meeting, parseClock } from "./events";
import { inPrague, pragueDate, pragueDateTime } from "@/lib/shared/prague";

// "Přidat do kalendáře" (design/DESIGN.md §13.2): one .ics file per event, generated at build time.
// Times are Prague wall-clock and written in UTC, so no VTIMEZONE block is needed.

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
function occurrences(event: NewsEvent): (Timing & Pick<EventAttributes, "status" | "sequence"> & { uid: string })[] {
  const weekly = !event.sessions && event.longTerm && event.longTerm !== true;
  const until = utcStamp(pragueDateTime(eventEnd(event), "23:59"));
  return meetingsOf(event).map((meeting) => ({
    ...timing(meeting),
    ...(weekly && { recurrenceRule: `FREQ=WEEKLY;UNTIL=${until}` }),
    // A calendar app that imported the file takes a VEVENT with the same UID and a higher SEQUENCE as its update
    // (§11.9): a move keeps it with the new date, a cancellation (2, after a possible move) marks it cancelled.
    ...(meeting.cancelled
      ? { status: "CANCELLED" as const, sequence: 2 }
      : event.change?.status === "moved" && { sequence: 1 }),
    uid: event.sessions ? `${event.id}-${meeting.start}@${SITE_HOST}` : `${event.id}@${SITE_HOST}`,
  }));
}

/** iCalendar text of one event, with the detail page's absolute URL. */
export function eventCalendar(event: NewsEvent, url: string): string {
  const attributes = occurrences(event).map(
    ({ start, startInputType, end, recurrenceRule, status, sequence, uid }) =>
      ({
        start,
        startInputType,
        ...(end === undefined ? {} : { end }),
        recurrenceRule,
        status,
        sequence,
        title: event.title,
        location: event.place,
        description: `${event.lead ?? event.text}\n\n${url}`,
        url,
        uid,
      }) as EventAttributes,
  );
  const { error, value } = createEvents(attributes, { productId: SITE_HOST });
  if (error || !value) throw error ?? new Error(`No calendar for ${event.id}`);
  return value;
}
