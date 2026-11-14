// The schema of a service sheet stage run's result (the file STAGE_RESULT names): what the last `pnpm stage-content sheet
// draft` or `pnpm stage-content sheet --record` did with its week, which the CI report takes the week's outcome from.

import { z } from "zod";
import { sheetWeekSchema } from "@/lib/services/schema";

/** A run that drafted or staged its week, which it then knows. */
const done = <R extends string>(result: R) => z.strictObject({ ...sheetWeekSchema.shape, result: z.literal(result) });

/** A run that failed, with the refusal's first line, as printed; the week's dates when the run read them. */
const failed = <R extends string>(result: R) =>
  z.strictObject({ ...sheetWeekSchema.partial().shape, result: z.literal(result), reason: z.string().min(1) });

export const sheetResultSchema = z.discriminatedUnion("result", [
  done("drafted"),
  done("staged"),
  failed("refused"),
  failed("document-error"),
]);

/**
 * `drafted` (the draft record written), `staged` (the week and its record added), or `refused` or `document-error`
 * (the parish's document could not be read) with the refusal's first line; the week's dates once the run knew them.
 */
export type SheetResult = z.infer<typeof sheetResultSchema>;
