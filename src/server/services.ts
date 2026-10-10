import "server-only";
import { places } from "@/content/masses";
import { laterExceptions } from "@/content/schedule-exceptions";
import { serviceSheets } from "@/server/ohlasky";
import { scheduleExceptions } from "@/lib/services/service-sheet";
import type { PlaceId } from "@/content/types/services";

// The schedule derived from the ohlášky, for the pages that need it at build time.

/**
 * Every sheet's days and the changes announced for later (`laterExceptions`) as schedule exceptions
 * (`scheduleExceptions()`): the homepage countdown and the calendar fallback combine them with `regularServices`.
 */
export const currentExceptions = scheduleExceptions(serviceSheets, laterExceptions, Object.keys(places) as PlaceId[]);
