"use client";

import { useEffect, useState } from "react";
import type { CalendarEntry, CalendarId } from "@/content/types";
import { GOOGLE_CALENDAR_API_KEY, parishCalendars } from "@/content/site";
import type { DateRange } from "./agenda";
import { fetchGoogleCalendar, toEntries } from "./google-calendar";

// The prerendered calendars hold the entries of the build. With an API key, the browser re-reads the range it
// shows from Google Calendar, so changes appear without a redeploy; until then (or when Google fails) the
// build's entries stay. Ranges already read are kept for the page's lifetime.

const cache = new Map<string, Promise<CalendarEntry[]>>();

function readRange(range: DateRange, hrefs: Record<string, string>): Promise<CalendarEntry[]> {
  const key = `${range.from}/${range.to}`;
  let entries = cache.get(key);
  if (!entries) {
    const links = new Map(Object.entries(hrefs));
    const ids = Object.keys(parishCalendars) as CalendarId[];
    entries = Promise.all(
      ids.map(async (id) =>
        toEntries(await fetchGoogleCalendar(parishCalendars[id].googleId, GOOGLE_CALENDAR_API_KEY!, range), id, links),
      ),
    ).then((lists) => lists.flat());
    // A failed read is tried again the next time the range is shown.
    entries.catch(() => cache.delete(key));
    cache.set(key, entries);
  }
  return entries;
}

/**
 * Entries for `range`: the prerendered `initial` ones, replaced by Google Calendar's once read. `hrefs` maps
 * event IDs to Aktuality detail pages.
 */
export function useCalendarEntries(
  initial: CalendarEntry[],
  range: DateRange,
  hrefs: Record<string, string>,
): CalendarEntry[] {
  const key = `${range.from}/${range.to}`;
  const [loaded, setLoaded] = useState<{ key: string; entries: CalendarEntry[] } | null>(null);

  useEffect(() => {
    if (!GOOGLE_CALENDAR_API_KEY) return;
    let current = true;
    readRange({ from: range.from, to: range.to }, hrefs).then(
      (entries) => current && setLoaded({ key, entries }),
      () => {},
    );
    return () => {
      current = false;
    };
  }, [key, range.from, range.to, hrefs]);

  return loaded?.key === key ? loaded.entries : initial;
}
