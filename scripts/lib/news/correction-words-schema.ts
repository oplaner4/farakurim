// The schema of the correction words file (`pnpm event-mail corrections`): where the event mail holds a word that
// marks a correction of an event, and of which kind, never the mail's text.

import { z } from "zod";

export const correctionKinds = ["correction", "change", "move", "cancellation"] as const;

export const correctionWordSchema = z.strictObject({
  /** `subject`, `text` or `attachment <n>` (its place in the mail, from 1). */
  where: z.string().regex(/^(subject|text|attachment [1-9]\d*)$/),
  kind: z.enum(correctionKinds),
});

/** A correction word found: where in the mail, and its kind. */
export type CorrectionWord = z.infer<typeof correctionWordSchema>;

export const correctionWordsSchema = z.array(correctionWordSchema);
