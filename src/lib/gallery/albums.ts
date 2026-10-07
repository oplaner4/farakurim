import type { Album } from "@/content/types/gallery";
import { plural } from "@/lib/shared/czech";

// Fotogalerie (design/DESIGN.md §19) and the homepage carousel (§4.5).

/** "12 fotografií", "3 fotografie", "1 fotografie" */
export const photoCountLabel = (count: number) =>
  `${count} ${plural(count, ["fotografie", "fotografie", "fotografií"])}`;

/** Alt text of the album's N-th photo (1-based): "Den národnostních menšin, fotografie 3". */
export const photoAlt = (album: Pick<Album, "title">, n: number) => `${album.title}, fotografie ${n}`;

/** Strip counter for the photos `first` to `last` (1-based): "1–3 / 12", or "4 / 12" for a single photo. */
export const photoCounter = (first: number, last: number, count: number) =>
  `${first === last ? first : `${first}–${last}`} / ${count}`;

/** `id` of the album's block on the Fotogalerie page. */
export const albumElementId = (album: Pick<Album, "id">) => `album-${album.id}`;

/** Link fragment of the album's block: "#album-den-mensin". */
export const albumAnchor = (album: Pick<Album, "id">) => `#${albumElementId(album)}`;

/** Hash of the album's N-th photo (1-based) open in the lightbox: "#album-den-mensin-foto-3". */
export const photoHash = (album: Pick<Album, "id">, n: number) => `#${albumElementId(album)}-foto-${n}`;

/** The photo (0-based) a hash opens in this album's lightbox, or `null` when it is not one of its photos. */
export function photoFromHash(album: Pick<Album, "id" | "photoCount">, hash: string): number | null {
  const prefix = `#${albumElementId(album)}-foto-`;
  if (!hash.startsWith(prefix)) return null;
  const n = Number(hash.slice(prefix.length));
  return Number.isInteger(n) && n >= 1 && n <= album.photoCount ? n - 1 : null;
}

/** Zonerama scales a photo to the `<width>x<height>` in its URL, so a page can pick the size it needs. */
const ZONERAMA_PHOTO = /^(https:\/\/eu\.zonerama\.com\/photos\/\d+)_(\d+)x(\d+)(_\d+\.jpg)$/;
const SRCSET_WIDTHS = [400, 800, 1200, 1600];

/**
 * `srcset` of a Zonerama photo in 400–1600 px widths at its aspect ratio, so a phone doesn't download the desktop
 * size; `undefined` for any other URL (the group pages' own uploads).
 */
export function zoneramaSrcSet(url: string): string | undefined {
  const match = ZONERAMA_PHOTO.exec(url);
  if (!match) return undefined;
  const [, base, width, height, suffix] = match;
  return SRCSET_WIDTHS.map(
    (w) => `${base}_${w}x${Math.round((w * Number(height)) / Number(width))}${suffix} ${w}w`,
  ).join(", ");
}
