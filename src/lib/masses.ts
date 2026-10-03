import { addDays, differenceInCalendarDays, getDay } from "date-fns";
import type { IsoDate, MassEntry, PlaceId, RegularMass, ScheduleException } from "@/content/types";
import { capitalize, formatShortDate, plural, weekdayName } from "./czech";
import { inPrague, pragueDate, pragueDateTime } from "./prague";

export type UpcomingMass = {
  date: IsoDate;
  time: string;
  place: PlaceId;
  note?: string;
  /** UTC timestamp (ms) of the start. */
  startsAt: number;
};

export type ScheduleSource = {
  regular: RegularMass[];
  exceptions: ScheduleException[];
};

const LOOKAHEAD_DAYS = 14;

export function massesOnDate(date: IsoDate, source: ScheduleSource): MassEntry[] {
  const exception = source.exceptions.find((e) => e.date === date);
  if (exception) return exception.masses;
  const weekday = getDay(pragueDateTime(date, "12:00"), { in: inPrague });
  return source.regular.filter((m) => m.weekday === weekday);
}

/** The next `count` masses that start after `now`, in chronological order. */
export function upcomingMasses(now: number, source: ScheduleSource, count: number): UpcomingMass[] {
  const result: UpcomingMass[] = [];
  for (let k = 0; k < LOOKAHEAD_DAYS && result.length < count; k++) {
    const date = pragueDate(addDays(now, k, { in: inPrague }));
    const day = massesOnDate(date, source)
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
