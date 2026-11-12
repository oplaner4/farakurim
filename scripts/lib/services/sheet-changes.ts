// What a corrected record of a service sheet changes against the sheet it replaces: each day's fields and rows by date
// (`2026-11-10 feast`, `2026-11-10 row 2`) and the announcements (`announcement 3`), as changedItems() names them.

import type { ServiceSheetRecord, SheetDay } from "@/content/types/services";
import { changedItems, changedKeys } from "../changes";

/** The days of `sheet` by date. */
const byDate = (sheet: ServiceSheetRecord): Record<string, SheetDay> =>
  Object.fromEntries(sheet.days.map((day) => [day.date, day]));

/** What differs between `before` and `after`: their days in date order, then their announcements. */
export function sheetChanges(before: ServiceSheetRecord, after: ServiceSheetRecord): string[] {
  const [was, is] = [byDate(before), byDate(after)];
  const days = changedKeys(was, is)
    .sort()
    .flatMap((date) => {
      if (!was[date] || !is[date]) return [date];
      return changedKeys(was[date], is[date]).flatMap((key) =>
        key === "rows" ? changedItems(was[date].rows, is[date].rows, `${date} row`) : [`${date} ${key}`],
      );
    });
  return [...days, ...changedItems(before.announcements, after.announcements, "announcement")];
}
