import { addDays, format, subMinutes } from "date-fns";
import * as z from "zod/mini";
import type { CalendarEntry, CalendarId } from "@/content/types/calendar";
import type { DateRange } from "./agenda";
import { inPrague, pragueDate, pragueDateTime } from "@/lib/shared/prague";
import { links as siteLinks, SITE_HOST } from "@/content/site";

// Reads the parish's public Google Calendars with the Calendar API (`events.list`, design/DESIGN.md §16.4).
// `singleEvents=true` makes Google expand recurring events and apply their exceptions, so no RRULE handling
// is needed here. Runs at build time and in the browser (the key is restricted to the site's referrer); zod/mini
// keeps the browser bundle small.
// An event of the Události calendar links to an event detail page when its description holds the page's URL
// (pasted, or imported with the page's "Přidat do kalendáře" file).

const API = "https://www.googleapis.com/calendar/v3/calendars";

/** An all-day event has `date` ("2026-10-05"), a timed one `dateTime` (RFC 3339). */
const googleTime = z.object({
  date: z.optional(z.iso.date()),
  dateTime: z.optional(z.iso.datetime({ offset: true })),
});

const googleFields = {
  id: z.string(),
  recurringEventId: z.optional(z.string()),
  status: z.optional(z.string()),
  summary: z.optional(z.string()),
  location: z.optional(z.string()),
  description: z.optional(z.string()),
  recurrence: z.optional(z.array(z.string())),
};

/** The fields of an `events.list` item the calendars use; Google's other fields are dropped. */
const googleEvent = z.object({ ...googleFields, start: googleTime, end: googleTime });

/** A deleted event: Google guarantees only its `id`, so a missing `start` or `end` becomes an empty time. */
const cancelledEvent = z.object({
  ...googleFields,
  status: z.literal("cancelled"),
  start: z._default(googleTime, {}),
  end: z._default(googleTime, {}),
});

export type GoogleEvent = z.infer<typeof googleEvent>;

/** One result page; the items are checked one by one, so a malformed event is left out instead of the calendar. */
const googleEventsPage = z.object({
  items: z.optional(z.array(z.unknown())),
  nextPageToken: z.optional(z.string()),
});

/** The events of a result page, without the ones that do not match `googleEvent`; throws for anything else. */
export function parseEventsPage(json: unknown): { events: GoogleEvent[]; nextPageToken?: string } {
  const page = googleEventsPage.parse(json);
  const events = (page.items ?? []).flatMap((item) => {
    const event = googleEvent.safeParse(item);
    if (event.success) return [event.data];
    const cancelled = cancelledEvent.safeParse(item);
    return cancelled.success ? [cancelled.data] : [];
  });
  return { events, nextPageToken: page.nextPageToken };
}

/**
 * `events.list` URL for the days of `range` (Prague time). By default Google expands recurring events
 * (`singleEvents`) and leaves out deleted ones; without `apiKey` the request is meant to carry a token instead.
 */
export function eventsUrl(
  calendarId: string,
  apiKey: string | undefined,
  { from, to }: DateRange,
  pageToken?: string,
  { singleEvents = true, showDeleted = false }: { singleEvents?: boolean; showDeleted?: boolean } = {},
): string {
  const params = new URLSearchParams({
    singleEvents: String(singleEvents),
    timeZone: "Europe/Prague",
    maxResults: "2500",
    timeMin: pragueDateTime(from, "0:00").toISOString(),
    timeMax: addDays(pragueDateTime(to, "0:00"), 1, { in: inPrague }).toISOString(),
  });
  if (apiKey) params.set("key", apiKey);
  // Google accepts `orderBy=startTime` only for expanded events.
  if (singleEvents) params.set("orderBy", "startTime");
  if (showDeleted) params.set("showDeleted", "true");
  if (pageToken) params.set("pageToken", pageToken);
  return `${API}/${encodeURIComponent(calendarId)}/events?${params}`;
}

/**
 * Fetch options for the API outside the browser: the key is restricted to the site's referrer, which a build or a
 * script has to send itself.
 */
export const refererInit = (siteUrl: string): RequestInit => ({ headers: { Referer: `${siteUrl}/` } });

const SITE_HOST_PATTERN = SITE_HOST.replace(/^www\./, "").replaceAll(".", "\\.");
// The site's URL (with or without the scheme and www.), or a bare root-relative path, then /aktuality/<id>.
const PAGE_URL = new RegExp(
  `(?<![\\w.-])(?:(?:https?://)?(?:www\\.)?${SITE_HOST_PATTERN}|(?<![\\w./:-]))(${siteLinks.news}[a-z0-9-]+)/?`,
  "g",
);

/** The event detail paths ("/aktuality/<id>/") an event description links to, also inside Google's HTML. */
export const eventPaths = (description: string | undefined): string[] =>
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

/** "Zrušeno: " at the start of a Google event's title, in any case. */
const CANCELLED_PREFIX = /^zrušeno\s*:\s*/i;

/**
 * A Google event's title without its "Zrušeno: " prefix, and whether it had one: the parish keeps a cancelled event
 * and prefixes its title (§16.4), so the prefix is the cancelled status.
 */
export function parseTitle(summary: string | undefined): { title: string; cancelled: boolean } {
  const trimmed = summary?.trim() ?? "";
  const prefix = CANCELLED_PREFIX.exec(trimmed);
  return { title: prefix ? trimmed.slice(prefix[0].length) : trimmed, cancelled: prefix !== null };
}

/**
 * Turns Google events into calendar entries. An Události event links to the first of `linkablePages` (the built
 * event detail pages) its description links to; a page not built yet is left out, so a URL pasted before the
 * release links nothing instead of a missing page.
 */
export function toEntries(events: GoogleEvent[], calendar: CalendarId, linkablePages: string[]): CalendarEntry[] {
  const pages = new Set(linkablePages);
  return events.flatMap((event): CalendarEntry[] => {
    if (event.status === "cancelled") return [];
    const days = eventDays(event);
    if (!days) return [];
    const href = calendar === "events" ? eventPaths(event.description).find((path) => pages.has(path)) : undefined;
    const { title, cancelled } = parseTitle(event.summary);
    return [
      {
        id: event.id,
        calendar,
        title: title || "Bez názvu",
        ...(cancelled && { cancelled: true as const }),
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
