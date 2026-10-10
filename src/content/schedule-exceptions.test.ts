import { describe, expect, it, vi } from "vitest";
import { isSorted } from "@/lib/test/content-checks";
import { serviceSheets } from "@/server/ohlasky";
import { laterExceptions } from "./schedule-exceptions";

vi.mock("server-only", () => ({}));

// The rules of an entry (dates, times, parish churches, unknown fields) are scheduleExceptionsFileSchema's:
// schedule-exceptions.ts checks them on import, so a broken file fails here naming the field.
describe("Later changes (schedule-exceptions.json)", () => {
  it("are after the last sheet, one per date, in order", () => {
    // `pnpm stage porad … --record` removes the entries a new sheet covers.
    const lastDay = serviceSheets.at(-1)!.validTo;
    expect(laterExceptions.filter((x) => x.date <= lastDay).map((x) => x.date)).toEqual([]);
    expect(isSorted(laterExceptions, (a, b) => a.date < b.date)).toBe(true);
  });
});
