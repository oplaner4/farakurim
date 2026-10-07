import type { IsoDate } from "./shared";

// Fotogalerie (gallery.ts): Zonerama albums.

/** One photo of an album, in the two sizes Zonerama serves (design/DESIGN.md §19.2). */
export type AlbumPhoto = {
  /** Thumbnail for the album strips, the "Další alba" rows and the lightbox thumbnails. */
  small: string;
  /** Larger size (about 1600 px) for the homepage carousel and the lightbox. */
  large: string;
};

/**
 * Photos the lightbox shows (design/DESIGN.md §21.2): an album, or the photos of a group page, which have no date
 * and no album on Zonerama.
 */
export type PhotoSet = {
  title: string;
  date?: IsoDate;
  /** The album on Zonerama ("Album na Zonerama" in the lightbox). */
  href?: string;
  photoCount: number;
  /** Omitted when the album has no photo URLs yet: the strips then show `photoCount` designed placeholders. */
  photos?: AlbumPhoto[];
};

/** A Zonerama album (design/DESIGN.md §19.2). The alt text of a photo is "<title>, fotografie N". */
export type Album = PhotoSet & {
  id: string;
  date: IsoDate;
  /** The album on Zonerama ("Otevřít album"). */
  href: string;
};
