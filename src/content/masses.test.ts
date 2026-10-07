import { describe, expect, it } from "vitest";
import { parishChurches, regularServices } from "./masses";
import { parish } from "./site";
import { isClock, isPlaceId } from "./test-helpers";

describe("Pravidelné bohoslužby (masses.ts)", () => {
  it("has a valid regular schedule", () => {
    for (const s of regularServices) {
      expect(s.weekday, s.time).toBeGreaterThanOrEqual(0);
      expect(s.weekday).toBeLessThanOrEqual(6);
      expect(isClock(s.time), s.time).toBe(true);
      expect(isPlaceId(s.place), s.place).toBe(true);
    }
  });

  it("only lets a not-first-in-month service give way to a first-in-month variant", () => {
    const firstInMonth = (weekday: number, place: string) =>
      regularServices.some((s) => s.rule === "first-in-month" && s.weekday === weekday && s.place === place);
    const orphans = regularServices.filter((s) => s.rule === "not-first-in-month" && !firstInMonth(s.weekday, s.place));
    expect(orphans).toEqual([]);
  });
});

describe("Kostely a kaple (masses.ts)", () => {
  it("has one church or chapel per village of the parish, in the footer's order", () => {
    expect(parishChurches.map((c) => c.village)).toEqual(parish.villages.map((v) => v.name));
    for (const c of parishChurches) expect(c.building, c.village).not.toBe("");
  });
});
