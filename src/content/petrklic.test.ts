import { describe, expect, it } from "vitest";
import { parsePetrklicId } from "@/lib/petrklic/issues";
import { duplicates, isSorted, UPLOAD } from "@/lib/test/content-checks";
import { petrklicIssues } from "./petrklic";

describe("Petrklíč (petrklic.ts)", () => {
  it("has unique IDs named after the year and number", () => {
    expect(duplicates(petrklicIssues.map((i) => i.id))).toEqual([]);
    // Parsed, not a prefix check: "2026-12" starts with "2026-1" but is issue 12.
    for (const i of petrklicIssues) expect(parsePetrklicId(i.id), i.id).toEqual({ year: i.year, number: i.number });
  });

  it("lists the issues newest first", () => {
    const newer = (a: (typeof petrklicIssues)[number], b: (typeof petrklicIssues)[number]) =>
      a.year > b.year || (a.year === b.year && a.number >= b.number);
    expect(isSorted(petrklicIssues, newer)).toBe(true);
  });

  it("has uploaded files and a page image per page", () => {
    for (const i of petrklicIssues) {
      expect(Number.isInteger(i.pageCount) && i.pageCount > 0, i.id).toBe(true);
      expect(i.pdfUrl).toMatch(UPLOAD);
      if (i.cover) expect(i.cover).toMatch(UPLOAD);
      if (i.pageImages) expect(i.pageImages, i.id).toHaveLength(i.pageCount);
    }
  });
});
