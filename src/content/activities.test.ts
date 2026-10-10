import { describe, expect, it } from "vitest";
import { activityGroups } from "./activities";
import { duplicates } from "@/lib/test/content-checks";

describe("Seznam aktivit (activities.ts)", () => {
  it("names each activity once per group", () => {
    for (const g of activityGroups) expect(duplicates(g.activities.map((a) => a.name)), g.id).toEqual([]);
    expect(duplicates(activityGroups.map((g) => g.id))).toEqual([]);
  });
});
