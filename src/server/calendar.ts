import "server-only";
import { newsEntries, scheduleEntries, type DateRange } from "@/lib/calendar/agenda";
import { subYears } from "date-fns";
import { type CalendarLinks, fetchGoogleCalendar, refererInit, toEntries } from "@/lib/calendar/google-calendar";
import { BUILD_TIME } from "@/lib/shared/build-time";
import { pragueDate } from "@/lib/shared/prague";
import { eventEnd, eventHref } from "@/lib/news/events";
import { places, regularServices } from "@/content/masses";
import { events } from "@/content/news";
import { GOOGLE_CALENDAR_API_KEY, parishCalendars, SITE_URL } from "@/content/site";
import type { CalendarEntry, CalendarId } from "@/content/types/calendar";
import { currentExceptions } from "./services";

// The two parish calendars (design/DESIGN.md §16.4), read at build time. Server-only: it imports all Aktuality.

/** Aktuality older than this when the site is built have no calendar entries left to link (keeps the pages short). */
const linkedSince = pragueDate(subYears(BUILD_TIME, 1));

/**
 * How Události events link to detail pages: by the event ID of the records that have one, or by the URL in the
 * event's description, for the records that ended within the last year.
 */
export const calendarLinks: CalendarLinks = {
  byEventId: Object.fromEntries(events.flatMap((e) => (e.calendarEventId ? [[e.calendarEventId, eventHref(e)]] : []))),
  pages: events.filter((e) => eventEnd(e) >= linkedSince).map(eventHref),
};

/**
 * Entries of both calendars in `range`: from Google Calendar when an API key is set, otherwise fallback entries
 * generated from the regular schedule and the Aktuality records. A failing API fails the build, so a deploy
 * never ships an empty calendar.
 */
export async function loadCalendarEntries(range: DateRange): Promise<CalendarEntry[]> {
  if (!GOOGLE_CALENDAR_API_KEY) {
    return [
      ...scheduleEntries({ regular: regularServices, exceptions: currentExceptions }, places, range),
      ...newsEntries(events, eventHref).filter((e) => (e.end ?? e.date) >= range.from && e.date <= range.to),
    ];
  }
  const init = refererInit(SITE_URL);
  const ids = Object.keys(parishCalendars) as CalendarId[];
  const lists = await Promise.all(
    ids.map(async (id) =>
      toEntries(
        await fetchGoogleCalendar(parishCalendars[id].googleId, GOOGLE_CALENDAR_API_KEY!, range, init),
        id,
        calendarLinks,
      ),
    ),
  );
  return lists.flat();
}
