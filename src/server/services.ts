import "server-only";
import { places } from "@/content/masses";
import { laterExceptions, serviceSheets } from "@/content/ohlasky";
import { currentSheet, scheduleExceptions } from "@/lib/services/service-sheet";
import { BUILD_TIME } from "@/lib/shared/build-time";
import { pragueDate } from "@/lib/shared/prague";
import type { PlaceId } from "@/content/types/services";

// The schedule derived from the ohlášky, for the pages that need it at build time.

/**
 * Every sheet's days and the hand-entered `laterExceptions` as schedule exceptions (`scheduleExceptions()`): the
 * homepage countdown and the calendar fallback combine them with `regularServices`.
 */
export const currentExceptions = scheduleExceptions(serviceSheets, laterExceptions, Object.keys(places) as PlaceId[]);

/** The sheet current on the build day. */
export const buildSheet = currentSheet(serviceSheets, pragueDate(BUILD_TIME))!;
