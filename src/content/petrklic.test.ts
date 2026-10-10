import { describe, expect, it } from "vitest";
import { petrklicIssues } from "./petrklic";
import { duplicates, isSorted, UPLOAD } from "@/lib/test/content-checks";

describe("Petrklíč (petrklic.ts)", () => {
  it("has unique IDs named after the year and number", () => {
    expect(duplicates(petrklicIssues.map((i) => i.id))).toEqual([]);
    for (const i of petrklicIssues) expect(i.id.startsWith(`${i.year}-${i.number}`), i.id).toBe(true);
  });

  it("lists the issues newest first", () => {
    const newer = (a: (typeof petrklicIssues)[number], b: (typeof petrklicIssues)[number]) =>
      a.year > b.year || (a.year === b.year && a.number >= b.number);
    expect(isSorted(petrklicIssues, newer)).toBe(true);
  });

  it("has uploaded files and a page image per page", () => {
    for (const i of petrklicIssues) {
      expect(i.pageCount, i.id).toBeGreaterThan(0);
      expect(i.pdfUrl).toMatch(UPLOAD);
      if (i.cover) expect(i.cover).toMatch(UPLOAD);
      if (i.pageImages) expect(i.pageImages, i.id).toHaveLength(i.pageCount);
    }
  });
});
