"use client";

import { queryOptions, type UseQueryResult, useQueries, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { CalendarEntry, CalendarId } from "@/content/types/calendar";
import { GOOGLE_CALENDAR_API_KEY, parishCalendars } from "@/content/site";
import { type DateRange, mergeEntries } from "@/lib/calendar/agenda";
import { fetchGoogleCalendar, toEntries } from "@/lib/calendar/google-calendar";

// The prerendered calendars hold the entries of the build's date range. With an API key, the browser re-reads
// every range it shows from Google Calendar (one TanStack query per range), so changes appear without a redeploy.
// Read ranges replace the build's entries for their days and are kept for the page's lifetime. A failed read keeps
// the build's entries and is tried again the next time the range is shown.

type Read = { range: DateRange; entries: CalendarEntry[] };

const rangeKey = ({ from, to }: DateRange) => `${from}/${to}`;

async function readRange(range: DateRange, hrefs: Record<string, string>): Promise<Read> {
  const links = new Map(Object.entries(hrefs));
  const ids = Object.keys(parishCalendars) as CalendarId[];
  const lists = await Promise.all(
    ids.map(async (id) =>
      toEntries(await fetchGoogleCalendar(parishCalendars[id].googleId, GOOGLE_CALENDAR_API_KEY!, range), id, links),
    ),
  );
  return { range, entries: lists.flat() };
}

const rangeQuery = (range: DateRange, hrefs: Record<string, string>) =>
  queryOptions({ queryKey: ["calendar", range.from, range.to], queryFn: () => readRange(range, hrefs) });

/**
 * - `ready`: the entries cover the range (from the build or from Google);
 * - `loading`: the range lies outside the build's and Google has not answered yet;
 * - `error`: the same, but Google failed.
 */
export type CalendarStatus = "ready" | "loading" | "error";

/** Prerendered entries and the days they cover. */
export type InitialCalendar = { entries: CalendarEntry[]; range: DateRange };

// Module scope, so TanStack keeps the combined result stable while no query changes.
const combineReads = (results: UseQueryResult<Read>[]) => results.flatMap((r) => (r.data ? [r.data] : []));

/**
 * Entries for `range` and around it: the prerendered `initial` ones, with the days of every range read from
 * Google Calendar replaced by Google's entries. `hrefs` maps event IDs to Aktuality detail pages.
 */
export function useCalendarEntries(
  initial: InitialCalendar,
  range: DateRange,
  hrefs: Record<string, string>,
): { entries: CalendarEntry[]; status: CalendarStatus } {
  const key = rangeKey(range);
  // Every range shown so far, in order.
  const [shown, setShown] = useState<DateRange[]>([]);
  if (GOOGLE_CALENDAR_API_KEY && !shown.some((r) => rangeKey(r) === key)) {
    setShown([...shown, { from: range.from, to: range.to }]);
  }

  // The shown range is read (and a failed read tried again) here; going back to it starts as loading, not as failed.
  const current = useQuery({ ...rangeQuery(range, hrefs), enabled: !!GOOGLE_CALENDAR_API_KEY });
  // Only collects what the ranges shown so far have read.
  const reads = useQueries({
    queries: shown.map((r) => ({ ...rangeQuery(r, hrefs), enabled: false })),
    combine: combineReads,
  });

  const entries = useMemo(() => mergeEntries(initial.entries, reads), [initial.entries, reads]);

  const prerendered = range.from >= initial.range.from && range.to <= initial.range.to;
  const status: CalendarStatus =
    !GOOGLE_CALENDAR_API_KEY || prerendered || current.data ? "ready" : current.isError ? "error" : "loading";
  return { entries, status };
}
