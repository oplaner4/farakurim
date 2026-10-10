// Adds a Zonerama album of the parish to the Fotogalerie (farnost-create-galerie skill, design/DESIGN.md §19.2).
// Without --write it prints the proposal as JSON to confirm with the user: the title (first letter upper-cased,
// without Zonerama's "YYYY_MM_DD" prefix), the date from that prefix, the proposed id, the chosen aspect ratio and the
// photo counts. With --write it adds the album (up to MAX_PHOTOS photos as { small, large } Zonerama URLs) to
// src/content/gallery.json, newest first, and removes the albums beyond MAX_ALBUMS; Prettier formats the file, then
// the gallery test runs. --check does the same without writing and prints what --write would do. --title, --date
// and --id override the proposal (an empty value counts as not given). The album's rules are albumSchema's
// (src/lib/gallery/schema.ts).
//
// Usage: pnpm add-album https://eu.zonerama.com/FarnostKurim/Album/<n>
//          [--write | --check] [--title "<title>"] [--date YYYY-MM-DD] [--id <kebab-id>]

import { readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { decodeHTML } from "entities";
import * as z from "zod";
import type { Album, AlbumPhoto, GalleryFile } from "@/content/types/gallery";
import { MAX_ALBUMS } from "@/lib/gallery/albums";
import { albumNumber, albumSchema, galleryFileSchema } from "@/lib/gallery/schema";
import { formatAndTest, GALLERY_FILE } from "./content-files";

const MAX_PHOTOS = 15;
/** Photo widths: 2× a strip tile (about 390 px), and the homepage carousel and the lightbox. */
const SMALL = 800;
const LARGE = 1600;

/** An album URL of the parish's profile, with an optional trailing slash, query or hash; group 2 is the number. */
const ALBUM_URL = /^https:\/\/(eu|www)\.zonerama\.com\/FarnostKurim\/Album\/(\d+)\/?([?#].*)?$/;

/** The album number of `url`; the profile, a tab or anything else throws. */
export function albumNumberFromUrl(url: string): string {
  const number = url.match(ALBUM_URL)?.[2];
  if (!number) {
    throw new Error("expected an album URL: https://eu.zonerama.com/FarnostKurim/Album/<n> (not the profile or a tab)");
  }
  return number;
}

/** A photo in the album page's `var result` data. */
export type ZoneramaItem = { photoId: number; width: number; height: number; image: string; html: string };

const NOT_ALBUM = "is it an album page?";
const PAGE_CHANGED = "has Zonerama changed its album page?";

/**
 * "2026_08_30 pouť na Vranov | Zonerama.com" → { title: "Pouť na Vranov", date: "2026-08-30" }; without the prefix
 * the date is empty.
 */
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
  let items: unknown;
  try {
    ({ items } = JSON.parse(page.slice(from, end + 1)));
  } catch {
    throw new Error(`the photo data (var result) is not valid JSON: ${NOT_ALBUM}`);
  }
  if (!Array.isArray(items)) throw new Error(`the photo data (var result) has no items: ${NOT_ALBUM}`);
  const photos = (items as Partial<ZoneramaItem>[]).filter(
    (i): i is ZoneramaItem => i.photoId !== undefined && !!i.image && !(i.html ?? "").includes('data-type="video"'),
  );
  const unsized = photos.find((p) => !(Number(p.width) > 0 && Number(p.height) > 0));
  if (unsized) throw new Error(`photo ${unsized.photoId} has no width and height: ${PAGE_CHANGED}`);
  return photos;
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
  // `||`, not `??`: an empty override counts as not given.
  const title = overrides.title || proposed.title;
  const date = overrides.date || proposed.date;
  const id = overrides.id || slug(title);
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

/** The albums in `galleryFile`, checked by galleryFileSchema; a broken file throws, naming it. */
export function readGallery(galleryFile: string): GalleryFile {
  const name = relative(process.cwd(), galleryFile);
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(galleryFile, "utf8"));
  } catch (error) {
    throw new Error(`${name} is not valid JSON: ${error instanceof Error ? error.message : error}`);
  }
  const parsed = galleryFileSchema.safeParse(data);
  if (!parsed.success) throw new Error(`${name} is not valid:\n${z.prettifyError(parsed.error)}`);
  return parsed.data;
}

export type AddAlbumResult = {
  album: Album;
  /** 1-based, newest first. */
  position: number;
  /** The albums beyond MAX_ALBUMS, removed (or that would be). */
  removed: Pick<Album, "id" | "date">[];
  /** The file written, for formatAndTest; empty with `check`. */
  written: string[];
};

/**
 * Adds `input` (an Album) to `galleryFile` newest first, before the albums of its day, removes the albums beyond
 * MAX_ALBUMS and returns what it did; `check` only validates. Throws with the problem found, before anything is
 * written.
 */
export function addAlbum(galleryFile: string, input: unknown, { check = false } = {}): AddAlbumResult {
  const parsed = albumSchema.safeParse(input);
  if (!parsed.success) throw new Error(`the album is not valid:\n${z.prettifyError(parsed.error)}`);
  const album = parsed.data;
  const { albums } = readGallery(galleryFile);
  // The album first: added again, its proposed id is the stored one, and "pass another id" would mislead.
  if (albums.some((a) => albumNumber(a.href) === albumNumber(album.href))) {
    throw new Error(`the album ${album.href} is already in gallery.json`);
  }
  if (albums.some((a) => a.id === album.id)) {
    throw new Error(`the id ${album.id} is already in gallery.json: pass another one with --id`);
  }
  const at = albums.findIndex((a) => a.date <= album.date);
  const all = at === -1 ? [...albums, album] : albums.toSpliced(at, 0, album);
  const kept = all.slice(0, MAX_ALBUMS);
  if (!kept.includes(album)) {
    throw new Error(
      `the album ${album.id} (${album.date}) is older than the ${MAX_ALBUMS} albums kept: nothing to add`,
    );
  }
  const removed = all.slice(MAX_ALBUMS).map(({ id, date }) => ({ id, date }));
  if (!check) writeFileSync(galleryFile, `${JSON.stringify({ albums: kept } satisfies GalleryFile, null, 2)}\n`);
  return { album, position: kept.indexOf(album) + 1, removed, written: check ? [] : [galleryFile] };
}

/** The lines the command prints for `result`. */
export function albumLines({ album, position, removed }: AddAlbumResult, check: boolean): string[] {
  const added = `${check ? "Would add" : "Added"} ${album.id} (${album.photoCount} photos) at position ${position}`;
  return [
    `${added} in src/content/gallery.json`,
    ...removed.map((a) => `${check ? "Would remove" : "Removed"} the old album ${a.id} (${a.date})`),
  ];
}

const USAGE =
  "Usage: pnpm add-album https://eu.zonerama.com/FarnostKurim/Album/<n> " +
  '[--write | --check] [--title "<title>"] [--date YYYY-MM-DD] [--id <kebab-id>]';

/** The command line: the album URL and the options. */
export type Command = { url: string; write: boolean; check: boolean; title?: string; date?: string; id?: string };

/** Reads the command line `args`; a missing URL, a missing option value or an unknown option throws with the usage. */
export function parseCommand(args: string[]): Command {
  let parsed;
  try {
    parsed = parseArgs({
      args,
      allowPositionals: true,
      options: {
        write: { type: "boolean" },
        check: { type: "boolean" },
        title: { type: "string" },
        date: { type: "string" },
        id: { type: "string" },
      },
    });
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : error}\n${USAGE}`);
  }
  const [url] = parsed.positionals;
  if (!url) throw new Error(USAGE);
  const { write = false, check = false, ...overrides } = parsed.values;
  return { url, write, check, ...overrides };
}

/** The error's message, with its cause: fetch() reports a network failure as "fetch failed" with the reason there. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const { cause } = error;
  return cause === undefined ? error.message : `${error.message} (${cause instanceof Error ? cause.message : cause})`;
}

// No top-level await: tsx runs the scripts as CommonJS (package.json has no "type": "module").
async function main() {
  let command: Command;
  try {
    command = parseCommand(process.argv.slice(2));
  } catch (error) {
    console.error(`add-album: ${errorMessage(error)}`);
    process.exit(2);
  }
  const { url, write, check, ...overrides } = command;
  try {
    const number = albumNumberFromUrl(url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} answered ${response.status}`);
    const { proposal, album } = readAlbumPage(await response.text(), number, overrides);
    if (!write && !check) {
      console.log(JSON.stringify(proposal, null, 2));
      return;
    }
    if (!album.date) throw new Error("the album title has no date: pass the date of the event with --date YYYY-MM-DD");
    const result = addAlbum(GALLERY_FILE, album, { check });
    console.log(albumLines(result, check).join("\n"));
    if (!check) await formatAndTest(result.written, "src/content/gallery.test.ts");
  } catch (error) {
    console.error(`add-album: ${errorMessage(error)}`);
    process.exit(1);
  }
}

// Run as a command, not imported by the tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) void main();
