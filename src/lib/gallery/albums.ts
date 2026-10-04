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
