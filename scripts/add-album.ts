// Adds a Zonerama album of the parish to the Fotogalerie (farnost-create-galerie skill, design/DESIGN.md §19.2).
// Without --write it prints the proposal as JSON to confirm with the user: the title (first letter upper-cased,
// without Zonerama's "YYYY_MM_DD" prefix), the date from that prefix, the proposed id, the chosen aspect ratio and the
// photo counts. With --write it adds the album (up to MAX_PHOTOS photos as { small, large } Zonerama URLs) to
// src/content/gallery.json, newest first, and removes the albums beyond MAX_ALBUMS; Prettier formats the file, then
// the gallery test runs. --title, --date and --id override the proposal. The album's rules are albumSchema's
// (src/lib/gallery/schema.ts).
//
// Usage: pnpm add-album https://eu.zonerama.com/FarnostKurim/Album/<n>
//          [--write [--title "<title>"] [--date YYYY-MM-DD] [--id <kebab-id>]]

import { decodeHTML } from "entities";
import type { Album, AlbumPhoto } from "@/content/types/gallery";

const MAX_PHOTOS = 15;
/** Photo widths: 2× a strip tile (about 390 px), and the homepage carousel and the lightbox. */
const SMALL = 800;
const LARGE = 1600;

/** An album URL of the parish's profile; group 2 is the album number. */
export const ALBUM_URL = /^https:\/\/(eu|www)\.zonerama\.com\/FarnostKurim\/Album\/(\d+)/;

/** A photo in the album page's `var result` data. */
export type ZoneramaItem = { photoId: number; width: number; height: number; image: string; html: string };

const NOT_ALBUM = "is it an album page?";

/** "2026_08_30 pouť na Vranov | Zonerama.com" → { title: "Pouť na Vranov", date: "2026-08-30" }; no prefix, no date. */
export function titleAndDate(page: string): { title: string; date: string } {
  const raw = page.match(/<title>([^]*?) \| Zonerama/)?.[1];
  if (raw === undefined) throw new Error(`the page has no Zonerama title: ${NOT_ALBUM}`);
  const text = decodeHTML(raw).trim();
  const m = text.match(/^(\d{4})_(\d{2})_(\d{2})\s+([^]*)$/);
  const [title, date] = m ? [m[4], `${m[1]}-${m[2]}-${m[3]}`] : [text, ""];
  return { title: title.charAt(0).toUpperCase() + title.slice(1), date };
}

/** The album's photos from `var result = {...}`, found by brace counting (a regex is unreliable on it). */
export function photoItems(page: string): ZoneramaItem[] {
  const marker = "var result = ";
  const start = page.indexOf(`${marker}{`);
  if (start === -1) throw new Error(`the page has no photo data (var result): ${NOT_ALBUM}`);
  const from = start + marker.length;
  let depth = 0;
  let end = from;
  for (; end < page.length; end++) {
    if (page[end] === "{") depth++;
    else if (page[end] === "}" && --depth === 0) break;
  }
  const { items } = JSON.parse(page.slice(from, end + 1)) as { items: Partial<ZoneramaItem>[] };
  return items.filter(
    (i): i is ZoneramaItem => i.photoId !== undefined && !!i.image && !(i.html ?? "").includes('data-type="video"'),
  );
}

/** Width / height rounded to 2 dp: tolerates crops of a pixel or two, still separates 3:2 from 4:3. */
const ratioOf = (p: ZoneramaItem) => Math.round((Number(p.width) / Number(p.height)) * 100) / 100;
const sizeOf = (p: ZoneramaItem) => `${p.width}x${p.height}`;

function tally<T>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return counts;
}

/**
 * The strips crop every photo to 4:3, so the album shows photos of one shape: the most common landscape aspect ratio
 * (the first seen on a tie), uncropped photos (the most common exact size) first.
 */
export function selectPhotos(items: ZoneramaItem[]): { ratio: number; group: ZoneramaItem[] } {
  if (items.length === 0) throw new Error("the album has no photos");
  const landscape = items.filter((p) => ratioOf(p) >= 1);
  const pool = landscape.length > 0 ? landscape : items;
  const [ratio] = [...tally(pool.map(ratioOf))].reduce((best, entry) => (entry[1] > best[1] ? entry : best));
  const group = pool.filter((p) => ratioOf(p) === ratio);
  const sizes = tally(group.map(sizeOf));
  return { ratio, group: group.toSorted((a, b) => sizes.get(sizeOf(b))! - sizes.get(sizeOf(a))!) };
}

/** The photo's URL at `width`, the height scaled to it. */
export function photoUrl(item: ZoneramaItem, width: number): string {
  const height = Math.round((width * Number(item.height)) / Number(item.width));
  return item.image.replace("{width}", String(width)).replace("{height}", String(height));
}

/** "Pouť na Vranov" → "pout-na-vranov" */
export const slug = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/\P{ASCII}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** What the command prints without --write, for the user to confirm. */
export type Proposal = {
  id: string;
  title: string;
  date: string;
  ratio: number;
  total: number;
  inRatio: number;
  photos: number;
};

/** The proposal for the album page `page` (album `number`) with the user's overrides, and the album record. */
export function readAlbumPage(
  page: string,
  number: string,
  overrides: { title?: string; date?: string; id?: string } = {},
): { proposal: Proposal; album: Album } {
  const proposed = titleAndDate(page);
  const title = overrides.title ?? proposed.title;
  const date = overrides.date ?? proposed.date;
  const id = overrides.id ?? slug(title);
  const items = photoItems(page);
  const { ratio, group } = selectPhotos(items);
  const photos: AlbumPhoto[] = group
    .slice(0, MAX_PHOTOS)
    .map((p) => ({ small: photoUrl(p, SMALL), large: photoUrl(p, LARGE) }));
  return {
    proposal: { id, title, date, ratio, total: items.length, inRatio: group.length, photos: photos.length },
    album: {
      id,
      title,
      date,
      href: `https://www.zonerama.com/FarnostKurim/Album/${number}`,
      photoCount: photos.length,
      photos,
    },
  };
}
