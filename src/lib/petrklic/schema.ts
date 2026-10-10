import * as z from "zod";
import type { PetrklicFile, PetrklicRecord } from "@/content/types/petrklic";
import { slug } from "@/lib/shared/slug";
import { FIRST_YEAR, isNewerIssue, issueId, issueLabel } from "./issues";

// The rules of the Petrklíč issues, in one place: src/content/petrklic.ts checks src/content/petrklic.json with them
// when the site loads it, and scripts/add-petrklic.ts checks a new issue and the file before `pnpm stage petrklic`
// copies its PDF.

const count = z.int().positive();

export const petrklicRecordSchema = z.strictObject({
  year: z.int().min(FIRST_YEAR, `must be ${FIRST_YEAR} or later (the first volume)`),
  number: count,
  // The note is part of the id ("2012-4-mimoradne"), so it needs a letter or digit.
  note: z
    .string()
    .trim()
    .min(1)
    .refine((note) => slug(note) !== "", "must contain a letter or digit")
    .optional(),
  pageCount: count,
}) satisfies z.ZodType<PetrklicRecord>;

export const petrklicFileSchema = z
  .strictObject({ issues: z.array(petrklicRecordSchema) })
  .superRefine(({ issues }, ctx) => {
    issues.forEach((issue, i) => {
      const id = issueId(issue);
      if (issues.slice(0, i).some((other) => issueId(other) === id)) {
        ctx.addIssue({ code: "custom", path: ["issues", i], message: `the id ${id} is already taken` });
      }
      if (i > 0 && isNewerIssue(issue, issues[i - 1])) {
        ctx.addIssue({
          code: "custom",
          path: ["issues", i],
          message: `must not be newer than the issue before it (${issueLabel(issues[i - 1])}): newest first`,
        });
      }
    });
  }) satisfies z.ZodType<PetrklicFile>;
