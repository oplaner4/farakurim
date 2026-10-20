// Proposes the record of a Zonerama album of the parish (design/DESIGN.md §19.2) from its page and a zip of its
// original photos: the title without Zonerama's "YYYY_MM_DD" prefix (first letter upper-cased), the date from that
// prefix (both from the zip's name when the page cannot be read), the id (the title's slug with the year) and up to
// MAX_PHOTOS photos of the most common aspect ratio. Stages those photos in uploads/fotogalerie/<id>/, adds the album
// to the gallery file, newest first, and removes the albums beyond MAX_ALBUMS. The photos never come from Zonerama:
// it answers a script with a "Bot Detected" image. The album's rules are albumSchema's (src/lib/gallery/schema.ts).

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { decodeHTML } from "entities";
import type { Album, AlbumPhoto, GalleryFile } from "@/content/types/gallery";
import { albumHref, albumPhoto, MAX_ALBUMS } from "@/lib/gallery/albums";
import { albumNumber, albumSchema, galleryFileSchema } from "@/lib/gallery/schema";
import { capitalize } from "@/lib/shared/czech";
import { slug } from "@/lib/shared/slug";
import { parseOrThrow, readJsonFile } from "@/lib/shared/json-file";
import { actionVerb, parseCommandLine } from "../command";
import { formatAndTest, GALLERY_FILE, writeContentFile } from "../content-files";
import { defaultUploadsEnv, UPLOADS_DIR, type UploadsEnv } from "../uploads";
import { assertFreeOnServer, stageAlbumPhotos } from "./album-photos";
import { extractPhotos, type LocalPhoto } from "./zip-photos";

const MAX_PHOTOS = 15;

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

const NOT_ALBUM = "is it an album page?";

/**
 * "2026_08_30 pouť na Vranov | Zonerama.com" → { title: "Pouť na Vranov", date: "2026-08-30" }; without the prefix
 * the date is empty.
 */
export function titleAndDate(page: string): { title: string; date: string } {
  const raw = page.match(/<title>([^]*?) \| Zonerama/)?.[1];
  if (raw === undefined) throw new Error(`the page has no Zonerama title: ${NOT_ALBUM}`);
  return datedTitle(decodeHTML(raw));
}

/** "/x/2026_09_27 pesi pout na Vranov.zip" → { title: "Pesi pout na Vranov", date: "2026-09-27" }, as titleAndDate. */
export const titleAndDateFromZip = (zip: string) => datedTitle(basename(zip, extname(zip)));

/** "2026_08_30 pouť na Vranov" → { title: "Pouť na Vranov", date: "2026-08-30" }; without the prefix no date. */
function datedTitle(name: string): { title: string; date: string } {
  const text = name.trim();
  const m = text.match(/^(\d{4})_(\d{2})_(\d{2})\s+([^]*)$/);
  const [title, date] = m ? [m[4], `${m[1]}-${m[2]}-${m[3]}`] : [text, ""];
  return { title: capitalize(title), date };
}

/** Width / height rounded to 2 dp: tolerates crops of a pixel or two, still separates 3:2 from 4:3. */
/** A photo with a size (an original from a zip). */
type Sized = { width: number; height: number };

const ratioOf = (p: Sized) => Math.round((Number(p.width) / Number(p.height)) * 100) / 100;
const sizeOf = (p: Sized) => `${p.width}x${p.height}`;

function tally<T>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return counts;
}

/**
 * The strips crop every photo to 4:3, so the album shows photos of one shape: the most common landscape aspect ratio
 * (the first seen on a tie), uncropped photos (the most common exact size) first.
 */
export function selectPhotos<T extends Sized>(items: T[]): { ratio: number; group: T[] } {
  if (items.length === 0) throw new Error("the album has no photos");
  const landscape = items.filter((p) => ratioOf(p) >= 1);
  const pool = landscape.length > 0 ? landscape : items;
  const [ratio] = [...tally(pool.map(ratioOf))].reduce((best, entry) => (entry[1] > best[1] ? entry : best));
  const group = pool.filter((p) => ratioOf(p) === ratio);
  const sizes = tally(group.map(sizeOf));
  return { ratio, group: group.toSorted((a, b) => sizes.get(sizeOf(b))! - sizes.get(sizeOf(a))!) };
}

/** The proposed id: the title's slug with the album's year, so a yearly event never reuses last year's anchors
 * ("Medový den", 2026 → "medovy-den-2026"); a title with the year already in it keeps it once. */
export function albumId(title: string, date: string): string {
  const base = slug(title);
  const year = date.slice(0, 4);
  return base.split("-").includes(year) ? base : [base, year].filter(Boolean).join("-");
}

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

/**
 * The proposal for album `number` from its page (`null` when it cannot be read: the title and the date then come from
 * the name of `zip`) and the zip's `photos`, with the user's overrides; the album record; and the original file of
 * each of its photos, in order.
 */
export function proposeAlbum(
  page: string | null,
  zip: string,
  photos: LocalPhoto[],
  number: string,
  overrides: { title?: string; date?: string; id?: string } = {},
): { proposal: Proposal; album: Album; sources: string[] } {
  const proposed = page === null ? titleAndDateFromZip(zip) : titleAndDate(page);
  // `||`, not `??`: an empty override counts as not given.
  const title = overrides.title || proposed.title;
  const date = overrides.date || proposed.date;
  const id = overrides.id || albumId(title, date);
  const { ratio, group } = selectPhotos(photos);
  const chosen = group.slice(0, MAX_PHOTOS);
  const albumPhotos: AlbumPhoto[] = chosen.map((_, i) => albumPhoto(id, i + 1));
  return {
    proposal: { id, title, date, ratio, total: photos.length, inRatio: group.length, photos: chosen.length },
    album: { id, title, date, href: albumHref(number), photoCount: chosen.length, photos: albumPhotos },
    sources: chosen.map((p) => p.file),
  };
}

/** The albums in `galleryFile`, checked by galleryFileSchema; a broken file throws, naming it. */
export const readGallery = (galleryFile: string): GalleryFile => readJsonFile(galleryFile, galleryFileSchema);

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
  const album = parseOrThrow(albumSchema, input, "the album");
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
  if (!check) writeContentFile(galleryFile, { albums: kept } satisfies GalleryFile);
  return { album, position: kept.indexOf(album) + 1, removed, written: check ? [] : [galleryFile] };
}

/** The lines the command prints for `result`. */
export function albumLines({ album, position, removed }: AddAlbumResult, check: boolean): string[] {
  const added = `${actionVerb(check, "add")} ${album.id} (${album.photoCount} photos) at position ${position}`;
  return [
    `${added} in src/content/gallery.json`,
    ...removed.map((a) => `${actionVerb(check, "remove")} the old album ${a.id} (${a.date})`),
  ];
}

const USAGE =
  "Usage: pnpm add-album https://eu.zonerama.com/FarnostKurim/Album/<n> --photos <zip of the originals> " +
  '[--write | --check] [--title "<title>"] [--date YYYY-MM-DD] [--id <kebab-id>]';

/** The command line: the album URL, the zip of its originals and the options. */
export type Command = {
  url: string;
  photos: string;
  write: boolean;
  check: boolean;
  title?: string;
  date?: string;
  id?: string;
};

/** Reads the command line `args`; a missing URL or zip, a missing option value or an unknown option throws with the usage. */
export function parseCommand(args: string[]): Command {
  const options = {
    photos: { type: "string" },
    write: { type: "boolean" },
    check: { type: "boolean" },
    title: { type: "string" },
    date: { type: "string" },
    id: { type: "string" },
  } as const;
  const parsed = parseCommandLine(args, options, USAGE);
  const [url] = parsed.positionals;
  const { photos, write = false, check = false, ...overrides } = parsed.values;
  if (!url || !photos) throw new Error(USAGE);
  return { url, photos, write, check, ...overrides };
}

/** The album page at `url`, or `null` when it does not answer or has no Zonerama title (Zonerama answers 500 at times). */
async function readPage(url: string, env: UploadsEnv): Promise<string | null> {
  try {
    const response = await env.fetch(url, { signal: AbortSignal.timeout(15_000) });
    const page = response.ok ? await response.text() : null;
    return page && /<title>[^]*? \| Zonerama/.test(page) ? page : null;
  } catch {
    return null;
  }
}

/**
 * Proposes the album at `url` from the zip `photos`, or (`write`, `check`) stages its photos in `env.uploadsDir` and
 * adds it to `galleryFile`. Returns the output and the files to format and test. The photos are staged before
 * `galleryFile` is written, so a failure leaves it as it was.
 */
export async function runAlbum(
  { url, photos: zip, write, check, ...overrides }: Command,
  env: UploadsEnv,
  galleryFile: string,
): Promise<{ output: string; written: string[] }> {
  const number = albumNumberFromUrl(url);
  const dir = mkdtempSync(join(tmpdir(), "album-"));
  try {
    const photos = await extractPhotos(zip, dir);
    const page = await readPage(url, env);
    const { proposal, album, sources } = proposeAlbum(page, zip, photos, number, overrides);
    const note =
      page === null ? ["The album page did not answer: the title and the date are from the zip's name."] : [];
    if (!write && !check) return { output: [...note, JSON.stringify(proposal, null, 2)].join("\n"), written: [] };
    if (!album.date) throw new Error("the album title has no date: pass the date of the event with --date YYYY-MM-DD");
    addAlbum(galleryFile, album, { check: true });
    await assertFreeOnServer(env, `fotogalerie/${album.id}/foto-1-800.webp`, "pass another id with --id");
    if (!check) {
      try {
        await stageAlbumPhotos(env.uploadsDir, album.id, sources);
      } catch (error) {
        // The folder is not on the server (checked above): remove what was staged, or the release would upload it.
        rmSync(join(env.uploadsDir, "fotogalerie", album.id), { recursive: true, force: true });
        throw error;
      }
    }
    const result = check ? addAlbum(galleryFile, album, { check: true }) : addAlbum(galleryFile, album);
    const staged = `${actionVerb(check, "stage")} ${sources.length} photos in ${UPLOADS_DIR}fotogalerie/${album.id}/`;
    return { output: [...note, ...albumLines(result, check), staged].join("\n"), written: result.written };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Runs the command on the repo's gallery and uploads/, then formats and tests the gallery it wrote. */
export async function execute(command: Command) {
  const { output, written } = await runAlbum(command, defaultUploadsEnv(), GALLERY_FILE);
  console.log(output);
  if (written.length > 0) await formatAndTest(written, "src/content/gallery.test.ts");
}
