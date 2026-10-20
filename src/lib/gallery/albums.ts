import type { Album, AlbumPhoto } from "@/content/types/gallery";
import { plural } from "@/lib/shared/czech";
import { UPLOADS_PATH } from "@/lib/shared/uploads";

// Fotogalerie (design/DESIGN.md §19) and the homepage carousel (§4.5).

/**
 * The albums the site keeps, newest first: the Fotogalerie shows them all, the homepage the 4 newest; older ones stay
 * on Zonerama (design/DESIGN.md §19.1). `pnpm add-album` removes the older ones.
 */
export const MAX_ALBUMS = 6;

/**
 * `sizes` of the homepage's photo stage (§4.5): full width up to the desktop, then beside the 340 px "Další alba".
 */
export const STAGE_SIZES = "(min-width: 75rem) 836px, (min-width: 48rem) calc(100vw - 64px), calc(100vw - 32px)";

/** The link an album keeps to the parish's album `number` on Zonerama. */
export const albumHref = (number: string) => `https://www.zonerama.com/FarnostKurim/Album/${number}`;

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

/** Link fragment of the album's block: "#album-den-mensin-2026". */
export const albumAnchor = (album: Pick<Album, "id">) => `#${albumElementId(album)}`;

/** Hash of the album's N-th photo (1-based) open in the lightbox: "#album-den-mensin-2026-foto-3". */
export const photoHash = (album: Pick<Album, "id">, n: number) => `#${albumElementId(album)}-foto-${n}`;

/** The photo (0-based) a hash opens in this album's lightbox, or `null` when it is not one of its photos. */
export function photoFromHash(album: Pick<Album, "id" | "photoCount">, hash: string): number | null {
  const prefix = `#${albumElementId(album)}-foto-`;
  if (!hash.startsWith(prefix)) return null;
  const n = Number(hash.slice(prefix.length));
  return Number.isInteger(n) && n >= 1 && n <= album.photoCount ? n - 1 : null;
}

/** The widths each album photo is uploaded in: `small` is the 800 px one, `large` the 1600 px one. */
export const ALBUM_PHOTO_WIDTHS = [400, 800, 1200, 1600] as const;

/** The album's folder of uploaded photos: "/uploads/fotogalerie/den-mensin-2026". */
export const albumFolder = (id: string) => `${UPLOADS_PATH}fotogalerie/${id}`;

/** The album's N-th photo (1-based) at `width`: "/uploads/fotogalerie/den-mensin-2026/foto-3-800.webp". */
export const albumPhotoPath = (id: string, n: number, width: number) => `${albumFolder(id)}/foto-${n}-${width}.webp`;

/** The album's N-th photo (1-based) as the site links it. */
export const albumPhoto = (id: string, n: number): AlbumPhoto => ({
  small: albumPhotoPath(id, n, 800),
  large: albumPhotoPath(id, n, 1600),
});

/** An uploaded album photo at any width; group 1 is its path without the width. */
export const ALBUM_PHOTO = new RegExp(`^(${UPLOADS_PATH}fotogalerie/[a-z0-9-]+/foto-\\d+)-\\d+\\.webp$`);

/** `srcset` of an uploaded album photo in its four widths; `undefined` for any other URL (the group pages' photos). */
export function albumSrcSet(url: string): string | undefined {
  const base = ALBUM_PHOTO.exec(url)?.[1];
  return base && ALBUM_PHOTO_WIDTHS.map((w) => `${base}-${w}.webp ${w}w`).join(", ");
}
