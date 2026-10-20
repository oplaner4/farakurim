import { describe, expect, it } from "vitest";
import type { Album } from "@/content/types/gallery";
import { albumPhoto, albumPhotoPath } from "./albums";
import { albumNumber, albumSchema, galleryFileSchema } from "./schema";

/** An album whose two photos are uploaded in the folder of its id. */
const album = (fields: Partial<Album> = {}): Album => {
  const id = fields.id ?? "pout-vranov";
  return {
    id,
    title: "Pouť na Vranov",
    date: "2026-08-30",
    href: "https://www.zonerama.com/FarnostKurim/Album/16000001",
    photoCount: 2,
    photos: [albumPhoto(id, 1), albumPhoto(id, 2)],
    ...fields,
  };
};
const photo = (n: number) => albumPhoto("pout-vranov", n);

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
      "a photo off the uploads",
      { photos: [photo(1), { ...photo(2), large: "https://example.com/x.jpg" }] },
      "photos.1.large",
    ],
    [
      "a Zonerama photo URL",
      {
        photos: [
          {
            small: "https://eu.zonerama.com/photos/1_800x533_18.jpg",
            large: "https://eu.zonerama.com/photos/1_1600x1067_18.jpg",
          },
          photo(2),
        ],
      },
      "photos.0.small",
    ],
    ["a photo in another album's folder", { photos: [photo(1), albumPhoto("jine-album", 2)] }, "photos"],
    [
      "a photo at the wrong width",
      { photos: [{ ...photo(1), small: albumPhotoPath("pout-vranov", 1, 400) }, photo(2)] },
      "photos",
    ],
    ["photos out of position", { photos: [photo(2), photo(1)] }, "photos"],
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
    const dup = album({ date: second.date, href: second.href });
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
