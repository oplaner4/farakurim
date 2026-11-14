import type { ScheduleException } from "@/content/types/services";
import { scheduleExceptionsFileSchema } from "@/lib/services/schema";
import { parseOrThrow } from "@/lib/shared/parse";
import data from "./schedule-exceptions.json";

// The changes the parish announces for days no service sheet covers, after the last one or in a week without one
// (src/content/schedule-exceptions.json, added by `pnpm add-exception`, parish-manage-exceptions skill), so the
// next-mass countdown is right before that week's service sheet arrives. Each replaces its whole day (`services: []`
// cancels it); `scheduleExceptions()` drops the ones a sheet covers, and `pnpm stage sheet … --record` removes those
// and the past ones. Checked on import, so a broken file fails the build naming the field.

const parsed = parseOrThrow(scheduleExceptionsFileSchema, data, "src/content/schedule-exceptions.json");

/** By date, one per date, each on a day no sheet covers (schedule-exceptions.test.ts). */
export const laterExceptions: ScheduleException[] = parsed.exceptions;
