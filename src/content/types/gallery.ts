import type { IsoDate } from "./shared";

// Fotogalerie (gallery.ts): Zonerama albums.

/** One photo of an album, in the two sizes Zonerama serves (design/DESIGN.md §19.2). */
export type AlbumPhoto = {
  /** Thumbnail for the album strips, the "Další alba" rows and the lightbox thumbnails. */
  small: string;
  /** Larger size (about 1600 px) for the homepage carousel and the lightbox. */
  large: string;
};

/** A Zonerama album (design/DESIGN.md §19.2). The alt text of a photo is "<title>, fotografie N". */
export type Album = {
  id: string;
  title: string;
  date: IsoDate;
  /** The album on Zonerama ("Otevřít album"). */
  href: string;
  photoCount: number;
  /** Omitted in the mock data: the strips then show `photoCount` designed placeholders. */
  photos?: AlbumPhoto[];
};
