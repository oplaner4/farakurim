import "server-only";
import type { ScheduleException, ServiceSheet } from "@/content/types/services";
import { sheet20261004 } from "./2026-10-04";

// The ohlášky, one generated file per sheet (`pnpm stage porad … --record`, farnost-create-porad-bohosluzeb skill),
// sorted by validFrom. Consecutive sheets may share their boundary day (the newer wins it); the site shows the sheet
// whose week has started last (currentSheet(), in the browser). Server-only: rows marked not public must never reach
// a client bundle, so client components get what they need as props, never these modules.
export const serviceSheets: ServiceSheet[] = [sheet20261004];

/**
 * Hand-entered changes after the last sheet, as soon as the parish announces them: each replaces its whole day
 * (`services: []` cancels it). `scheduleExceptions()` puts them after the sheets' days and drops the ones a sheet
 * covers or that are past.
 */
export const laterExceptions: ScheduleException[] = [];
