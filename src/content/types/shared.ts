// Value types shared by every content domain: Europe/Prague dates and times.

/** Calendar date in Europe/Prague, ISO format `YYYY-MM-DD`. */
export type IsoDate = string;

/** Wall-clock time in Europe/Prague, `H:MM` or `HH:MM`. */
export type ClockTime = string;

/** Calendar day that repeats every year, `MM-DD`. */
export type MonthDay = string;

/** A yearly break, e.g. the summer holidays: from `from` to `to` (inclusive), wrapping over New Year when `from > to`. */
export type YearlyBreak = { from: MonthDay; to: MonthDay };

/** 0 = neděle … 6 = sobota (same as `Date.getDay()`). */
export type Weekday = number;
