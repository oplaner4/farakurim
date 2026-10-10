import { describe, expect, it } from "vitest";
import { chronicle } from "./chronicle";
import { duplicates, isSorted } from "@/lib/test/content-checks";

describe("Kronika farnosti (chronicle.ts)", () => {
  const entries = chronicle.flatMap((era) => era.entries);

  it("has whole years, spans ending after they start, in order", () => {
    const wrong = entries.filter((e) => !Number.isInteger(e.year) || (e.until !== undefined && e.until <= e.year));
    expect(wrong).toEqual([]);
    for (const era of chronicle)
      expect(
        isSorted(era.entries, (a, b) => a.year <= b.year),
        era.id,
      ).toBe(true);
    expect(duplicates(chronicle.map((era) => era.id))).toEqual([]);
  });
});
