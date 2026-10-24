import { SITE_URL } from "@/content/site";
import type { NewsEvent } from "@/content/types/news";
import type { IsoDate } from "@/content/types/shared";
import type { DateRange } from "@/lib/calendar/agenda";
import { eventsUrl, parseEventsPage, refererInit, type GoogleEvent } from "@/lib/calendar/google-calendar";
import { desiredEvents } from "./desired";

// Reads a parish calendar as the sync sees it (the Události one with its repeating events): the expanded events and the repeating events themselves, both
// with the deleted ones, to know what is gone.

export type CalendarSnapshot = { instances: GoogleEvent[]; masters: GoogleEvent[] };

export type CalendarAccess = { apiKey: string } | { token: string };

/** From 1 January of today's year to 31 December of the year of the latest meeting still to come. */
export function snapshotRange(events: NewsEvent[], today: IsoDate): DateRange {
  const year = Number(today.slice(0, 4));
  const lastYears = events.flatMap((event) =>
    desiredEvents(event, today).map(({ meeting, weeklyUntil }) => Number((weeklyUntil ?? meeting.end).slice(0, 4))),
  );
  const last = Math.max(year, ...lastYears);
  return { from: `${year}-01-01`, to: `${last}-12-31` };
}

async function readAll(
  access: CalendarAccess,
  calendarId: string,
  range: DateRange,
  options: { singleEvents?: boolean; showDeleted?: boolean },
): Promise<GoogleEvent[]> {
  const apiKey = "apiKey" in access ? access.apiKey : undefined;
  const init: RequestInit =
    "token" in access ? { headers: { Authorization: `Bearer ${access.token}` } } : refererInit(SITE_URL);
  const events: GoogleEvent[] = [];
  let pageToken: string | undefined;
  do {
    const response = await fetch(eventsUrl(calendarId, apiKey, range, pageToken, options), init);
    if (!response.ok) throw new Error(`Google Calendar ${calendarId}: HTTP ${response.status}`);
    const page = parseEventsPage(await response.json());
    events.push(...page.events);
    pageToken = page.nextPageToken;
  } while (pageToken);
  return events;
}

/** The events of calendar `calendarId` in `range`, expanded, with the deleted ones. */
export const readInstances = (access: CalendarAccess, calendarId: string, range: DateRange): Promise<GoogleEvent[]> =>
  readAll(access, calendarId, range, { showDeleted: true });

/** The calendar's events in `range`: the expanded ones, and the repeating ones, both with the deleted. */
export async function readSnapshot(
  access: CalendarAccess,
  calendarId: string,
  range: DateRange,
): Promise<CalendarSnapshot> {
  const instances = await readInstances(access, calendarId, range);
  const all = await readAll(access, calendarId, range, { singleEvents: false, showDeleted: true });
  return { instances, masters: all.filter((event) => event.recurrence || event.status === "cancelled") };
}
