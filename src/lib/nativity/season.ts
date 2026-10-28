import type { NativityOpeningDay, NativitySeason } from "@/content/types/nativity";
import type { IsoDate } from "@/content/types/shared";
import { pragueDate, pragueDateTime } from "@/lib/shared/prague";

// Betlémy (design/DESIGN.md §30): which season the page shows and its state on a Prague date.

/** The page and the menu switch to a season on 1. 11. of its year (§4.1a, §30.1). */
export const seasonStart = (season: Pick<NativitySeason, "year">): IsoDate => `${season.year}-11-01`;

export const firstOpeningDay = (season: NativitySeason) => season.openingDays[0].date;
export const lastOpeningDay = (season: NativitySeason) => season.openingDays[season.openingDays.length - 1].date;

/** The newest season that has started by `today`; before the oldest one starts, the oldest. `seasons`: newest first. */
export function currentSeason(seasons: NativitySeason[], today: IsoDate): NativitySeason {
  return seasons.find((season) => seasonStart(season) <= today) ?? seasons[seasons.length - 1];
}

export type ExhibitionState = "before" | "during" | "after";

/** "Před zahájením" until the first opening day, "Během výstavy" until the last one, then "Po skončení" (§30.1). */
export function exhibitionState(season: NativitySeason, today: IsoDate): ExhibitionState {
  if (today < firstOpeningDay(season)) return "before";
  return today <= lastOpeningDay(season) ? "during" : "after";
}

export type OpeningStatus = {
  /** Today's opening hours, while they have not ended yet. */
  today?: NativityOpeningDay;
  /** Within today's hours ("Právě otevřeno"). */
  open: boolean;
  /** The next opening day after today (or after today's hours). */
  next?: NativityOpeningDay;
};

/** The status panel during the exhibition (§30.2): open now, today's hours or the next opening day. */
export function openingStatus(season: NativitySeason, now: number): OpeningStatus {
  const date = pragueDate(now);
  const day = season.openingDays.find((d) => d.date === date);
  const today = day && now < pragueDateTime(day.date, day.to).getTime() ? day : undefined;
  return {
    today,
    open: !!today && now >= pragueDateTime(today.date, today.from).getTime(),
    next: season.openingDays.find((d) => d.date > date),
  };
}

/** The first nativity scene, Greccio 1223 ("letos je to 803 let"). */
export const yearsSinceGreccio = (year: number) => year - 1223;
