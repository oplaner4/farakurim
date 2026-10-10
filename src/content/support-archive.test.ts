import { describe, expect, it } from "vitest";
import { pastProjects } from "./support-archive";
import { duplicates, isSorted } from "@/lib/test/content-checks";

describe("Starší projekty (support-archive.ts)", () => {
  it("lists each project once, its years newest first", () => {
    expect(duplicates(pastProjects.map((p) => p.id))).toEqual([]);
    for (const p of pastProjects)
      expect(
        isSorted(p.years, (a, b) => a.year >= b.year),
        p.id,
      ).toBe(true);
  });

  it("keeps the amounts whole and not negative", () => {
    const amounts = pastProjects.flatMap((p) => p.years.flatMap((y) => [y.budget, y.grants, y.gifts, y.costs]));
    expect(amounts.every((a) => a === null || (Number.isInteger(a) && a >= 0))).toBe(true);
  });
});
