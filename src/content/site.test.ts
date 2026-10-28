import { describe, expect, it } from "vitest";
import { groupPages } from "./groups";
import { contacts, links, navGroups } from "./site";
import { clockMinutes } from "@/lib/shared/clock";
import { isClock, isMonthDay } from "@/test/content-checks";

describe("Úřední hodiny (site.ts)", () => {
  it("has valid office hours", () => {
    for (const slot of contacts.officeHours) {
      expect(isClock(slot.from) && isClock(slot.to), `${slot.from}–${slot.to}`).toBe(true);
      expect(clockMinutes(slot.to)).toBeGreaterThan(clockMinutes(slot.from));
      if (slot.closed) expect(isMonthDay(slot.closed.from) && isMonthDay(slot.closed.to)).toBe(true);
    }
  });
});

describe("Menu (site.ts)", () => {
  it("leads every link of the Více menu and Další skupiny to a page of the site", () => {
    const pages = new Set(Object.values(links));
    const hrefs = [...navGroups.flatMap((g) => g.links.map((l) => l.href)), ...groupPages.map((g) => g.href)];
    expect(hrefs.filter((href) => !pages.has(href))).toEqual([]);
  });
});
