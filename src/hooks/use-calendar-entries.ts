"use client";

import { queryOptions, type UseQueryResult, useQueries, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { CalendarEntry, CalendarId } from "@/content/types/calendar";
import { GOOGLE_CALENDAR_API_KEY, parishCalendars } from "@/content/site";
import {
  addRange,
  type CalendarStatus,
  calendarStatus,
  containsRange,
  type DateRange,
  mergeEntries,
} from "@/lib/calendar/agenda";
import { type CalendarLinks, fetchGoogleCalendar, toEntries } from "@/lib/calendar/google-calendar";

// The prerendered calendars hold the entries of the build's date range. With an API key, the browser re-reads
// every range it shows from Google Calendar (one TanStack query per range), so changes appear without a redeploy.
// Read ranges replace the build's entries for their days and are kept for the page's lifetime. A failed read keeps
// the build's entries and is tried again the next time the range is shown.

type Read = { range: DateRange; entries: CalendarEntry[] };

async function readRange(range: DateRange, links: CalendarLinks): Promise<Read> {
  const ids = Object.keys(parishCalendars) as CalendarId[];
  const lists = await Promise.all(
    ids.map(async (id) =>
      toEntries(await fetchGoogleCalendar(parishCalendars[id].googleId, GOOGLE_CALENDAR_API_KEY!, range), id, links),
    ),
  );
  return { range, entries: lists.flat() };
}

const rangeQuery = (range: DateRange, links: CalendarLinks) =>
  queryOptions({ queryKey: ["calendar", range.from, range.to], queryFn: () => readRange(range, links) });

/** Prerendered entries and the days they cover. */
export type InitialCalendar = { entries: CalendarEntry[]; range: DateRange };

// Module scope, so TanStack keeps the combined result stable while no query changes.
const combineReads = (results: UseQueryResult<Read>[]) => results.flatMap((r) => (r.data ? [r.data] : []));

/**
 * Entries for `range` and around it: the prerendered `initial` ones, with the days of every range read from
 * Google Calendar replaced by Google's entries. `links` links Události events to Aktuality detail pages.
 */
export function useCalendarEntries(
  initial: InitialCalendar,
  range: DateRange,
  links: CalendarLinks,
): { entries: CalendarEntry[]; status: CalendarStatus } {
  // Every range shown so far, in order.
  const [shown, setShown] = useState<DateRange[]>([]);
  const withRange = addRange(shown, range);
  if (GOOGLE_CALENDAR_API_KEY && withRange !== shown) setShown(withRange);

  // The shown range is read (and a failed read tried again) here; going back to it starts as loading, not as failed.
  const current = useQuery({ ...rangeQuery(range, links), enabled: !!GOOGLE_CALENDAR_API_KEY });
  // Only collects what the ranges shown so far have read.
  const reads = useQueries({
    queries: shown.map((r) => ({ ...rangeQuery(r, links), enabled: false })),
    combine: combineReads,
  });

  const entries = useMemo(() => mergeEntries(initial.entries, reads), [initial.entries, reads]);

  const status = calendarStatus({
    live: !!GOOGLE_CALENDAR_API_KEY,
    prerendered: containsRange(initial.range, range),
    read: !!current.data,
    failed: current.isError,
  });
  return { entries, status };
}
