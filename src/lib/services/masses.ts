import { addDays, differenceInCalendarDays } from "date-fns";
import type { PlaceId, RegularService, ScheduleException, ServiceEntry, ServiceRule } from "@/content/types/services";
import type { ClockTime, IsoDate, Weekday } from "@/content/types/shared";
import { capitalize, formatShortDate, plural, WEEKDAY_NAMES, weekdayName } from "@/lib/shared/czech";
import { inPrague, pragueDate, pragueDateTime, pragueWeekday } from "@/lib/shared/prague";

export type UpcomingService = {
  date: IsoDate;
  time: string;
  place: PlaceId;
  /** Omitted for a mass. */
  title?: string;
  note?: string;
  /** UTC timestamp (ms) of the start. */
  startsAt: number;
};

export type ScheduleSource = {
  regular: RegularService[];
  exceptions: ScheduleException[];
};

const LOOKAHEAD_DAYS = 14;

/** Whether a service with `rule` takes place on a day that is (or isn't) the first such weekday of its month. */
function ruleApplies(rule: ServiceRule = "every", firstInMonth: boolean): boolean {
  if (rule === "first-in-month") return firstInMonth;
  if (rule === "not-first-in-month") return !firstInMonth;
  return true;
}

/**
 * All services of a day, masses and titled ones ("Adorace"), by time: an exception replaces the whole day,
 * otherwise the regular services whose rule applies.
 */
export function servicesOnDate(date: IsoDate, source: ScheduleSource): ServiceEntry[] {
  const exception = source.exceptions.find((e) => e.date === date);
  if (exception) return exception.services;
  const weekday = pragueWeekday(date);
  const firstInMonth = Number(date.slice(8, 10)) <= 7;
  return source.regular
    .filter((s) => s.weekday === weekday && ruleApplies(s.rule, firstInMonth))
    .map(({ time, place, title, note }) => ({ time, place, ...(title && { title }), ...(note && { note }) }))
    .sort((a, b) => minutes(a.time) - minutes(b.time));
}

/** Monday first, as the week is printed in the ohlášky. */
export const WEEK_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export type ScheduleRow = {
  time: ClockTime;
  title: string;
  note?: string;
  /** "1. pátek v měsíci" */
  tag?: string;
};

export type ScheduleDay = { weekday: Weekday; rows: ScheduleRow[] };

const minutes = (time: ClockTime) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/** A place's regular services by weekday (§14.3): Monday to Sunday, days without services left out. */
export function weeklySchedule(services: RegularService[], place: PlaceId): ScheduleDay[] {
  return WEEK_ORDER.map((weekday) => ({
    weekday,
    rows: services
      .filter((s) => s.place === place && s.weekday === weekday)
      .sort((a, b) => minutes(a.time) - minutes(b.time))
      .map(({ time, title = "Mše svatá", note, rule }) => ({
        time,
        title,
        ...(note && { note }),
        ...(rule === "first-in-month" && { tag: `1. ${WEEKDAY_NAMES[weekday]} v měsíci` }),
      })),
  })).filter((day) => day.rows.length > 0);
}

/** The next `count` services (masses and titled ones) that start after `now`, in chronological order. */
export function upcomingServices(now: number, source: ScheduleSource, count: number): UpcomingService[] {
  const result: UpcomingService[] = [];
  for (let k = 0; k < LOOKAHEAD_DAYS && result.length < count; k++) {
    const date = pragueDate(addDays(now, k, { in: inPrague }));
    const day = servicesOnDate(date, source)
      .map((m) => ({ ...m, date, startsAt: pragueDateTime(date, m.time).getTime() }))
      .filter((m) => m.startsAt > now)
      .sort((a, b) => a.startsAt - b.startsAt);
    result.push(...day);
  }
  return result.slice(0, count);
}

/** "Dnes · sobota 3. 10.", "Zítra · neděle 4. 10.", "Středa · 7. 10." */
export function formatMassDay(date: IsoDate, now: number): string {
  const diff = differenceInCalendarDays(pragueDateTime(date, "12:00"), now, { in: inPrague });
  const weekday = weekdayName(date);
  if (diff === 0) return `Dnes · ${weekday} ${formatShortDate(date)}`;
  if (diff === 1) return `Zítra · ${weekday} ${formatShortDate(date)}`;
  return `${capitalize(weekday)} · ${formatShortDate(date)}`;
}

export type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  daysLabel: string;
  hoursLabel: string;
  minutesLabel: string;
};

export function countdown(startsAt: number, now: number): Countdown {
  const totalMinutes = Math.max(0, Math.floor((startsAt - now) / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return {
    days,
    hours,
    minutes,
    daysLabel: plural(days, ["den", "dny", "dní"]),
    hoursLabel: plural(hours, ["hodina", "hodiny", "hodin"]),
    minutesLabel: plural(minutes, ["minuta", "minuty", "minut"]),
  };
}
