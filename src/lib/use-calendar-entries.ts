"use client";

import { useEffect, useMemo, useState } from "react";
import type { CalendarEntry, CalendarId } from "@/content/types";
import { GOOGLE_CALENDAR_API_KEY, parishCalendars } from "@/content/site";
import { type DateRange, mergeEntries } from "./agenda";
import { fetchGoogleCalendar, toEntries } from "./google-calendar";

// The prerendered calendars hold the entries of the build's date range. With an API key, the browser re-reads
// every range it shows from Google Calendar, so changes appear without a redeploy. Read ranges replace the
// build's entries for their days and are kept for the page's lifetime; a failed read keeps the build's entries
// and is tried again the next time the range is shown.

const cache = new Map<string, Promise<CalendarEntry[]>>();

const rangeKey = ({ from, to }: DateRange) => `${from}/${to}`;

function readRange(range: DateRange, hrefs: Record<string, string>): Promise<CalendarEntry[]> {
  const key = rangeKey(range);
  let entries = cache.get(key);
  if (!entries) {
    const links = new Map(Object.entries(hrefs));
    const ids = Object.keys(parishCalendars) as CalendarId[];
    entries = Promise.all(
      ids.map(async (id) =>
        toEntries(await fetchGoogleCalendar(parishCalendars[id].googleId, GOOGLE_CALENDAR_API_KEY!, range), id, links),
      ),
    ).then((lists) => lists.flat());
    entries.catch(() => cache.delete(key));
    cache.set(key, entries);
  }
  return entries;
}

/**
 * - `ready`: the entries cover the range (from the build or from Google);
 * - `loading`: the range lies outside the build's and Google has not answered yet;
 * - `error`: the same, but Google failed.
 */
export type CalendarStatus = "ready" | "loading" | "error";

type Read = { range: DateRange; entries: CalendarEntry[] } | "error";

/** Prerendered entries and the days they cover. */
export type InitialCalendar = { entries: CalendarEntry[]; range: DateRange };

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
  const [reads, setReads] = useState<Record<string, Read>>({});

  useEffect(() => {
    if (!GOOGLE_CALENDAR_API_KEY) return;
    const shown = { from: range.from, to: range.to };
    readRange(shown, hrefs).then(
      (entries) => setReads((r) => ({ ...r, [key]: { range: shown, entries } })),
      () => setReads((r) => ({ ...r, [key]: "error" })),
    );
    // Forget a failure when the range is left, so showing it again reads as loading, not as failed.
    return () =>
      setReads((r) => {
        if (r[key] !== "error") return r;
        const rest = { ...r };
        delete rest[key];
        return rest;
      });
  }, [key, range.from, range.to, hrefs]);

  const entries = useMemo(
    () =>
      mergeEntries(
        initial.entries,
        Object.values(reads).filter((r) => r !== "error"),
      ),
    [initial.entries, reads],
  );

  const read = reads[key];
  const prerendered = range.from >= initial.range.from && range.to <= initial.range.to;
  const status: CalendarStatus =
    !GOOGLE_CALENDAR_API_KEY || prerendered || (read && read !== "error")
      ? "ready"
      : read === "error"
        ? "error"
        : "loading";
  return { entries, status };
}
