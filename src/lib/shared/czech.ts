import { differenceInCalendarDays, format, getDay, isLastDayOfMonth } from "date-fns";
import { cs } from "date-fns/locale";
import type { NewsEvent } from "@/content/types/news";
import type { IsoDate } from "@/content/types/shared";
import { inPrague, pragueDateTime } from "./prague";

const pluralRules = new Intl.PluralRules("cs");

/** Lower case without diacritics, so "pout" finds "Pouť" and titles turn into URL parts. */
export const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Czech plural form for a whole number: [1, 2–4, other]. */
export function plural(n: number, [one, few, other]: [one: string, few: string, other: string]): string {
  const category = pluralRules.select(n);
  if (category === "one") return one;
  if (category === "few") return few;
  return other;
}

/**
 * "Nalezena jedna akce", "Nalezeny 3 akce", "Nalezeno 5 akcí": the participle agrees with the number and one is
 * written out. With `of`, a part of a longer list: "Zobrazeno 20 z 34 akcí".
 */
export function eventCount(verb: "Nalezen" | "Zobrazen", n: number, of?: number): string {
  const participle = verb + plural(n, ["a", "y", "o"]);
  if (of !== undefined) return `${participle} ${n} z ${of} akcí`;
  return `${participle} ${n === 1 ? "jedna" : n} ${plural(n, ["akce", "akce", "akcí"])}`;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Nominative weekday names (index = `Date.getDay()`). */
export const WEEKDAY_NAMES = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];

/** "Po", "Út", … (index = `Date.getDay()`). */
export const WEEKDAY_SHORT = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

const asDate = (date: IsoDate) => pragueDateTime(date, "12:00");
const fmt = (date: IsoDate, pattern: string) => format(asDate(date), pattern, { locale: cs, in: inPrague });

/** "neděle" */
export const weekdayName = (date: IsoDate) => fmt(date, "EEEE");

/** "4. 10." */
export const formatShortDate = (date: IsoDate) => fmt(date, "d. M.");

/** "20. září 2026" (date-fns `cs` uses the genitive month name after a day number) */
export const formatLongDate = (date: IsoDate) => fmt(date, "d. MMMM yyyy");

/** "20. září" */
export const formatDayMonth = (date: IsoDate) => fmt(date, "d. MMMM");

/** "Ne 4. 10." */
export const formatWeekdayDate = (date: IsoDate) => `${capitalize(fmt(date, "EEEEEE"))} ${formatShortDate(date)}`;

/** "27. 9. – 4. 10. 2026" */
/** "30. 6. 2026" */
export const formatNumericDate = (date: IsoDate) => fmt(date, "d. M. yyyy");

export const formatDateRange = (from: IsoDate, to: IsoDate) => `${formatShortDate(from)} – ${formatNumericDate(to)}`;

export type EventDateParts = {
  /** Big line of the date block: "7." or "2.–4." */
  days: string;
  /** Small line: "října" or "září – října" */
  months: string;
  /** Single-line label for chips: "7. října", "2.–4. října", "30. září – 2. října" */
  label: string;
  isRange: boolean;
};

export function formatEventDate(start: IsoDate, end?: IsoDate): EventDateParts {
  const dayA = fmt(start, "d.");
  const monthA = fmt(start, "MMMM");
  if (!end || end === start) {
    return { days: dayA, months: monthA, label: `${dayA} ${monthA}`, isRange: false };
  }
  const dayB = fmt(end, "d.");
  const monthB = fmt(end, "MMMM");
  if (start.slice(0, 7) === end.slice(0, 7)) {
    return { days: `${dayA}–${dayB}`, months: monthA, label: `${dayA}–${dayB} ${monthA}`, isRange: true };
  }
  return {
    days: `${dayA}–${dayB}`,
    months: `${monthA} – ${monthB}`,
    label: `${dayA} ${monthA} – ${dayB} ${monthB}`,
    isRange: true,
  };
}

/** "Říjen 2026" (nominative month name) */
export const formatMonthYear = (date: IsoDate) => capitalize(fmt(date, "LLLL yyyy"));

/** Accusative after "každý/každou/každé": "každý čtvrtek", "každou neděli" (index = `Date.getDay()`). */
const EVERY_WEEKDAY = [
  "každou neděli",
  "každé pondělí",
  "každé úterý",
  "každou středu",
  "každý čtvrtek",
  "každý pátek",
  "každou sobotu",
];
const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const weekdayIndex = (date: IsoDate) => getDay(asDate(date), { in: inPrague });
const isFirstOfMonth = (date: IsoDate) => date.endsWith("-01");
const isLastOfMonth = (date: IsoDate) => isLastDayOfMonth(asDate(date), { in: inPrague });

/** "neděle 25. 10. 2026" or, with `longMonth`, "neděle 18. října 2026" */
const formatDay = (date: IsoDate, longMonth: boolean) => fmt(date, longMonth ? "EEEE d. MMMM yyyy" : "EEEE d. M. yyyy");

/** "pátek 2. – neděle 4. 10. 2026", "pátek 30. 10. – neděle 1. 11. 2026" */
function formatDayRange(start: IsoDate, end: IsoDate, longMonth: boolean): string {
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const from = !sameYear
    ? formatDay(start, longMonth)
    : sameMonth
      ? fmt(start, "EEEE d.")
      : fmt(start, longMonth ? "EEEE d. MMMM" : "EEEE d. M.");
  return `${from} – ${formatDay(end, longMonth)}`;
}

export type EventWhen = {
  /** "neděle 25. 10. 2026", "1. 10. 2026 – 29. 4. 2027, každý čtvrtek od 18:30" */
  date: string;
  /** Shown after the date with " · " ("9:30"); series fold their time into `date`. */
  time?: string;
};

/**
 * Full date text of an event (§11.5 "Meta"). `longMonth` writes month names, as in the
 * "Doporučujeme" panel ("neděle 18. října 2026").
 */
export function formatEventWhen(event: NewsEvent, { longMonth = false } = {}): EventWhen {
  const { start, end = start, time, longTerm, sessions } = event;
  if (longTerm) {
    const range =
      isFirstOfMonth(start) && isLastOfMonth(end)
        ? start.slice(0, 4) === end.slice(0, 4)
          ? `${fmt(start, "LLLL")} – ${fmt(end, "LLLL yyyy")}`
          : `${fmt(start, "LLLL yyyy")} – ${fmt(end, "LLLL yyyy")}`
        : `${fmt(start, "d. M. yyyy")} – ${fmt(end, "d. M. yyyy")}`;
    if (longTerm !== true) return { date: `${range}, ${EVERY_WEEKDAY[weekdayIndex(start)]} od ${longTerm.weeklyAt}` };
    return { date: time ? `${range}, ${time}` : range };
  }
  if (sessions) {
    // "vždy" only when no meeting keeps its own time.
    const always = time && sessions.every((session) => typeof session === "string" || session.time === undefined);
    return { date: `od ${formatDay(start, longMonth)}${always ? `, vždy ${time}` : ""}` };
  }
  return { date: end === start ? formatDay(start, longMonth) : formatDayRange(start, end, longMonth), time };
}

export type DateBlock = { top: string; bottom: string };

/**
 * The two lines of an event's date block: "7." / "října", "2.–4." / "října";
 * weekly series "čt" / "18:30"; other long-term series "III–XI" / "2026".
 */
export function eventDateBlock(event: NewsEvent): DateBlock {
  const { start, end = start, longTerm, sessions } = event;
  if (longTerm) {
    if (longTerm !== true) return { top: fmt(start, "EEEEEE"), bottom: longTerm.weeklyAt };
    const months = (d: IsoDate) => ROMAN_MONTHS[Number(d.slice(5, 7)) - 1];
    const years = start.slice(0, 4) === end.slice(0, 4) ? fmt(end, "yyyy") : `${fmt(start, "yyyy")}–${fmt(end, "yy")}`;
    return { top: `${months(start)}–${months(end)}`, bottom: years };
  }
  const { days, months } = formatEventDate(start, sessions ? undefined : end);
  return { top: days, bottom: months };
}

/** "PNG", "PDF": the upper-case extension of a file name or URL. */
export function fileType(file: string): string {
  const name = file.split(/[?#]/)[0];
  const dot = name.lastIndexOf(".");
  return dot > name.lastIndexOf("/") ? name.slice(dot + 1).toUpperCase() : "";
}

/** Archive date column (§12.3): "3. 8.", "8.–15. 8.", "30. 7. – 2. 8." */
export function formatCompactDate(start: IsoDate, end: IsoDate = start): string {
  if (end === start) return formatShortDate(start);
  if (start.slice(0, 7) === end.slice(0, 7)) return `${fmt(start, "d.")}–${formatShortDate(end)}`;
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

/**
 * Relative label of a detail page (§13.1), by Prague calendar days: "Za 15 dní", "Za 3 dny", "Zítra",
 * "Dnes", "Právě probíhá" (multi-day and long-term events), "Proběhlo".
 */
export function relativeEventLabel(event: Pick<NewsEvent, "start" | "end">, today: IsoDate): string {
  const { start, end = start } = event;
  if (end < today) return "Proběhlo";
  if (start <= today) return end === start ? "Dnes" : "Právě probíhá";
  const days = differenceInCalendarDays(asDate(start), asDate(today), { in: inPrague });
  if (days === 1) return "Zítra";
  return `Za ${days} ${plural(days, ["den", "dny", "dní"])}`;
}

const sizeFormat = new Intl.NumberFormat("cs", { maximumFractionDigits: 1 });

/** "340 kB", "1,2 MB" */
export function formatFileSize(bytes: number): string {
  if (bytes < 1000 * 1000) return `${sizeFormat.format(Math.max(1, Math.round(bytes / 1000)))} kB`;
  return `${sizeFormat.format(bytes / (1000 * 1000))} MB`;
}

const czkFormat = new Intl.NumberFormat("cs", { maximumFractionDigits: 0 });
const percentFormat = new Intl.NumberFormat("cs", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** "57 800 Kč", with non-breaking spaces so an amount never wraps. */
export const formatCzk = (amount: number) => `${czkFormat.format(amount)} Kč`;

/** "8,7 %" for 0.087. */
export const formatPercent = (ratio: number) => `${percentFormat.format(ratio * 100)} %`;
