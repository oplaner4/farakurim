import { describe, expect, it } from "vitest";
import type { PetrklicIssue } from "@/content/types/petrklic";
import {
  groupByYear,
  isNewerIssue,
  issueId,
  issueLabel,
  pageImages,
  stepPage,
  toIssue,
  toRoman,
  viewerSpread,
  volumeOf,
} from "./issues";

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

describe("issueId", () => {
  it("is the year and number, with the note's slug for a special issue", () => {
    expect(issueId({ year: 2026, number: 2 })).toBe("2026-2");
    expect(issueId({ year: 2012, number: 4, note: "mimořádné" })).toBe("2012-4-mimoradne");
    expect(issueId({ year: 2012, number: 1, note: "2. část" })).toBe("2012-1-2-cast");
  });
});

describe("toIssue", () => {
  it("adds the id and the URLs of the PDF and the cover", () => {
    expect(toIssue({ year: 2026, number: 1, pageCount: 36 })).toEqual({
      id: "2026-1",
      year: 2026,
      number: 1,
      pageCount: 36,
      pdfUrl: "/uploads/petrklic/2026-1/petrklic-2026-1.pdf",
      cover: "/uploads/petrklic/2026-1/cover.webp",
    });
    expect(toIssue({ year: 2012, number: 4, note: "mimořádné", pageCount: 4 })).toMatchObject({
      id: "2012-4-mimoradne",
      note: "mimořádné",
      pdfUrl: "/uploads/petrklic/2012-4-mimoradne/petrklic-2012-4-mimoradne.pdf",
    });
  });

  it("puts a corrected PDF in the rev's folder, under the same name", () => {
    expect(toIssue({ year: 2026, number: 2, rev: 2, pageCount: 36 })).toMatchObject({
      id: "2026-2",
      rev: 2,
      pdfUrl: "/uploads/petrklic/2026-2-r2/petrklic-2026-2.pdf",
      cover: "/uploads/petrklic/2026-2-r2/cover.webp",
    });
  });
});

describe("pageImages", () => {
  it("lists one image per page", () => {
    expect(pageImages({ id: "2026-1", pageCount: 2 })).toEqual([
      "/uploads/petrklic/2026-1/pages/1.webp",
      "/uploads/petrklic/2026-1/pages/2.webp",
    ]);
    expect(pageImages({ id: "2026-1", rev: 3, pageCount: 1 })).toEqual(["/uploads/petrklic/2026-1-r3/pages/1.webp"]);
  });
});

describe("isNewerIssue", () => {
  it("compares the year, then the number", () => {
    expect(isNewerIssue({ year: 2026, number: 1 }, { year: 2025, number: 4 })).toBe(true);
    expect(isNewerIssue({ year: 2026, number: 2 }, { year: 2026, number: 1 })).toBe(true);
    expect(isNewerIssue({ year: 2026, number: 1 }, { year: 2026, number: 1 })).toBe(false);
    expect(isNewerIssue({ year: 2025, number: 4 }, { year: 2026, number: 1 })).toBe(false);
  });
});
