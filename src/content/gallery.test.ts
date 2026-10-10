import { describe, expect, it } from "vitest";
import { albums } from "./gallery";
import { duplicates, isIsoDate, isSorted } from "@/lib/test/content-checks";

describe("Fotogalerie (gallery.ts)", () => {
  it("has unique IDs and lists the albums newest first", () => {
    expect(duplicates(albums.map((a) => a.id))).toEqual([]);
    expect(albums.every((a) => isIsoDate(a.date))).toBe(true);
    expect(isSorted(albums, (a, b) => a.date >= b.date)).toBe(true);
  });

  it("links Zonerama and never shows more photos than the album has", () => {
    for (const a of albums) {
      expect(a.href, a.id).toMatch(/^https:\/\/(www|eu)\.zonerama\.com\//);
      expect(a.photoCount, a.id).toBeGreaterThan(0);
      if (a.photos) expect(a.photos.length, a.id).toBeLessThanOrEqual(a.photoCount);
    }
  });
});
