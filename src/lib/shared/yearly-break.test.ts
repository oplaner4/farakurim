import { describe, expect, it } from "vitest";
import { inYearlyBreak } from "./yearly-break";

describe("inYearlyBreak", () => {
  const summer = { from: "07-01", to: "08-31" };

  it("includes both ends of the break", () => {
    expect(inYearlyBreak("2026-07-01", summer)).toBe(true);
    expect(inYearlyBreak("2026-08-31", summer)).toBe(true);
  });

  it("excludes the days around the break", () => {
    expect(inYearlyBreak("2026-06-30", summer)).toBe(false);
    expect(inYearlyBreak("2026-09-01", summer)).toBe(false);
  });

  it("wraps over New Year when the break starts after it ends", () => {
    const winter = { from: "12-24", to: "01-06" };
    expect(inYearlyBreak("2027-01-02", winter)).toBe(true);
    expect(inYearlyBreak("2026-12-25", winter)).toBe(true);
    expect(inYearlyBreak("2026-07-01", winter)).toBe(false);
  });
});
