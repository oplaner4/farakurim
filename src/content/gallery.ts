import type { Album } from "@/content/types/gallery";

// Albums from Zonerama FarnostKurim/425053, added with the farnost-create-galerie skill. Photos are Zonerama URLs.

export const GALLERY_URL = "https://www.zonerama.com/FarnostKurim/425053";

const album = (id: number) => `https://www.zonerama.com/FarnostKurim/Album/${id}`;

/** Newest first. */
export const albums: Album[] = [
  {
    id: "pesi-pout-vranov",
    title: "Pěší pouť na Vranov",
    date: "2026-09-27",
    href: album(16583642),
    photoCount: 15,
    photos: [
      {
        small: "https://eu.zonerama.com/photos/672490117_800x450_18.jpg",
        large: "https://eu.zonerama.com/photos/672490117_1600x900_18.jpg",
      },
      {
        small: "https://eu.zonerama.com/photos/672490120_800x450_18.jpg",
        large: "https://eu.zonerama.com/photos/672490120_1600x900_18.jpg",
      },
      {
        small: "https://eu.zonerama.com/photos/672490118_800x450_18.jpg",
        large: "https://eu.zonerama.com/photos/672490118_1600x900_18.jpg",
      },
      {
        small: "https://eu.zonerama.com/photos/672490111_800x450_18.jpg",
        large: "https://eu.zonerama.com/photos/672490111_1600x900_18.jpg",
      },
      {
        small: "https://eu.zonerama.com/photos/672490095_800x450_18.jpg",
        large: "https://eu.zonerama.com/photos/672490095_1600x900_18.jpg",
      },
      {
        small: "https://eu.zonerama.com/photos/672490094_800x450_18.jpg",
        large: "https://eu.zonerama.com/photos/672490094_1600x900_18.jpg",
      },
      {
        small: "https://eu.zonerama.com/photos/672490091_800x450_18.jpg",
        large: "https://eu.zonerama.com/photos/672490091_1600x900_18.jpg",
      },
      {
        small: "https://eu.zonerama.com/photos/672490083_800x450_18.jpg",
        large: "https://eu.zonerama.com/photos/672490083_1600x900_18.jpg",
      },
      {
        small: "https://eu.zonerama.com/photos/672490075_800x450_18.jpg",
        large: "https://eu.zonerama.com/photos/672490075_1600x900_18.jpg",
      },
      {
        small: "https://eu.zonerama.com/photos/672490077_800x450_18.jpg",
        large: "https://eu.zonerama.com/photos/672490077_1600x900_18.jpg",
      },
      {
        small: "https://eu.zonerama.com/photos/672490076_800x450_18.jpg",
        large: "https://eu.zonerama.com/photos/672490076_1600x900_18.jpg",
      },
      {
        small: "https://eu.zonerama.com/photos/672490071_800x450_18.jpg",
        large: "https://eu.zonerama.com/photos/672490071_1600x900_18.jpg",
      },
      {
        small: "https://eu.zonerama.com/photos/672490060_800x450_18.jpg",
        large: "https://eu.zonerama.com/photos/672490060_1600x900_18.jpg",
      },
      {
        small: "https://eu.zonerama.com/photos/672490062_800x450_18.jpg",
        large: "https://eu.zonerama.com/photos/672490062_1600x900_18.jpg",
      },
      {
        small: "https://eu.zonerama.com/photos/672490058_800x450_18.jpg",
        large: "https://eu.zonerama.com/photos/672490058_1600x900_18.jpg",
      },
    ],
  },
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
