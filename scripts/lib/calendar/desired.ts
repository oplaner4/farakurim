import { addMilliseconds } from "date-fns";
import { SITE_URL } from "@/content/site";
import type { NewsEvent } from "@/content/types/news";
import type { IsoDate } from "@/content/types/shared";
import type { GoogleEvent } from "@/lib/calendar/google-calendar";
import { eventHref } from "@/lib/news/events";
import { nextDay, utcStamp } from "@/lib/news/ics";
import { eventEnd, meetingsOf, type Meeting } from "@/lib/news/timing";
import { pragueDateTime } from "@/lib/shared/prague";
import { pragueTime, type GoogleEventBody } from "./google-body";

// What the Události calendar should hold for an event record: one Google event per meeting, or one repeating event
// for a weekly long-term event. The fields mirror the `.ics` of `src/lib/news/ics.ts`.

export type DesiredEvent = {
  newsId: string;
  /** The meeting's start, or "weekly" for a weekly long-term event. */
  key: IsoDate | "weekly";
  googleId: string;
  meeting: Meeting;
  /** The event's last day, for a weekly one. */
  weeklyUntil?: IsoDate;
  /** The title, with the "Zrušeno: " prefix for a cancelled meeting. */
  summary: string;
  location?: string;
  description: string;
};

const CANCELLED_PREFIX = "Zrušeno: ";

/** A deterministic Google event id: lowercase hex of `<id>/<key>`, valid in Google's base32hex alphabet. */
export const calendarEventId = (newsId: string, key: IsoDate | "weekly"): string =>
  Buffer.from(`${newsId}/${key}`, "utf8").toString("hex");

/** The Google events an event record should have: the meetings that are not over, the weekly one, or none. */
export function desiredEvents(event: NewsEvent, today: IsoDate): DesiredEvent[] {
  const weekly = !event.sessions && event.longTerm && event.longTerm !== true;
  if (event.longTerm === true && !event.sessions) return [];
  const url = `${SITE_URL}${eventHref(event)}`;
  return meetingsOf(event)
    .filter((meeting) => (weekly ? eventEnd(event) : meeting.end) >= today)
    .map((meeting) => {
      const key = weekly ? "weekly" : meeting.start;
      return {
        newsId: event.id,
        key,
        googleId: calendarEventId(event.id, key),
        meeting,
        ...(weekly && { weeklyUntil: eventEnd(event) }),
        summary: meeting.cancelled ? `${CANCELLED_PREFIX}${event.title}` : event.title,
        ...(event.place && { location: event.place }),
        description: `${event.lead ?? event.text}\n\n${url}`,
      };
    });
}

/** The Google event of a desired one; `current` (the event as Google has it) gives the duration to keep. */
export function eventBody(desired: DesiredEvent, current?: GoogleEvent): GoogleEventBody {
  const { meeting, weeklyUntil, summary, location, description } = desired;
  const { start, end, startTime, endTime } = meeting;
  const body = { summary, ...(location && { location }), description };
  // A single day with a start time is timed; anything longer, or without one, is all-day (as the `.ics`).
  if (!startTime || start !== end) {
    return { ...body, start: { date: start }, end: { date: nextDay(end) } };
  }
  const startAt = pragueDateTime(start, startTime);
  const currentStart = current?.start.dateTime;
  const currentEnd = current?.end.dateTime;
  const kept = currentStart && currentEnd ? new Date(currentEnd).getTime() - new Date(currentStart).getTime() : 0;
  const endAt = endTime ? pragueDateTime(start, endTime) : addMilliseconds(startAt, kept);
  return {
    ...body,
    start: pragueTime(startAt),
    end: pragueTime(endAt),
    ...(weeklyUntil && {
      recurrence: [`RRULE:FREQ=WEEKLY;UNTIL=${utcStamp(pragueDateTime(weeklyUntil, "23:59"))}`],
    }),
  };
}
