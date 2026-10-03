import type { Album } from "./types";

// Mock content. In production: Zonerama FarnostKurim/425053, cached about 1 h.

export const GALLERY_URL = "https://www.zonerama.com/FarnostKurim/425053";

export const albums: Album[] = [
  { id: "medovy-den", title: "Stánek farnosti na Medovém dni", date: "2026-09-20", href: GALLERY_URL },
  { id: "pozehnani-namesti", title: "Mše s požehnáním náměstí Osvobození", date: "2026-09-20", href: GALLERY_URL },
  { id: "den-mensin", title: "Den národnostních menšin", date: "2026-09-13", href: GALLERY_URL },
  { id: "pout-vranov", title: "Pouť Sedmiradostnou cestou na Vranov", date: "2026-08-30", href: GALLERY_URL },
];
