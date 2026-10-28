import type { NextCamp } from "@/content/types/camp";
import type { NativitySeason } from "@/content/types/nativity";
import type { IsoDate } from "@/content/types/shared";
import { lastOpeningDay, seasonStart } from "@/lib/nativity/season";

// The fifth main-menu item changes with the season (design/DESIGN.md §4.1a): Betlémy from 1. 11. to the exhibition's
// last day, Tábor from 1. 3. to the camp's last day, Petrklíč the rest of the year.

export type SeasonalItem = "petrklic" | "nativity" | "camp";

/** A span of days (both inclusive) in which the item replaces Petrklíč. */
export type SeasonalPeriod = { item: Exclude<SeasonalItem, "petrklic">; from: IsoDate; to: IsoDate };

/** The periods of every season, and of the next camp once its end date is known (until then, no Tábor item). */
export function seasonalPeriods(seasons: NativitySeason[], camp: NextCamp): SeasonalPeriod[] {
  const periods: SeasonalPeriod[] = seasons.map((season) => ({
    item: "nativity",
    from: seasonStart(season),
    to: lastOpeningDay(season),
  }));
  if (camp.end) periods.push({ item: "camp", from: `${camp.year}-03-01`, to: camp.end });
  return periods;
}

/** The item of `today`. */
export const seasonalItem = (periods: SeasonalPeriod[], today: IsoDate): SeasonalItem =>
  periods.find((p) => p.from <= today && today <= p.to)?.item ?? "petrklic";
