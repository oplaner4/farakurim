import { describe, expect, it } from "vitest";
import type { PetrklicRecord } from "@/content/types/petrklic";
import { petrklicFileSchema, petrklicRecordSchema } from "./schema";

const record = (fields: Partial<PetrklicRecord> = {}): PetrklicRecord => ({
  year: 2026,
  number: 1,
  pageCount: 36,
  ...fields,
});

/** The paths of the problems zod found. */
const problemPaths = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.success ? [] : result.error!.issues.map((issue) => issue.path.join("."));

describe("petrklicRecordSchema", () => {
  it("accepts an issue, with and without a note", () => {
    expect(petrklicRecordSchema.parse(record())).toEqual(record());
    expect(petrklicRecordSchema.parse(record({ note: "mimořádné" }))).toEqual(record({ note: "mimořádné" }));
  });

  it.each<[string, Partial<PetrklicRecord>, string]>([
    ["a year before the first volume", { year: 2005 }, "year"],
    ["a year that is not whole", { year: 2026.5 }, "year"],
    ["number 0", { number: 0 }, "number"],
    ["no pages", { pageCount: 0 }, "pageCount"],
    ["an empty note", { note: " " }, "note"],
    ["a note without a letter or digit", { note: "–!" }, "note"],
  ])("refuses %s", (_, fields, path) => {
    expect(problemPaths(petrklicRecordSchema.safeParse(record(fields)))).toContain(path);
  });

  it("refuses an unknown field", () => {
    expect(petrklicRecordSchema.safeParse({ ...record(), id: "2026-1" }).success).toBe(false);
  });
});

describe("petrklicFileSchema", () => {
  const issues = (...list: PetrklicRecord[]) => ({ issues: list });

  it("accepts issues newest first, two parts of one issue too", () => {
    expect(petrklicFileSchema.safeParse(issues(record({ number: 2 }), record())).success).toBe(true);
    const parts = issues(record({ note: "2. část" }), record({ note: "1. část" }), record({ year: 2025, number: 4 }));
    expect(petrklicFileSchema.safeParse(parts).success).toBe(true);
  });

  it("refuses issues out of order", () => {
    expect(problemPaths(petrklicFileSchema.safeParse(issues(record(), record({ number: 2 }))))).toEqual(["issues.1"]);
  });

  it("refuses a taken id, also two parts with the same note", () => {
    expect(problemPaths(petrklicFileSchema.safeParse(issues(record(), record())))).toEqual(["issues.1"]);
    const same = issues(record({ note: "1. část" }), record({ note: "1. Část" }));
    expect(problemPaths(petrklicFileSchema.safeParse(same))).toEqual(["issues.1"]);
  });
});
