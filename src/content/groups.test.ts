import { describe, expect, it } from "vitest";
import { groupPages } from "./groups";
import { links } from "./site";
import { duplicates, UPLOAD } from "./test-helpers";

describe("Stránky skupin (groups.ts)", () => {
  it("links the group pages' files root-relative under /uploads/", () => {
    const files = groupPages.flatMap((group) => [
      ...(group.hero ? [group.hero.src, group.hero.small] : []),
      ...(group.photos ?? []).flatMap((p) => [p.small, p.large]),
      ...(group.videos ?? []).map((v) => v.thumbnail),
    ]);
    expect(files.filter((f) => !UPLOAD.test(f))).toEqual([]);
    expect(duplicates(groupPages.map((g) => g.id))).toEqual([]);
  });

  it("serves each group page under Seznam aktivit at its id", () => {
    // The route src/app/aktivity/[skupina]/ builds /aktivity/<id>/; a different href would link to a 404.
    expect(groupPages.filter((g) => g.href !== `${links.activities}${g.id}/`).map((g) => g.id)).toEqual([]);
  });
});
