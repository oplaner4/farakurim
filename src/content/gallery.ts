import * as z from "zod";
import type { Album } from "@/content/types/gallery";
import { galleryFileSchema } from "@/lib/gallery/schema";
import data from "./gallery.json";

// The Fotogalerie albums (src/content/gallery.json, written by `pnpm add-album`, farnost-create-album skill):
// Zonerama albums, newest first, the photos linked from Zonerama. Checked on import, so a broken file fails the build
// naming the field.

/** The parish's profile on Zonerama, with the older albums. */
export const GALLERY_URL = "https://www.zonerama.com/FarnostKurim/425053";

const parsed = galleryFileSchema.safeParse(data);
if (!parsed.success) throw new Error(`src/content/gallery.json is not valid:\n${z.prettifyError(parsed.error)}`);

/** Newest first. */
export const albums: Album[] = parsed.data.albums;
