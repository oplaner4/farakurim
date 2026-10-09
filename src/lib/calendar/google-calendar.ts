import { addDays, format, subMinutes } from "date-fns";
import * as z from "zod";
import type { CalendarEntry, CalendarId } from "@/content/types/calendar";
import type { DateRange } from "./agenda";
import { inPrague, pragueDate, pragueDateTime } from "@/lib/shared/prague";
import { links as siteLinks, SITE_URL } from "@/content/site";

// Reads the parish's public Google Calendars with the Calendar API (`events.list`, design/DESIGN.md §16.4).
// `singleEvents=true` makes Google expand recurring events and apply their exceptions, so no RRULE handling
// is needed here. Runs at build time and in the browser (the key is restricted to the site's referrer).
// An event of the Události calendar links to an Aktuality detail page when its description holds the page's URL
// (pasted, or imported with the page's "Přidat do kalendáře" file).

const API = "https://www.googleapis.com/calendar/v3/calendars";

/** An all-day event has `date` ("2026-10-05"), a timed one `dateTime` (RFC 3339). */
const googleTime = z.object({ date: z.iso.date().optional(), dateTime: z.iso.datetime({ offset: true }).optional() });

/** The fields of an `events.list` item the calendars use; Google's other fields are dropped. */
const googleEvent = z.object({
  id: z.string(),
  recurringEventId: z.string().optional(),
  status: z.string().optional(),
  summary: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  start: googleTime,
  end: googleTime,
});

export type GoogleEvent = z.infer<typeof googleEvent>;

/** One result page; the items are checked one by one, so a malformed event is left out instead of the calendar. */
const googleEventsPage = z.object({
  items: z.array(z.unknown()).optional(),
  nextPageToken: z.string().optional(),
});

/** The events of a result page, without the ones that do not match `googleEvent`; throws for anything else. */
export function parseEventsPage(json: unknown): { events: GoogleEvent[]; nextPageToken?: string } {
  const page = googleEventsPage.parse(json);
  const events = (page.items ?? []).flatMap((item) => {
    const event = googleEvent.safeParse(item);
    return event.success ? [event.data] : [];
  });
  return { events, nextPageToken: page.nextPageToken };
}

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

/**
 * Fetch options for the API outside the browser: the key is restricted to the site's referrer, which a build or a
 * script has to send itself.
 */
export const refererInit = (siteUrl: string): RequestInit => ({ headers: { Referer: `${siteUrl}/` } });

const SITE_HOST = new URL(SITE_URL).host.replace(/^www\./, "").replaceAll(".", "\\.");
// The site's URL (with or without the scheme and www.), or a bare root-relative path, then /aktuality/<id>.
const PAGE_URL = new RegExp(
  `(?<![\\w.-])(?:(?:https?://)?(?:www\\.)?${SITE_HOST}|(?<![\\w./:-]))(${siteLinks.news}[a-z0-9-]+)/?`,
  "g",
);

/** The Aktuality detail paths ("/aktuality/<id>/") an event description links to, also inside Google's HTML. */
export const aktualitaPaths = (description: string | undefined): string[] =>
  [...(description ?? "").matchAll(PAGE_URL)].map((m) => `${m[1]}/`);

const dayBefore = (date: string) => pragueDate(addDays(pragueDateTime(date, "12:00"), -1, { in: inPrague }));

/** The Prague days of an event (`end` only when it spans several days) and its start time, if it is timed. */
export function eventDays({ start, end }: GoogleEvent): { date: string; end?: string; time?: string } | undefined {
  if (start.date) {
    // All-day events end on the day after their last day.
    const last = end.date ? dayBefore(end.date) : start.date;
    return { date: start.date, ...(last > start.date && { end: last }) };
  }
  if (!start.dateTime) return undefined;
  const date = pragueDate(new Date(start.dateTime));
  // An event ending at midnight belongs to the day before.
  const last = end.dateTime ? pragueDate(subMinutes(new Date(end.dateTime), 1)) : date;
  const time = format(new Date(start.dateTime), "H:mm", { in: inPrague });
  return { date, time, ...(last > date && { end: last }) };
}

/**
 * Turns Google events into calendar entries. An Události event links to the first of `linkablePages` (the built
 * Aktuality detail pages) its description links to; a page not built yet is left out, so a URL pasted before the
 * release links nothing instead of a missing page.
 */
export function toEntries(events: GoogleEvent[], calendar: CalendarId, linkablePages: string[]): CalendarEntry[] {
  const pages = new Set(linkablePages);
  return events.flatMap((event): CalendarEntry[] => {
    if (event.status === "cancelled") return [];
    const days = eventDays(event);
    if (!days) return [];
    const href = calendar === "events" ? aktualitaPaths(event.description).find((path) => pages.has(path)) : undefined;
    return [
      {
        id: event.id,
        calendar,
        title: event.summary?.trim() || "Bez názvu",
        ...(event.location && { place: event.location }),
        ...(href && { href }),
        ...days,
      },
    ];
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
    const page = parseEventsPage(await response.json());
    events.push(...page.events);
    pageToken = page.nextPageToken;
  } while (pageToken);
  return events;
}
