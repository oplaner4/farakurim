import type { CampYear, NextCamp } from "@/content/types/camp";
import { formatCompactDate } from "@/lib/shared/czech";

// Ročníky (design/DESIGN.md §29.5) and the next camp's panel on O táboru (§29.2).

export type YearTint = "magenta" | "blue" | "green" | "orange";

const TINTS: YearTint[] = ["green", "blue", "magenta", "orange"];

/** The tint of a year's card: the brand colours in turn, newest first magenta, blue, green, orange (2026–2023). */
export const yearTint = (year: number): YearTint => TINTS[year % 4];

/** "15.–21. 8. 2019", "30. 7. – 2. 8. 2020" */
export const campDates = (start: string, end: string) => `${formatCompactDate(start, end)} ${end.slice(0, 4)}`;

/** The id of a year's card, which the old year URLs open (public/.htaccess): "rok-2019". */
export const yearAnchor = (year: number) => `rok-${year}`;

/** The visible heading of a year's card: the camp game's theme, or "Tábor 2020" when it is not known. */
export const yearTitle = ({ year, theme }: Pick<CampYear, "year" | "theme">) => theme ?? `Tábor ${year}`;

/** The next camp's dates, or "upřesníme" until they are known. */
export const nextCampDates = ({ start, end }: Pick<NextCamp, "start" | "end">) =>
  start && end ? campDates(start, end) : "upřesníme";
