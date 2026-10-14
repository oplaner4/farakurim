import { describe, expect, it } from "vitest";
import { sheetCovering } from "@/lib/services/service-sheet";
import { isSorted } from "@/test/content-checks";
import { serviceSheets } from "@/server/service-sheets";
import { laterExceptions } from "./schedule-exceptions";

// The rules of an entry (dates, times, parish churches, unknown fields) are scheduleExceptionsFileSchema's:
// schedule-exceptions.ts checks them on import, so a broken file fails here naming the field.
describe("Later changes (schedule-exceptions.json)", () => {
  it("are on days no sheet covers, one per date, in order", () => {
    // `pnpm stage sheet … --record` removes the entries a new sheet covers.
    expect(laterExceptions.filter((x) => sheetCovering(serviceSheets, x.date)).map((x) => x.date)).toEqual([]);
    expect(isSorted(laterExceptions, (a, b) => a.date < b.date)).toBe(true);
  });
});
