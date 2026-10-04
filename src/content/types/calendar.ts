import type { ClockTime, IsoDate } from "./shared";

// Kalendář (calendar.ts): entries of the parish's Google Calendars.

/** The parish's two Google Calendars (design/DESIGN.md §16.1): "Bohoslužby" and "Události" (names in `parishCalendars`). */
export type CalendarId = "services" | "events";

/**
 * One occurrence in a parish calendar, as Google Calendar returns it with recurring events expanded
 * (`singleEvents=true`). Exceptions and cancellations are already applied.
 */
export type CalendarEntry = {
  /** Unique within its calendar (Google's instance ID). */
  id: string;
  calendar: CalendarId;
  title: string;
  date: IsoDate;
  /** Last day of a multi-day entry (inclusive). */
  end?: IsoDate;
  /** Start time; omitted for all-day entries ("celý den"). */
  time?: ClockTime;
  place?: string;
  /** Detail page of the matching Aktuality record. */
  href?: string;
};
