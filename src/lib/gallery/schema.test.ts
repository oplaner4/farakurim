import { describe, expect, it } from "vitest";
import type { Album } from "@/content/types/gallery";
import { albumNumber, albumSchema, galleryFileSchema } from "./schema";

const photo = (n: number) => ({
  small: `https://eu.zonerama.com/photos/${n}_800x533_18.jpg`,
  large: `https://eu.zonerama.com/photos/${n}_1600x1067_18.jpg`,
});

const album = (fields: Partial<Album> = {}): Album => ({
  id: "pout-vranov",
  title: "Pouť na Vranov",
  date: "2026-08-30",
  href: "https://www.zonerama.com/FarnostKurim/Album/16000001",
  photoCount: 2,
  photos: [photo(1), photo(2)],
  ...fields,
});

/** The paths of the problems zod found, "" for the root. */
const problemPaths = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.success ? [] : result.error!.issues.map((issue) => issue.path.join("."));

describe("albumSchema", () => {
  it("accepts an album, also without photos", () => {
    expect(albumSchema.parse(album())).toEqual(album());
    const { photos, ...withoutPhotos } = album();
    expect(albumSchema.parse(withoutPhotos)).toEqual(withoutPhotos);
  });

  it.each<[string, Partial<Album>, string]>([
    ["a non-kebab id", { id: "Pout_Vranov" }, "id"],
    ["an empty title", { title: "  " }, "title"],
    ["an invalid date", { date: "2026-02-30" }, "date"],
    ["another site's album", { href: "https://example.com/FarnostKurim/Album/1" }, "href"],
    ["another profile's album", { href: "https://www.zonerama.com/Someone/Album/1" }, "href"],
    ["no photos counted", { photoCount: 0, photos: [] }, "photoCount"],
    [
      "a photo URL off Zonerama",
      { photos: [photo(1), { ...photo(2), large: "https://example.com/x.jpg" }] },
      "photos.1.large",
    ],
    ["more photos than photoCount", { photoCount: 1 }, "photos"],
  ])("refuses %s", (_, fields, path) => {
    expect(problemPaths(albumSchema.safeParse(album(fields)))).toContain(path);
  });

  it("refuses an unknown field", () => {
    expect(albumSchema.safeParse({ ...album(), cover: "x.jpg" }).success).toBe(false);
  });
});

describe("galleryFileSchema", () => {
  const second = album({ id: "medovy-den", date: "2026-08-20", href: "https://www.zonerama.com/FarnostKurim/Album/2" });

  it("accepts albums newest first, two on the same day too", () => {
    expect(galleryFileSchema.safeParse({ albums: [album(), second] }).success).toBe(true);
    expect(galleryFileSchema.safeParse({ albums: [album(), { ...second, date: album().date }] }).success).toBe(true);
  });

  it("refuses albums out of order", () => {
    expect(problemPaths(galleryFileSchema.safeParse({ albums: [second, album()] }))).toEqual(["albums.1.date"]);
  });

  it("refuses a duplicate id", () => {
    const dup = { ...second, id: album().id };
    expect(problemPaths(galleryFileSchema.safeParse({ albums: [album(), dup] }))).toEqual(["albums.1.id"]);
  });

  it("refuses the same album twice, also once as eu. and once as www.", () => {
    const same = { ...second, href: "https://eu.zonerama.com/FarnostKurim/Album/16000001" };
    expect(problemPaths(galleryFileSchema.safeParse({ albums: [album(), same] }))).toEqual(["albums.1.href"]);
  });
});

describe("albumNumber", () => {
  it("is the album's number on Zonerama", () => {
    expect(albumNumber("https://eu.zonerama.com/FarnostKurim/Album/16583642")).toBe("16583642");
  });
});
