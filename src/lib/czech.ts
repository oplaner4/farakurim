import { format } from "date-fns";
import { cs } from "date-fns/locale";
import type { IsoDate } from "@/content/types";
import { inPrague, pragueDateTime } from "./prague";

const pluralRules = new Intl.PluralRules("cs");

/** Czech plural form for a whole number: [1, 2–4, other]. */
export function plural(n: number, [one, few, other]: [one: string, few: string, other: string]): string {
  const category = pluralRules.select(n);
  if (category === "one") return one;
  if (category === "few") return few;
  return other;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const asDate = (date: IsoDate) => pragueDateTime(date, "12:00");
const fmt = (date: IsoDate, pattern: string) => format(asDate(date), pattern, { locale: cs, in: inPrague });

/** "neděle" */
export const weekdayName = (date: IsoDate) => fmt(date, "EEEE");

/** "4. 10." */
export const formatShortDate = (date: IsoDate) => fmt(date, "d. M.");

/** "20. září 2026" (date-fns `cs` uses the genitive month name after a day number) */
export const formatLongDate = (date: IsoDate) => fmt(date, "d. MMMM yyyy");

/** "Ne 4. 10." */
export const formatWeekdayDate = (date: IsoDate) => `${capitalize(fmt(date, "EEEEEE"))} ${formatShortDate(date)}`;

/** "27. 9. – 4. 10. 2026" */
export const formatDateRange = (from: IsoDate, to: IsoDate) => `${formatShortDate(from)} – ${fmt(to, "d. M. yyyy")}`;

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
