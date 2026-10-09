import { describe, expect, it, vi } from "vitest";
import * as z from "zod";
import { serviceSheetSchema } from "@/lib/services/schema";
import { sheetOrderProblems } from "@/lib/services/service-sheet";
import { events } from "@/content/news";
import { isClock, isIsoDate, isPlaceId, isSorted } from "@/content/test-helpers";
import { laterExceptions, serviceSheets } from "./index";

vi.mock("server-only", () => ({}));

describe("Ohlášky (ohlasky/)", () => {
  it("has at least one sheet, in order, sharing at most their boundary days", () => {
    expect(serviceSheets.length).toBeGreaterThan(0);
    expect(sheetOrderProblems(serviceSheets)).toEqual([]);
  });

  // The rules of one sheet (every day of its period, times, row order, the PDF link, unknown fields) are the
  // schema's, shared with the stage script; failures name the field.
  it.each(serviceSheets.map((s) => [s.validFrom, s] as const))("%s matches the sheet schema", (_, sheet) => {
    const result = serviceSheetSchema.safeParse(sheet);
    expect(result.success, result.error && z.prettifyError(result.error)).toBe(true);
  });

  it("links announcements to existing Aktuality", () => {
    const ids = new Set(events.map((e) => e.id));
    const missing = serviceSheets.flatMap((s) => s.announcements.filter((a) => a.newsId && !ids.has(a.newsId)));
    expect(missing.map((a) => a.newsId)).toEqual([]);
  });

  it("has valid hand-entered exceptions after the last sheet, one per date, in order", () => {
    // The sheets replace a covered entry anyway: remove it when the stage script names it.
    const lastDay = serviceSheets.at(-1)!.validTo;
    expect(laterExceptions.every((x) => x.date > lastDay)).toBe(true);
    expect(isSorted(laterExceptions, (a, b) => a.date < b.date)).toBe(true);
    for (const x of laterExceptions) {
      expect(isIsoDate(x.date), x.date).toBe(true);
      expect(
        x.services.every((m) => isClock(m.time) && isPlaceId(m.place)),
        x.date,
      ).toBe(true);
    }
  });
});
