import type { Album } from "./types";

// Mock content. In production: Zonerama FarnostKurim/425053, cached about 1 h, with the photo URLs of each album.

export const GALLERY_URL = "https://www.zonerama.com/FarnostKurim/425053";

const album = (id: number) => `https://www.zonerama.com/FarnostKurim/Album/${id}`;

/** Newest first. */
export const albums: Album[] = [
  {
    id: "medovy-den",
    title: "Stánek farnosti na Medovém dni",
    date: "2026-09-20",
    href: album(16472585),
    photoCount: 12,
  },
  {
    id: "pozehnani-namesti",
    title: "Mše s požehnáním náměstí Osvobození",
    date: "2026-09-20",
    href: album(16472577),
    photoCount: 18,
  },
  { id: "den-mensin", title: "Den národnostních menšin", date: "2026-09-13", href: album(16351900), photoCount: 9 },
  {
    id: "pout-vranov",
    title: "Pouť Sedmiradostnou cestou na Vranov",
    date: "2026-08-30",
    href: album(16128406),
    photoCount: 24,
  },
];
