import { describe, expect, it } from "vitest";
import type { PetrklicIssue } from "@/content/types/petrklic";
import { groupByYear, issueLabel, stepPage, toRoman, viewerSpread, volumeOf } from "./issues";

const issue = (year: number, number: number, note?: string): PetrklicIssue => ({
  id: `${year}-${number}${note ?? ""}`,
  year,
  number,
  ...(note && { note }),
  pdfUrl: "",
  pageCount: 16,
});

describe("volumeOf", () => {
  it("counts the volumes from 2006 in Roman numerals", () => {
    expect(volumeOf(2006)).toBe("I");
    expect(volumeOf(2019)).toBe("XIV");
    expect(volumeOf(2023)).toBe("XVIII");
    expect(volumeOf(2026)).toBe("XXI");
    expect(toRoman(49)).toBe("XLIX");
  });
});

describe("issueLabel", () => {
  it("adds the note of a special issue", () => {
    expect(issueLabel(issue(2026, 1))).toBe("1/2026");
    expect(issueLabel(issue(2012, 1, "2. část"))).toBe("1/2012 (2. část)");
  });
});

describe("groupByYear", () => {
  it("keeps the order and computes each year's volume", () => {
    const years = groupByYear([issue(2026, 1), issue(2025, 4), issue(2025, 3)]);
    expect(years.map((y) => [y.year, y.volume, y.issues.length])).toEqual([
      [2026, "XXI", 1],
      [2025, "XX", 2],
    ]);
  });
});

describe("viewerSpread", () => {
  it("shows one page on tablet", () => {
    expect(viewerSpread(5, 16, false)).toEqual({ pages: [5], label: "Strana 5 / 16" });
  });

  it("shows the cover alone and then two-page spreads on desktop", () => {
    expect(viewerSpread(1, 16, true)).toEqual({ pages: [1], label: "Strana 1 / 16" });
    expect(viewerSpread(2, 16, true)).toEqual({ pages: [2, 3], label: "Strany 2–3 / 16" });
    expect(viewerSpread(3, 16, true).pages).toEqual([2, 3]);
    expect(viewerSpread(16, 16, true)).toEqual({ pages: [16], label: "Strana 16 / 16" });
    expect(viewerSpread(15, 15, true).pages).toEqual([14, 15]);
  });
});

describe("stepPage", () => {
  it("moves by one page, or by a spread, within the issue", () => {
    expect(stepPage(1, 1, 16, false)).toBe(2);
    expect(stepPage(1, -1, 16, false)).toBe(1);
    expect(stepPage(1, 1, 16, true)).toBe(2);
    expect(stepPage(2, 1, 16, true)).toBe(4);
    expect(stepPage(3, -1, 16, true)).toBe(1);
    expect(stepPage(14, 1, 16, true)).toBe(16);
    expect(stepPage(16, 1, 16, true)).toBe(16);
  });
});
