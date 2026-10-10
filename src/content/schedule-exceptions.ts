import * as z from "zod";
import type { ScheduleException } from "@/content/types/services";
import { scheduleExceptionsFileSchema } from "@/lib/services/schema";
import data from "./schedule-exceptions.json";

// The changes the parish announces for days no ohlášky sheet covers, after the last one or in a week without one
// (src/content/schedule-exceptions.json, added by `pnpm add-exception`, farnost-create-vyjimka skill), so the
// next-mass countdown is right before that week's ohlášky arrive. Each replaces its whole day (`services: []` cancels
// it); `scheduleExceptions()` drops the ones a sheet covers, and `pnpm stage porad … --record` removes those and the
// past ones. Checked on import, so a broken file fails the build naming the field.

const parsed = scheduleExceptionsFileSchema.safeParse(data);
if (!parsed.success) {
  throw new Error(`src/content/schedule-exceptions.json is not valid:\n${z.prettifyError(parsed.error)}`);
}

/** By date, one per date, each on a day no sheet covers (schedule-exceptions.test.ts). */
export const laterExceptions: ScheduleException[] = parsed.data.exceptions;
