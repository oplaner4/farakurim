import { describe, expect, it, vi } from "vitest";
import { events } from "./news";
import { scheduleExceptions, serviceSheet } from "./ohlasky";
import { isClock, isIsoDate, isPlaceId, isSorted, minutes, UPLOAD } from "./test-helpers";

vi.mock("server-only", () => ({}));

describe("Ohlášky (ohlasky.ts)", () => {
  it("covers one week of consecutive days in the ohlášky", () => {
    const { validFrom, validTo, days } = serviceSheet;
    expect([validFrom, validTo, ...days.map((d) => d.date)].every(isIsoDate)).toBe(true);
    expect(validFrom <= validTo).toBe(true);
    expect(isSorted(days, (a, b) => a.date < b.date)).toBe(true);
    expect(days.every((d) => d.date >= validFrom && d.date <= validTo)).toBe(true);
    // During the week only the sheet's masses count, so a missing day would have none.
    const week = scheduleExceptions.filter((x) => x.date >= validFrom && x.date <= validTo).map((x) => x.date);
    expect(days.map((d) => d.date)).toEqual(week);
    expect(serviceSheet.pdfUrl).toMatch(UPLOAD);
  });

  it("lists the ohlášky rows of a day in time order", () => {
    for (const day of serviceSheet.days) {
      expect(
        day.rows.every((r) => isClock(r.time)),
        day.date,
      ).toBe(true);
      expect(
        isSorted(day.rows, (a, b) => minutes(a.time) <= minutes(b.time)),
        day.date,
      ).toBe(true);
    }
  });

  it("links announcements to existing Aktuality", () => {
    const ids = new Set(events.map((e) => e.id));
    const missing = serviceSheet.announcements.filter((a) => a.newsId && !ids.has(a.newsId)).map((a) => a.newsId);
    expect(missing).toEqual([]);
  });

  it("has valid schedule exceptions", () => {
    for (const x of scheduleExceptions) {
      expect(isIsoDate(x.date), x.date).toBe(true);
      expect(
        x.services.every((m) => isClock(m.time) && isPlaceId(m.place)),
        x.date,
      ).toBe(true);
    }
  });
});
