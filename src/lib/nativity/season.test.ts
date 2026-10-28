import { describe, expect, it } from "vitest";
import type { NativitySeason } from "@/content/types/nativity";
import { at } from "@/test/fixtures";
import { currentSeason, exhibitionState, openingStatus, seasonStart, yearsSinceGreccio } from "./season";

const season = (year: number, days: [string, string, string][]) =>
  ({ year, openingDays: days.map(([date, from, to]) => ({ date, from, to })) }) as NativitySeason;

const s2026 = season(2026, [
  ["2026-12-19", "14:00", "17:00"],
  ["2026-12-20", "10:30", "12:00"],
  ["2027-01-03", "14:00", "17:00"],
]);
const s2025 = season(2025, [
  ["2025-12-20", "14:00", "17:00"],
  ["2026-01-04", "14:00", "17:00"],
]);
const seasons = [s2026, s2025];

describe("currentSeason", () => {
  it("switches to a season on 1. 11. of its year", () => {
    expect(seasonStart(s2026)).toBe("2026-11-01");
    expect(currentSeason(seasons, "2026-10-31")).toBe(s2025);
    expect(currentSeason(seasons, "2026-11-01")).toBe(s2026);
    expect(currentSeason(seasons, "2027-06-01")).toBe(s2026);
  });

  it("shows the oldest season before any has started", () => {
    expect(currentSeason(seasons, "2025-06-01")).toBe(s2025);
  });
});

describe("exhibitionState", () => {
  it("follows the first and the last opening day", () => {
    expect(exhibitionState(s2026, "2026-11-01")).toBe("before");
    expect(exhibitionState(s2026, "2026-12-19")).toBe("during");
    expect(exhibitionState(s2026, "2026-12-22")).toBe("during");
    expect(exhibitionState(s2026, "2027-01-03")).toBe("during");
    expect(exhibitionState(s2026, "2027-01-04")).toBe("after");
  });
});

describe("openingStatus", () => {
  it("is open within today's hours", () => {
    expect(openingStatus(s2026, at("2026-12-19", "15:00"))).toMatchObject({
      today: { date: "2026-12-19" },
      open: true,
      next: { date: "2026-12-20" },
    });
  });

  it("gives today's hours before they start", () => {
    expect(openingStatus(s2026, at("2026-12-20", "9:00"))).toMatchObject({
      today: { date: "2026-12-20" },
      open: false,
    });
  });

  it("drops today once its hours are over", () => {
    const status = openingStatus(s2026, at("2026-12-20", "12:00"));
    expect(status.today).toBeUndefined();
    expect(status.open).toBe(false);
    expect(status.next?.date).toBe("2027-01-03");
  });

  it("gives the next day on a closed day, and none after the last one", () => {
    expect(openingStatus(s2026, at("2026-12-23")).next?.date).toBe("2027-01-03");
    expect(openingStatus(s2026, at("2027-01-03")).next).toBeUndefined();
  });
});

describe("yearsSinceGreccio", () => {
  it("counts from the first nativity scene in 1223", () => {
    expect(yearsSinceGreccio(2026)).toBe(803);
  });
});
