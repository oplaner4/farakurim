import { addDays, format, subMinutes } from "date-fns";
import type { CalendarEntry, CalendarId } from "@/content/types/calendar";
import type { DateRange } from "./agenda";
import { inPrague, pragueDate, pragueDateTime } from "@/lib/shared/prague";

// Reads the parish's public Google Calendars with the Calendar API (`events.list`, design/DESIGN.md §16.4).
// `singleEvents=true` makes Google expand recurring events and apply their exceptions, so no RRULE handling
// is needed here. Runs at build time and in the browser (the key is restricted to the site's referrer).

const API = "https://www.googleapis.com/calendar/v3/calendars";

type GoogleTime = { date?: string; dateTime?: string };

export type GoogleEvent = {
  id: string;
  recurringEventId?: string;
  status?: string;
  summary?: string;
  location?: string;
  start: GoogleTime;
  end: GoogleTime;
};

type GoogleEventsPage = { items?: GoogleEvent[]; nextPageToken?: string };

/** `events.list` URL for the days of `range` (Prague time). */
export function eventsUrl(calendarId: string, apiKey: string, { from, to }: DateRange, pageToken?: string): string {
  const params = new URLSearchParams({
    key: apiKey,
    singleEvents: "true",
    orderBy: "startTime",
    timeZone: "Europe/Prague",
    maxResults: "2500",
    timeMin: pragueDateTime(from, "0:00").toISOString(),
    timeMax: addDays(pragueDateTime(to, "0:00"), 1, { in: inPrague }).toISOString(),
  });
  if (pageToken) params.set("pageToken", pageToken);
  return `${API}/${encodeURIComponent(calendarId)}/events?${params}`;
}

const dayBefore = (date: string) => pragueDate(addDays(pragueDateTime(date, "12:00"), -1, { in: inPrague }));

/**
 * Turns Google events into calendar entries. `hrefs` maps an event ID (a recurring event's series ID) to the
 * detail page of the matching Aktuality record.
 */
export function toEntries(events: GoogleEvent[], calendar: CalendarId, hrefs: Map<string, string>): CalendarEntry[] {
  return events.flatMap((event): CalendarEntry[] => {
    if (event.status === "cancelled") return [];
    const href = hrefs.get(event.recurringEventId ?? event.id);
    const base = {
      id: event.id,
      calendar,
      title: event.summary?.trim() || "Bez názvu",
      ...(event.location && { place: event.location }),
      ...(href && { href }),
    };
    const { start, end } = event;
    if (start.date) {
      // All-day events end on the day after their last day.
      const last = end.date ? dayBefore(end.date) : start.date;
      return [{ ...base, date: start.date, ...(last > start.date && { end: last }) }];
    }
    if (!start.dateTime) return [];
    const date = pragueDate(new Date(start.dateTime));
    // An event ending at midnight belongs to the day before.
    const last = end.dateTime ? pragueDate(subMinutes(new Date(end.dateTime), 1)) : date;
    const time = format(new Date(start.dateTime), "H:mm", { in: inPrague });
    return [{ ...base, date, time, ...(last > date && { end: last }) }];
  });
}

/** All events of one calendar in `range`, following the result pages. Throws when the API fails. */
export async function fetchGoogleCalendar(
  calendarId: string,
  apiKey: string,
  range: DateRange,
  init?: RequestInit,
): Promise<GoogleEvent[]> {
  const events: GoogleEvent[] = [];
  let pageToken: string | undefined;
  do {
    const response = await fetch(eventsUrl(calendarId, apiKey, range, pageToken), init);
    if (!response.ok) throw new Error(`Google Calendar ${calendarId}: HTTP ${response.status}`);
    const page = (await response.json()) as GoogleEventsPage;
    events.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return events;
}
