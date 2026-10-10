import { describe, expect, it, vi } from "vitest";
import { sheetOrderProblems } from "@/lib/services/service-sheet";
import { events } from "@/content/news";
import { serviceSheets } from "@/server/ohlasky";

vi.mock("server-only", () => ({}));

// The rules of the file itself (every day of a sheet's period, times, places, the PDF link, unknown fields) are
// ohlaskyFileSchema's: src/server/ohlasky.ts checks them on import, so a broken file fails here naming the field.
describe("Ohlášky (ohlasky.json)", () => {
  it("has at least one sheet, in order, sharing at most their boundary days", () => {
    expect(serviceSheets.length).toBeGreaterThan(0);
    expect(sheetOrderProblems(serviceSheets)).toEqual([]);
  });

  it("links announcements to existing Aktuality", () => {
    const ids = new Set(events.map((e) => e.id));
    const missing = serviceSheets.flatMap((s) => s.announcements.filter((a) => a.newsId && !ids.has(a.newsId)));
    expect(missing.map((a) => a.newsId)).toEqual([]);
  });
});
