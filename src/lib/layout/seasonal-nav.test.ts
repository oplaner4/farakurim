import { describe, expect, it } from "vitest";
import type { NativitySeason } from "@/content/types/nativity";
import { seasonalItem, seasonalPeriods } from "./seasonal-nav";

const season = {
  year: 2026,
  openingDays: [
    { date: "2026-12-19", from: "14:00", to: "17:00" },
    { date: "2027-01-03", from: "14:00", to: "17:00" },
  ],
} as NativitySeason;

describe("seasonal main-menu item", () => {
  const periods = seasonalPeriods([season], { year: 2027, end: "2027-08-14", applications: "" });

  it("is Betlémy from 1. 11. to the exhibition's last day", () => {
    expect(seasonalItem(periods, "2026-10-31")).toBe("petrklic");
    expect(seasonalItem(periods, "2026-11-01")).toBe("nativity");
    expect(seasonalItem(periods, "2027-01-03")).toBe("nativity");
    expect(seasonalItem(periods, "2027-01-04")).toBe("petrklic");
  });

  it("is Tábor from 1. 3. to the camp's last day", () => {
    expect(seasonalItem(periods, "2027-02-28")).toBe("petrklic");
    expect(seasonalItem(periods, "2027-03-01")).toBe("camp");
    expect(seasonalItem(periods, "2027-08-14")).toBe("camp");
    expect(seasonalItem(periods, "2027-08-15")).toBe("petrklic");
  });

  it("has no Tábor period until the camp's end date is known", () => {
    const withoutEnd = seasonalPeriods([season], { year: 2027, applications: "" });
    expect(seasonalItem(withoutEnd, "2027-05-01")).toBe("petrklic");
  });
});
