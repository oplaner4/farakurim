// The schema of the known events file (`pnpm event-mail known`): the events a mailed event is checked against, each
// as the duplicate check needs it and with where it is, main or the number of the open events PR that adds it.

import { z } from "zod";
import { clockSchema, kebabIdSchema } from "@/lib/shared/schema";

export const knownEventSchema = z.strictObject({
  id: kebabIdSchema,
  title: z.string(),
  start: z.iso.date(),
  end: z.iso.date().optional(),
  startTime: clockSchema.optional(),
  place: z.string(),
  where: z.union([z.literal("main"), z.int().positive()]),
});

/** An event as the duplicate check needs it; `where` is main or the number of the open PR that adds it. */
export type KnownEvent = z.infer<typeof knownEventSchema>;

export const knownEventsSchema = z.array(knownEventSchema);
