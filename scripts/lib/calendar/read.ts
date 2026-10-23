import { SITE_URL, parishCalendars } from "@/content/site";
import type { NewsEvent } from "@/content/types/news";
import type { IsoDate } from "@/content/types/shared";
import type { DateRange } from "@/lib/calendar/agenda";
import { eventsUrl, parseEventsPage, refererInit, type GoogleEvent } from "@/lib/calendar/google-calendar";
import { desiredEvents } from "./desired";

// Reads the Události calendar as the sync sees it: the expanded events (deleted ones too, to know what is gone)
// and the repeating events themselves.

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
  range: DateRange,
  options: { singleEvents?: boolean; showDeleted?: boolean },
): Promise<GoogleEvent[]> {
  const calendarId = parishCalendars.events.googleId;
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

/** The calendar's events in `range`: the expanded ones with the deleted, and the repeating ones. */
export async function readSnapshot(access: CalendarAccess, range: DateRange): Promise<CalendarSnapshot> {
  const instances = await readAll(access, range, { showDeleted: true });
  const all = await readAll(access, range, { singleEvents: false });
  return { instances, masters: all.filter((event) => event.recurrence) };
}
