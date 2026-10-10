import { describe, expect, it } from "vitest";
import { contacts } from "./site";
import { isClock, isMonthDay, minutes } from "@/lib/test/content-checks";

describe("Úřední hodiny (site.ts)", () => {
  it("has valid office hours", () => {
    for (const slot of contacts.officeHours) {
      expect(isClock(slot.from) && isClock(slot.to), `${slot.from}–${slot.to}`).toBe(true);
      expect(minutes(slot.to)).toBeGreaterThan(minutes(slot.from));
      if (slot.closed) expect(isMonthDay(slot.closed.from) && isMonthDay(slot.closed.to)).toBe(true);
    }
  });
});
