import { eachDayOfInterval } from "date-fns";
import type { Announcement, IsoDate, PlaceId, ScheduleException, ServiceSheet, SheetDay } from "@/content/types";
import { plural } from "./czech";
import { inPrague, pragueDate, pragueDateTime } from "./prague";

// The weekly ohlášky as structured content (design/DESIGN.md §14.5–14.7).

const isPlaceId = (place: string, places: readonly PlaceId[]): place is PlaceId =>
  (places as readonly string[]).includes(place);

/**
 * Schedule exceptions from the ohlášky: every day of the sheet's week gets exactly the masses and mass-like services
 * its rows list at the parish churches, never the regular schedule, so a change or a cancellation is entered only once. Days after the
 * week fall back to the regular schedule.
 */
export function sheetExceptions(
  sheet: Pick<ServiceSheet, "days" | "validFrom" | "validTo">,
  places: readonly PlaceId[],
): ScheduleException[] {
  return eachDayOfInterval(
    { start: pragueDateTime(sheet.validFrom, "12:00"), end: pragueDateTime(sheet.validTo, "12:00") },
    { in: inPrague },
  ).map((day) => {
    const date = pragueDate(day);
    const rows = sheet.days.find((d) => d.date === date)?.rows ?? [];
    return {
      date,
      reason: "dle ohlášek",
      services: rows.flatMap((r) => {
        if (!isPlaceId(r.place, places)) return [];
        if (r.mass) return [{ time: r.time, place: r.place }];
        if (r.service) return [{ time: r.time, place: r.place, title: r.title }];
        return [];
      }),
    };
  });
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
