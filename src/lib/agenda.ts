import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  startOfWeek,
} from "date-fns";
import { cs } from "date-fns/locale";
import type { CalendarEntry, CalendarId, ClockTime, IsoDate, NewsEvent, Place, PlaceId } from "@/content/types";
import { eventClock } from "./calendar";
import { capitalize, plural } from "./czech";
import { servicesOnDate, type ScheduleSource } from "./masses";
import { inPrague, pragueDate, pragueDateTime, pragueWeekday } from "./prague";

// The Kalendář (design/DESIGN.md §16) and the homepage week calendar (§4.3a): occurrences of the two parish
// calendars, grouped by day.

/** Calendar month, `YYYY-MM`. */
export type IsoMonth = string;

export type AgendaItem = {
  key: string;
  calendar: CalendarId;
  /** Omitted for all-day items ("celý den"). */
  time?: ClockTime;
  title: string;
  place?: string;
  href?: string;
};

export type DateRange = { from: IsoDate; to: IsoDate };

const noon = (date: IsoDate) => pragueDateTime(date, "12:00");
const shift = (date: IsoDate, days: number) => pragueDate(addDays(noon(date), days, { in: inPrague }));
const fmt = (date: IsoDate, pattern: string) => format(noon(date), pattern, { locale: cs, in: inPrague });

/** Every date from `from` to `to`, inclusive. */
export function datesBetween(from: IsoDate, to: IsoDate): IsoDate[] {
  const result: IsoDate[] = [];
  for (let date = from; date <= to; date = shift(date, 1)) result.push(date);
  return result;
}

/** The days a month grid shows: whole weeks from Monday to Sunday. */
export function monthGridRange(month: IsoMonth): DateRange {
  const first = noon(`${month}-01`);
  return {
    from: pragueDate(startOfWeek(first, { weekStartsOn: 1, in: inPrague })),
    to: pragueDate(endOfWeek(endOfMonth(first, { in: inPrague }), { weekStartsOn: 1, in: inPrague })),
  };
}

/** `YYYY-MM` of the month `delta` months from `month`. */
export const addToMonth = (month: IsoMonth, delta: number): IsoMonth =>
  format(addMonths(noon(`${month}-01`), delta, { in: inPrague }), "yyyy-MM", { in: inPrague });

const MONTH_PARAM = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY_PARAM = /^\d{4}-\d{2}-\d{2}$/;

/** `?mesic=2026-11`, or `undefined` when missing or invalid. */
export const parseMonthParam = (value: string | null): IsoMonth | undefined =>
  value && MONTH_PARAM.test(value) ? value : undefined;

/** `?den=2026-10-18`, or `undefined` when missing or not a real date. */
export function parseDayParam(value: string | null): IsoDate | undefined {
  if (!value || !DAY_PARAM.test(value)) return undefined;
  return isValid(noon(value)) ? value : undefined;
}

const minutes = (time?: ClockTime) => {
  if (!time) return -1;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Items per day from `from` to `to`: all-day items first, then by time. A multi-day entry shows on each of its
 * days; only the first one carries its start time.
 */
export function agendaByDate(entries: CalendarEntry[], { from, to }: DateRange): Map<IsoDate, AgendaItem[]> {
  const days = new Map<IsoDate, AgendaItem[]>(datesBetween(from, to).map((date) => [date, []]));
  for (const { id, calendar, title, date, end = date, time, place, href } of entries) {
    if (end < from || date > to) continue;
    for (const day of datesBetween(date < from ? from : date, end > to ? to : end)) {
      days.get(day)!.push({
        key: `${calendar}:${id}:${day}`,
        calendar,
        title,
        ...(day === date && time && { time }),
        ...(place && { place }),
        ...(href && { href }),
      });
    }
  }
  for (const items of days.values()) items.sort((a, b) => minutes(a.time) - minutes(b.time));
  return days;
}

/** "18. října, 2 bohoslužby, 1 akce", "19. října, nic v kalendáři" */
export function dayCellLabel(date: IsoDate, items: AgendaItem[]): string {
  const services = items.filter((i) => i.calendar === "services").length;
  const events = items.length - services;
  const parts = [
    services && `${services} ${plural(services, ["bohoslužba", "bohoslužby", "bohoslužeb"])}`,
    events && `${events} ${plural(events, ["akce", "akce", "akcí"])}`,
  ].filter(Boolean);
  return `${fmt(date, "d. MMMM")}, ${parts.length ? parts.join(", ") : "nic v kalendáři"}`;
}

const daysFrom = (today: IsoDate, date: IsoDate) => differenceInCalendarDays(noon(date), noon(today), { in: inPrague });

/** Day detail heading: "Dnes · Sobota 3. října", "Zítra · Neděle 4. října", "Neděle 18. října". */
export function dayHeading(date: IsoDate, today: IsoDate): string {
  const day = capitalize(fmt(date, "EEEE d. MMMM"));
  const diff = daysFrom(today, date);
  if (diff === 0) return `Dnes · ${day}`;
  if (diff === 1) return `Zítra · ${day}`;
  return day;
}

/** Week calendar card header: "Dnes" + "so 3. 10.", "Zítra" + "ne 4. 10.", "Pondělí" + "5. 10.". */
export function weekCardLabels(date: IsoDate, today: IsoDate): { label: string; date: string } {
  const diff = daysFrom(today, date);
  const short = fmt(date, "d. M.");
  if (diff === 0) return { label: "Dnes", date: `${fmt(date, "EEEEEE")} ${short}` };
  if (diff === 1) return { label: "Zítra", date: `${fmt(date, "EEEEEE")} ${short}` };
  return { label: capitalize(fmt(date, "EEEE")), date: short };
}

/** "Říjen 2026" */
export const monthHeading = (month: IsoMonth) => capitalize(fmt(`${month}-01`, "LLLL yyyy"));

/** Time column of an item: "18:30" or "celý den". */
export const itemTime = (item: AgendaItem) => item.time ?? "celý den";

// Mock calendars, generated the way the mockups generate October 2026 (§16.4), until the Google Calendars
// are read with an API key.

/** "Mše, adorace" occurrences from the regular schedule and its exceptions. */
export function scheduleEntries(
  source: ScheduleSource,
  places: Record<PlaceId, Place>,
  { from, to }: DateRange,
): CalendarEntry[] {
  return datesBetween(from, to).flatMap((date) =>
    servicesOnDate(date, source).map(({ time, place, title = "Mše svatá", note }) => ({
      id: `${date}-${time}-${place}`,
      calendar: "services" as const,
      title: note ? `${title} ${note}` : title,
      date,
      time,
      place: places[place].name,
    })),
  );
}

/**
 * "Události" occurrences of the Aktuality records: one entry per event, or one per meeting of a weekly
 * series (`longTerm.weeklyAt`, `sessions`). Long-term events without a meeting day are left out.
 */
export function newsEntries(events: NewsEvent[], href: (event: NewsEvent) => string): CalendarEntry[] {
  return events.flatMap((event): CalendarEntry[] => {
    const { id, title, start, end = start, place, longTerm, sessions } = event;
    if (longTerm === true) return [];
    const time = eventClock(event)?.from;
    const base = { calendar: "events" as const, title, place, href: href(event), ...(time && { time }) };
    if (longTerm || sessions) {
      const weekday = pragueWeekday(start);
      return datesBetween(start, end)
        .filter((date) => pragueWeekday(date) === weekday)
        .map((date) => ({ ...base, id: `${id}-${date}`, date }));
    }
    return [{ ...base, id, date: start, ...(end !== start && { end }) }];
  });
}
