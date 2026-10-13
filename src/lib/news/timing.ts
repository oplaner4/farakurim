import { differenceInCalendarDays } from "date-fns";
import type { EventTimes, NewsEvent } from "@/content/types/news";
import type { ClockTime, IsoDate } from "@/content/types/shared";
import { atClockTime, formatShortDate, plural, relativeDayName } from "@/lib/shared/czech";
import { inPrague, pragueDate, pragueDateTime } from "@/lib/shared/prague";

// When an event takes place: its days, meetings and clock times, and where it is now (design/DESIGN.md §11.7).
// ISO dates (`YYYY-MM-DD`) compare correctly as strings, so the date maths here stays on strings.

export const eventEnd = (event: Pick<NewsEvent, "start" | "end">): IsoDate => event.end ?? event.start;

/** The label of a finished and a running event: card tags, the "Proběhlo" group and the detail page. */
export const EVENT_STATUS_LABEL = { past: "Proběhlo", now: "Právě probíhá" } as const;

/** Finished from the day after its last day (by date, so it moves to "Proběhlo" at midnight). */
export const isPast = (event: Pick<NewsEvent, "start" | "end">, today: IsoDate) => eventEnd(event) < today;

/** Cancelled (§11.9): the event does not take place, though its record and detail page stay. */
export const isCancelled = (event: Pick<NewsEvent, "change">) => event.change?.status === "cancelled";

/** The clock times of an event or meeting, without the keys it does not have. */
export const timesOf = ({ startTime, endTime }: EventTimes): EventTimes => ({
  ...(startTime && { startTime }),
  ...(endTime && { endTime }),
});

/** The clock times of an event; a weekly series meets at `weeklyAt`. */
export const eventTimes = (event: Pick<NewsEvent, "longTerm"> & EventTimes): EventTimes =>
  event.longTerm && event.longTerm !== true ? { startTime: event.longTerm.weeklyAt } : timesOf(event);

/**
 * A meeting of a series with its defaults filled in: its last day and its clock times. `cancelled` when it does not
 * take place (the whole event cancelled, or the meeting dropped).
 */
export type Meeting = { start: IsoDate; end: IsoDate; cancelled?: true } & EventTimes;

/** The meetings of a series (`sessions`), empty for other events. A meeting's own times replace both of the event's. */
export function eventMeetings(
  event: Pick<NewsEvent, "sessions"> & EventTimes & Partial<Pick<NewsEvent, "change" | "cancelledMeetings">>,
): Meeting[] {
  const dropped = new Set(event.cancelledMeetings?.dates);
  return (event.sessions ?? []).map((session): Meeting => {
    const meeting =
      typeof session === "string"
        ? { start: session, end: session, ...timesOf(event) }
        : { start: session.date, end: session.end ?? session.date, ...timesOf(session.startTime ? session : event) };
    return isCancelled(event) || dropped.has(meeting.start) ? { ...meeting, cancelled: true } : meeting;
  });
}

/** The fields that say when an event takes place (what a client component needs for its progress). */
export type EventTiming = Pick<NewsEvent, "start" | "end" | "startTime" | "endTime" | "sessions" | "longTerm"> &
  Partial<Pick<NewsEvent, "change" | "cancelledMeetings">>;

/** The days the event takes place: each meeting of a series, the first day of a weekly one, else its span. */
export function meetingsOf(event: EventTiming): Meeting[] {
  if (event.sessions) return eventMeetings(event);
  const cancelled = isCancelled(event) && { cancelled: true as const };
  if (event.longTerm && event.longTerm !== true) {
    return [{ start: event.start, end: event.start, startTime: event.longTerm.weeklyAt, ...cancelled }];
  }
  return [{ start: event.start, end: eventEnd(event), ...timesOf(event), ...cancelled }];
}

/**
 * Where a started event is right now (§11.6), computed, never stored: running (`now`), a meeting later today
 * (`today`), or a series between its meetings (`next`). Undefined before it starts, after it ends, and for
 * long-term and cancelled events.
 */
export type EventProgress = { kind: "now" } | { kind: "today"; time: ClockTime } | { kind: "next"; date: IsoDate };

/**
 * A meeting on one day with a start time runs from its start time to its end time (or to midnight without one);
 * otherwise it runs all of its days. Dropped meetings are skipped.
 */
export function eventProgress(event: EventTiming, now: number): EventProgress | undefined {
  if (event.longTerm || isCancelled(event)) return undefined;
  const today = pragueDate(now);
  for (const meeting of meetingsOf(event)) {
    if (meeting.cancelled || meeting.end < today) continue;
    if (meeting.start > today) return event.start <= today ? { kind: "next", date: meeting.start } : undefined;
    const { startTime, endTime } = meeting;
    if (meeting.start !== meeting.end || !startTime) return { kind: "now" };
    if (now < pragueDateTime(today, startTime).getTime()) return { kind: "today", time: startTime };
    if (!endTime || now < pragueDateTime(today, endTime).getTime()) return { kind: "now" };
    // Today's meeting is over: the next one, if any.
  }
  return undefined;
}

/** "Právě probíhá", "Dnes v 18:00", "Další setkání 25. 10." */
export function progressLabel(progress: EventProgress): string {
  switch (progress.kind) {
    case "now":
      return EVENT_STATUS_LABEL.now;
    case "today":
      return `Dnes ${atClockTime(progress.time)}`;
    case "next":
      return `Další setkání ${formatShortDate(progress.date)}`;
  }
}

/**
 * Relative label of a detail page (§13.1) at the instant `now`: "Za 15 dní", "Za 3 dny", "Zítra" (by Prague calendar
 * days), then "Dnes", "Právě probíhá" (also a started long-term event), "Další setkání 25. 10.", and "Proběhlo".
 */
export function relativeEventLabel(event: EventTiming, now: number): string {
  const { start } = event;
  const today = pragueDate(now);
  if (isPast(event, today)) return EVENT_STATUS_LABEL.past;
  if (start <= today) {
    if (event.longTerm) return EVENT_STATUS_LABEL.now;
    const progress = eventProgress(event, now);
    if (progress?.kind === "next") return progressLabel(progress);
    // One day without a start time stays "Dnes"; so does the rest of the day after today's last meeting.
    const known = eventEnd(event) > start || event.startTime;
    return progress?.kind === "now" && known ? progressLabel(progress) : "Dnes";
  }
  const days = differenceInCalendarDays(pragueDateTime(start, "12:00"), pragueDateTime(today, "12:00"), {
    in: inPrague,
  });
  return relativeDayName(days) ?? `Za ${days} ${plural(days, ["den", "dny", "dní"])}`;
}
