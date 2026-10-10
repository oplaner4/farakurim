import * as z from "zod";
import type { Album, GalleryFile } from "@/content/types/gallery";

// The rules of the Fotogalerie albums, in one place: src/content/gallery.ts checks src/content/gallery.json with them
// when the site loads it, and scripts/add-album.ts checks a new album and the file before it writes. How many albums
// the site keeps (MAX_ALBUMS) is the content test's rule and the script's, not the loader's.

const text = z.string().trim().min(1);
const photoUrl = z.string().regex(/^https:\/\/eu\.zonerama\.com\/photos\/\S+$/, "must be a Zonerama photo URL");

/** The album's number on Zonerama: the same for its eu. and www. URL. */
export const albumNumber = (href: string) => href.split("/").at(-1)!;

export const albumSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be ASCII kebab-case"),
    title: text,
    date: z.iso.date(),
    href: z
      .string()
      .regex(
        /^https:\/\/(www|eu)\.zonerama\.com\/FarnostKurim\/Album\/\d+$/,
        "must be a FarnostKurim album on Zonerama",
      ),
    photoCount: z.int().positive(),
    photos: z.array(z.strictObject({ small: photoUrl, large: photoUrl })).optional(),
  })
  .superRefine((album, ctx) => {
    if (album.photos && album.photos.length > album.photoCount) {
      ctx.addIssue({ code: "custom", path: ["photos"], message: `more than photoCount (${album.photoCount})` });
    }
  }) satisfies z.ZodType<Album>;

export const galleryFileSchema = z.strictObject({ albums: z.array(albumSchema) }).superRefine(({ albums }, ctx) => {
  albums.forEach((album, i) => {
    const earlier = albums.slice(0, i);
    if (earlier.some((a) => a.id === album.id)) {
      ctx.addIssue({ code: "custom", path: ["albums", i, "id"], message: `${album.id} is already taken` });
    }
    if (earlier.some((a) => albumNumber(a.href) === albumNumber(album.href))) {
      ctx.addIssue({ code: "custom", path: ["albums", i, "href"], message: "this album is already in the list" });
    }
    if (i > 0 && album.date > albums[i - 1].date) {
      ctx.addIssue({
        code: "custom",
        path: ["albums", i, "date"],
        message: `must not be after the album before it (${albums[i - 1].date}): newest first`,
      });
    }
  });
}) satisfies z.ZodType<GalleryFile>;
