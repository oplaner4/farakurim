import { newsEntries, scheduleEntries, type DateRange } from "@/lib/calendar/agenda";
import { fetchGoogleCalendar, toEntries } from "@/lib/calendar/google-calendar";
import { eventHref } from "@/lib/news/events";
import { places, regularServices } from "./masses";
import { scheduleExceptions } from "./ohlasky";
import { events } from "./news";
import { GOOGLE_CALENDAR_API_KEY, parishCalendars, SITE_URL } from "./site";
import type { CalendarEntry, CalendarId } from "@/content/types/calendar";

// The two parish calendars (design/DESIGN.md §16.4), read at build time. Server-only: it imports all Aktuality.

/** Event ID in the Události calendar → detail page, for the Aktuality records that have one. */
export const calendarHrefs: Record<string, string> = Object.fromEntries(
  events.flatMap((e) => (e.calendarEventId ? [[e.calendarEventId, eventHref(e)]] : [])),
);

/**
 * Entries of both calendars in `range`: from Google Calendar when an API key is set, otherwise mock entries
 * generated from the regular schedule and the Aktuality records. A failing API fails the build, so a deploy
 * never ships an empty calendar.
 */
export async function loadCalendarEntries(range: DateRange): Promise<CalendarEntry[]> {
  if (!GOOGLE_CALENDAR_API_KEY) {
    return [
      ...scheduleEntries({ regular: regularServices, exceptions: scheduleExceptions }, places, range),
      ...newsEntries(events, eventHref).filter((e) => (e.end ?? e.date) >= range.from && e.date <= range.to),
    ];
  }
  const hrefs = new Map(Object.entries(calendarHrefs));
  // The key is restricted to the site's referrer, which a build has to send itself.
  const init = { headers: { Referer: `${SITE_URL}/` } };
  const ids = Object.keys(parishCalendars) as CalendarId[];
  const lists = await Promise.all(
    ids.map(async (id) =>
      toEntries(
        await fetchGoogleCalendar(parishCalendars[id].googleId, GOOGLE_CALENDAR_API_KEY!, range, init),
        id,
        hrefs,
      ),
    ),
  );
  return lists.flat();
}
