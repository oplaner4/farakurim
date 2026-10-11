import { describe, expect, it } from "vitest";
import * as z from "zod";
import { petrklicFileSchema, petrklicRecordSchema } from "@/lib/petrklic/schema";
import { petrklicIssues } from "./petrklic";
import data from "./petrklic.json";
import { isUpload } from "@/lib/shared/uploads";

const problems = (result: z.ZodSafeParseResult<unknown>) => (result.success ? "" : z.prettifyError(result.error));

describe("Petrklíč (petrklic.json)", () => {
  it.each(data.issues.map((record, i) => [petrklicIssues[i].id, record] as const))(
    "issue %s matches the schema",
    (_, record) => {
      expect(problems(petrklicRecordSchema.safeParse(record))).toBe("");
    },
  );

  it("has unique ids, newest first", () => {
    expect(problems(petrklicFileSchema.safeParse(data))).toBe("");
  });

  it("has uploaded files and a page image per page of the current issue", () => {
    for (const i of petrklicIssues) {
      expect(isUpload(i.pdfUrl), i.id).toBe(true);
      if (i.cover) expect(isUpload(i.cover), i.id).toBe(true);
    }
    expect(petrklicIssues[0].pageImages).toHaveLength(petrklicIssues[0].pageCount);
    expect(petrklicIssues.slice(1).every((i) => i.pageImages === undefined)).toBe(true);
  });
});
