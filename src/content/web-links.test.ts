import { describe, expect, it } from "vitest";
import { duplicates } from "./test-helpers";
import { linkGroups } from "./web-links";

describe("Odkazy (web-links.ts)", () => {
  const all = linkGroups.flatMap((g) => g.links);

  it("links only to https sites, each once", () => {
    expect(all.every((l) => l.href.startsWith("https://"))).toBe(true);
    expect(duplicates(all.map((l) => l.href))).toEqual([]);
    expect(duplicates(linkGroups.map((g) => g.id))).toEqual([]);
  });

  it("describes every link", () => {
    expect(all.every((l) => l.name.trim() && l.description.trim())).toBe(true);
  });
});
