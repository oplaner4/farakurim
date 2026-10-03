import type { Announcement, IsoDate, PlaceId, ScheduleException, ServiceSheet, SheetDay } from "@/content/types";
import { plural } from "./czech";

// The weekly ohlášky as structured content (design/DESIGN.md §14.5–14.7).

const isPlaceId = (place: string, places: readonly PlaceId[]): place is PlaceId =>
  (places as readonly string[]).includes(place);

/**
 * Schedule exceptions from the ohlášky: a day with a changed mass replaces its regular masses with the day's
 * masses at the parish churches, so a change is entered only once.
 */
export function sheetExceptions(sheet: Pick<ServiceSheet, "days">, places: readonly PlaceId[]): ScheduleException[] {
  return sheet.days
    .filter((day) => day.rows.some((r) => r.mass && r.changed))
    .map((day) => ({
      date: day.date,
      reason: "změna dle ohlášek",
      masses: day.rows.flatMap((r) => (r.mass && isPlaceId(r.place, places) ? [{ time: r.time, place: r.place }] : [])),
    }));
}

/** Changes first, the rest in the editor's order (§14.5). */
export const sortAnnouncements = (items: Announcement[]): Announcement[] =>
  [...items].sort((a, b) => Number(b.category === "zmena") - Number(a.category === "zmena"));

/** The days as published on the web: details marked not public (§14.6) are dropped, not only hidden. */
export const publicDays = (days: SheetDay[]): SheetDay[] =>
  days.map((day) => ({
    ...day,
    rows: day.rows.map(({ detail, public: isPublic = true, ...row }) => ({
      ...row,
      ...(isPublic && detail && { detail }),
    })),
  }));

export type WeekView = {
  days: SheetDay[];
  /** Days before today that the toggle can show; 0 hides the toggle. */
  pastCount: number;
};

/**
 * Today and the coming days, or the whole week when `showPast` is set. Once the whole week is over, all
 * days show and there is nothing to toggle.
 */
export function weekView(days: SheetDay[], today: IsoDate, showPast: boolean): WeekView {
  const upcoming = days.filter((d) => d.date >= today);
  if (upcoming.length === 0) return { days, pastCount: 0 };
  const pastCount = days.length - upcoming.length;
  return { days: showPast ? days : upcoming, pastCount };
}

/** "Zobrazit celý týden (+3 dny)" */
export const showWeekLabel = (pastCount: number) =>
  `Zobrazit celý týden (+${pastCount} ${plural(pastCount, ["den", "dny", "dní"])})`;
