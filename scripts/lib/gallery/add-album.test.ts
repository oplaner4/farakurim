import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { zipSync } from "fflate";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Album } from "@/content/types/gallery";
import { albumPhoto, MAX_ALBUMS } from "@/lib/gallery/albums";
import {
  addAlbum,
  albumId,
  albumLines,
  albumNumberFromUrl,
  parseCommand,
  proposeAlbum,
  readGallery,
  runAlbum,
  selectPhotos,
  titleAndDate,
  titleAndDateFromZip,
} from "./add-album";
import type { LocalPhoto } from "./zip-photos";
import { freshTempDir } from "../test-helpers";

// An album page with Zonerama's title (eu.zonerama.com/FarnostKurim/Album/<n>); the photos come from a zip.
const page = (title: string) => `<html><head><title>${title} | Zonerama.com</title></head><body></body></html>`;
const sized = (file: string, width: number, height: number): LocalPhoto => ({ file, width, height });
/** 3:2 photos (one cropped by 3 px), 4:3 photos and a portrait, in file-name order. */
const PHOTOS = [
  sized("1.jpg", 1500, 1000),
  sized("2.jpg", 1600, 1200),
  sized("3.jpg", 1497, 1000),
  sized("4.jpg", 1000, 1500),
  sized("5.jpg", 1500, 1000),
  sized("6.jpg", 1600, 1200),
  sized("8.jpg", 1500, 1000),
];
const files = (photos: LocalPhoto[]) => photos.map((p) => p.file);
const ZIP = "/x/2026_09_27 pesi pout na Vranov.zip";

describe("titleAndDate", () => {
  it("takes the date from the YYYY_MM_DD prefix and upper-cases the title", () => {
    expect(titleAndDate(page("2026_09_27 pěš&#237; pouť na Vranov"))).toEqual({
      title: "Pěší pouť na Vranov",
      date: "2026-09-27",
    });
  });

  it("leaves the date empty without the prefix", () => {
    expect(titleAndDate(page("Betlém &amp; koledy"))).toEqual({ title: "Betlém & koledy", date: "" });
  });
});

describe("titleAndDate on a page without a title", () => {
  it("stops on a page without album data", () => {
    expect(() => titleAndDate("<html></html>")).toThrow(/is it an album page/);
  });
});

describe("selectPhotos", () => {
  it("takes the most common landscape ratio, the most common size first", () => {
    const { ratio, group } = selectPhotos(PHOTOS);
    expect(ratio).toBe(1.5);
    expect(files(group)).toEqual(["1.jpg", "5.jpg", "8.jpg", "3.jpg"]);
  });

  it("takes all photos when none is landscape", () => {
    const { ratio, group } = selectPhotos([sized("4.jpg", 1000, 1500)]);
    expect(ratio).toBe(0.67);
    expect(files(group)).toEqual(["4.jpg"]);
  });

  it("stops on an album without photos", () => {
    expect(() => selectPhotos([])).toThrow(/no photos/);
  });
});

describe("titleAndDateFromZip", () => {
  it("reads the title and the date from the zip's name", () => {
    expect(titleAndDateFromZip("/x/2026_09_27 pesi pout na Vranov.zip")).toEqual({
      title: "Pesi pout na Vranov",
      date: "2026-09-27",
    });
    expect(titleAndDateFromZip("fotky.ZIP")).toEqual({ title: "Fotky", date: "" });
  });
});

describe("albumId", () => {
  it("adds the album's year to the title's slug", () => {
    expect(albumId("Medový den", "2026-09-20")).toBe("medovy-den-2026");
  });

  it("keeps a year the title already has once", () => {
    expect(albumId("Tábor 2026", "2026-07-12")).toBe("tabor-2026");
    expect(albumId("Ples 2026 – 2. část", "2026-02-07")).toBe("ples-2026-2-cast");
  });

  it("adds the year when the title holds another one", () => {
    expect(albumId("Tábor 2025", "2026-01-10")).toBe("tabor-2025-2026");
  });
});

describe("proposeAlbum", () => {
  it("proposes the album and builds its record", () => {
    const { proposal, album, sources } = proposeAlbum(
      page("2026_09_27 pěš&#237; pouť na Vranov"),
      ZIP,
      PHOTOS,
      "16583642",
    );
    expect(proposal).toEqual({
      id: "pesi-pout-na-vranov-2026",
      title: "Pěší pouť na Vranov",
      date: "2026-09-27",
      ratio: 1.5,
      total: 7,
      inRatio: 4,
      photos: 4,
    });
    expect(album).toEqual({
      id: "pesi-pout-na-vranov-2026",
      title: "Pěší pouť na Vranov",
      date: "2026-09-27",
      href: "https://www.zonerama.com/FarnostKurim/Album/16583642",
      photoCount: 4,
      photos: [1, 2, 3, 4].map((n) => albumPhoto("pesi-pout-na-vranov-2026", n)),
    });
    expect(sources).toEqual(["1.jpg", "5.jpg", "8.jpg", "3.jpg"]);
  });

  it("takes the title and the date from the zip's name without the page", () => {
    expect(proposeAlbum(null, ZIP, PHOTOS, "1").proposal).toMatchObject({
      id: "pesi-pout-na-vranov-2026",
      title: "Pesi pout na Vranov",
      date: "2026-09-27",
    });
  });

  it("takes the overrides, the id from the overridden title", () => {
    const page1 = page("2026_09_27 pěš&#237; pouť na Vranov");
    expect(proposeAlbum(page1, ZIP, PHOTOS, "1", { title: "Pouť na Vranov" }).proposal.id).toBe("pout-na-vranov-2026");
    expect(proposeAlbum(page1, ZIP, PHOTOS, "1", { id: "vranov", date: "2026-09-28" }).album).toMatchObject({
      id: "vranov",
      title: "Pěší pouť na Vranov",
      date: "2026-09-28",
    });
  });

  it("ignores empty overrides, as if they were not given", () => {
    const { proposal } = proposeAlbum(page("2026_09_27 pěš&#237; pouť na Vranov"), ZIP, PHOTOS, "1", {
      title: "",
      date: "",
      id: "",
    });
    expect(proposal).toMatchObject({
      id: "pesi-pout-na-vranov-2026",
      title: "Pěší pouť na Vranov",
      date: "2026-09-27",
    });
  });

  it("takes at most 15 photos", () => {
    const many = Array.from({ length: 20 }, (_, i) => sized(`${i + 1}.jpg`, 1500, 1000));
    const { proposal, album, sources } = proposeAlbum(page("2026_01_01 Album"), ZIP, many, "1");
    expect(proposal).toMatchObject({ total: 20, inRatio: 20, photos: 15 });
    expect(album.photoCount).toBe(15);
    expect(sources).toHaveLength(15);
  });
});

/** Album `n`, dated 2026-06-(10 + n), so a higher n is newer. */
const stored = (n: number, fields: Partial<Album> = {}): Album => ({
  id: `album-${n}`,
  title: `Album ${n}`,
  date: `2026-06-${String(10 + n).padStart(2, "0")}`,
  href: `https://www.zonerama.com/FarnostKurim/Album/${n}`,
  photoCount: 1,
  photos: [albumPhoto(fields.id ?? `album-${n}`, 1)],
  ...fields,
});
/** A full gallery: albums MAX_ALBUMS … 1, newest first. */
const FULL = Array.from({ length: MAX_ALBUMS }, (_, i) => stored(MAX_ALBUMS - i));

describe("addAlbum on a temp gallery.json", () => {
  const dir = freshTempDir("gallery");
  let file: string;
  const save = (albums: Album[]) => writeFileSync(file, `${JSON.stringify({ albums }, null, 2)}\n`);
  const raw = () => readFileSync(file, "utf8");
  const idsInFile = () => readGallery(file).albums.map((a) => a.id);

  beforeEach(() => {
    file = join(dir(), "gallery.json");
  });

  it("inserts newest first, a same-day album before the older one", () => {
    save([stored(3), stored(2), stored(1)]);
    const result = addAlbum(file, stored(20, { date: stored(2).date }));
    expect(idsInFile()).toEqual(["album-3", "album-20", "album-2", "album-1"]);
    expect(result).toMatchObject({ position: 2, removed: [], written: [file] });
  });

  it("removes the oldest album when a full gallery gets a newer one", () => {
    save(FULL);
    const result = addAlbum(file, stored(20, { date: "2026-07-01" }));
    expect(idsInFile()).toEqual(["album-20", ...FULL.slice(0, -1).map((a) => a.id)]);
    expect(result.position).toBe(1);
    expect(result.removed).toEqual([{ id: "album-1", date: stored(1).date }]);
  });

  it("removes the oldest album when the new one goes into the middle", () => {
    save(FULL);
    const result = addAlbum(file, stored(20, { date: stored(3).date }));
    expect(result.position).toBe(FULL.findIndex((a) => a.id === "album-3") + 1);
    expect(result.removed).toEqual([{ id: "album-1", date: stored(1).date }]);
    expect(idsInFile()).toHaveLength(MAX_ALBUMS);
  });

  it("removes every album over the limit (one added by hand)", () => {
    save([...FULL, stored(0)]);
    const result = addAlbum(file, stored(20, { date: "2026-07-01" }));
    expect(result.removed.map((a) => a.id)).toEqual(["album-1", "album-0"]);
    expect(idsInFile()).toHaveLength(MAX_ALBUMS);
  });

  it("refuses an album older than all the kept ones and writes nothing", () => {
    save(FULL);
    const before = raw();
    expect(() => addAlbum(file, stored(20, { date: "2026-01-01" }))).toThrow(
      `the album album-20 (2026-01-01) is older than the ${MAX_ALBUMS} albums kept: nothing to add`,
    );
    expect(raw()).toBe(before);
  });

  it("refuses a taken id or album", () => {
    save([stored(2), stored(1)]);
    expect(() => addAlbum(file, stored(20, { id: "album-1" }))).toThrow(/pass another one with --id/);
    expect(() => addAlbum(file, stored(20, { href: "https://eu.zonerama.com/FarnostKurim/Album/2" }))).toThrow(
      "the album https://eu.zonerama.com/FarnostKurim/Album/2 is already in gallery.json",
    );
  });

  it("says the album is already there when it is added again, not that its id is taken", () => {
    save([stored(2), stored(1)]);
    expect(() => addAlbum(file, stored(2))).toThrow(
      "the album https://www.zonerama.com/FarnostKurim/Album/2 is already in gallery.json",
    );
  });

  it("refuses an invalid album", () => {
    save([stored(1)]);
    expect(() => addAlbum(file, stored(20, { photoCount: 0 }))).toThrow(/the album is not valid/);
  });

  it("only reports with check, the removals included", () => {
    save(FULL);
    const before = raw();
    const result = addAlbum(file, stored(20, { date: "2026-07-01" }), { check: true });
    expect(result).toMatchObject({ position: 1, removed: [{ id: "album-1" }], written: [] });
    expect(raw()).toBe(before);
  });

  it("stops on a broken gallery.json, also with check, and leaves it unchanged", () => {
    writeFileSync(file, '{ "albums": [');
    expect(() => addAlbum(file, stored(20))).toThrow(/gallery\.json is not valid JSON/);
    save([stored(1, { date: "2026-02-30" })]);
    const before = raw();
    expect(() => addAlbum(file, stored(20), { check: true })).toThrow(/gallery\.json is not valid:\n.*date/);
    expect(raw()).toBe(before);
  });

  it("writes Czech letters as they are", () => {
    save([stored(1)]);
    addAlbum(file, stored(20, { title: "Pěší pouť – Vranov" }));
    expect(raw()).toContain('"title": "Pěší pouť – Vranov"');
    expect(readGallery(file).albums[0].title).toBe("Pěší pouť – Vranov");
  });
});

describe("albumLines", () => {
  const result = { album: stored(20), position: 1, removed: [{ id: "album-1", date: "2026-06-11" }], written: [] };

  it("says what was added and removed", () => {
    expect(albumLines(result, false)).toEqual([
      "Added album-20 (1 photos) at position 1 in src/content/gallery.json",
      "Removed the old album album-1 (2026-06-11)",
    ]);
  });

  it("says would under check", () => {
    expect(albumLines(result, true)).toEqual([
      "Would add album-20 (1 photos) at position 1 in src/content/gallery.json",
      "Would remove the old album album-1 (2026-06-11)",
    ]);
  });
});

describe("parseCommand", () => {
  const URL = "https://eu.zonerama.com/FarnostKurim/Album/16583642";

  it("reads the URL and the options", () => {
    expect(parseCommand([URL, "--photos", "a.zip"])).toEqual({ url: URL, photos: "a.zip", write: false, check: false });
    expect(parseCommand([URL, "--photos", "a.zip", "--check"])).toMatchObject({ write: false, check: true });
    expect(
      parseCommand([URL, "--photos", "a.zip", "--write", "--title", "Pouť", "--date", "2026-09-27", "--id", "pout"]),
    ).toEqual({
      url: URL,
      photos: "a.zip",
      write: true,
      check: false,
      title: "Pouť",
      date: "2026-09-27",
      id: "pout",
    });
  });

  it("refuses a missing URL, a missing option value and an unknown option with the usage", () => {
    expect(() => parseCommand([])).toThrow(/^Usage: pnpm add-album/m);
    expect(() => parseCommand([URL])).toThrow(/^Usage: pnpm add-album/m);
    expect(() => parseCommand([URL, "--write", "--title"])).toThrow(/--title[^]*\nUsage: pnpm add-album/);
    expect(() => parseCommand([URL, "--dryrun"])).toThrow(/--dryrun[^]*\nUsage: pnpm add-album/);
  });
});

describe("albumNumberFromUrl", () => {
  it("is the number of an album URL, also with a trailing slash, a query or a hash", () => {
    expect(albumNumberFromUrl("https://eu.zonerama.com/FarnostKurim/Album/16583642")).toBe("16583642");
    expect(albumNumberFromUrl("https://www.zonerama.com/FarnostKurim/Album/16583642/")).toBe("16583642");
    expect(albumNumberFromUrl("https://eu.zonerama.com/FarnostKurim/Album/16583642?page=2#x")).toBe("16583642");
  });

  it("refuses the profile, a tab and a malformed album number", () => {
    for (const url of [
      "https://eu.zonerama.com/FarnostKurim/425053",
      "https://eu.zonerama.com/FarnostKurim/Album/123abc",
      "https://eu.zonerama.com/FarnostKurim/Album/",
    ]) {
      expect(() => albumNumberFromUrl(url), url).toThrow(/expected an album URL/);
    }
  });
});

describe("runAlbum on a temp gallery.json, uploads/ and zip", () => {
  const tempDir = freshTempDir("run-album");
  const URL = "https://eu.zonerama.com/FarnostKurim/Album/16583642";
  const ID = "pesi-pout-na-vranov-2026";
  let galleryFile = "";
  let uploadsDir = "";
  let zip = "";
  /** The answers of the stubbed fetch: the album page and the server's HEAD. */
  const answers = { page: 200, head: 404 };
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
    init?.method === "HEAD"
      ? new Response(null, { status: answers.head })
      : new Response(page("2026_09_27 pěš&#237; pouť na Vranov"), { status: answers.page }),
  );
  const env = () => ({ uploadsDir, site: "https://example.cz", fetch: fetchMock as unknown as typeof fetch });
  const jpeg = (width: number) =>
    sharp({ create: { width, height: (width * 2) / 3, channels: 3, background: { r: 30, g: 90, b: 160 } } })
      .jpeg()
      .toBuffer();
  const makeZip = (photos: Record<string, Buffer>) => {
    zip = join(tempDir(), "2026_09_27 pesi pout na Vranov.zip");
    writeFileSync(zip, zipSync(Object.fromEntries(Object.entries(photos).map(([n, b]) => [n, new Uint8Array(b)]))));
  };
  const staged = () =>
    existsSync(join(uploadsDir, "fotogalerie", ID)) ? readdirSync(join(uploadsDir, "fotogalerie", ID)) : [];

  beforeEach(async () => {
    galleryFile = join(tempDir(), "gallery.json");
    uploadsDir = join(tempDir(), "uploads");
    writeFileSync(galleryFile, JSON.stringify({ albums: [stored(1)] }));
    Object.assign(answers, { page: 200, head: 404 });
    fetchMock.mockClear();
    makeZip({ "a.jpg": await jpeg(1500), "b.jpg": await jpeg(1500), "c.jpg": await jpeg(1500) });
  });
  afterEach(() => {
    // Only the album page and the server are asked, never a Zonerama photo.
    expect(fetchMock.mock.calls.every(([url]) => url === URL || url.startsWith("https://example.cz/uploads/"))).toBe(
      true,
    );
  });

  it("stages the photos and adds the album", async () => {
    const { output, written } = await runAlbum(
      { url: URL, photos: zip, write: true, check: false },
      env(),
      galleryFile,
    );
    expect(staged()).toHaveLength(12);
    expect(staged()).toContain("foto-3-1600.webp");
    expect(readGallery(galleryFile).albums[0]).toMatchObject({
      id: ID,
      photoCount: 3,
      photos: [1, 2, 3].map((n) => albumPhoto(ID, n)),
    });
    expect(written).toEqual([galleryFile]);
    expect(output).toContain(`Staged 3 photos in uploads/fotogalerie/${ID}/`);
  });

  it("falls back to the zip's name when the page fails", async () => {
    answers.page = 500;
    await runAlbum({ url: URL, photos: zip, write: true, check: false }, env(), galleryFile);
    expect(readGallery(galleryFile).albums[0]).toMatchObject({
      id: ID,
      title: "Pesi pout na Vranov",
      date: "2026-09-27",
    });
  });

  it("refuses a folder already on the server before writing", async () => {
    answers.head = 200;
    const before = readFileSync(galleryFile, "utf8");
    await expect(runAlbum({ url: URL, photos: zip, write: true, check: false }, env(), galleryFile)).rejects.toThrow(
      "pass another id with --id",
    );
    expect(staged()).toEqual([]);
    expect(readFileSync(galleryFile, "utf8")).toBe(before);
  });

  it("leaves gallery.json unchanged when staging fails", async () => {
    const broken = await jpeg(1500);
    makeZip({ "a.jpg": await jpeg(1500), "b.jpg": broken.subarray(0, broken.length / 2), "c.jpg": await jpeg(1500) });
    const before = readFileSync(galleryFile, "utf8");
    await expect(runAlbum({ url: URL, photos: zip, write: true, check: false }, env(), galleryFile)).rejects.toThrow();
    expect(readFileSync(galleryFile, "utf8")).toBe(before);
    // Nor are the photos staged before the failure left for the release to upload.
    expect(staged()).toEqual([]);
  });

  it("only reports with --check", async () => {
    const { output, written } = await runAlbum(
      { url: URL, photos: zip, write: false, check: true },
      env(),
      galleryFile,
    );
    expect(output).toContain(`Would stage 3 photos in uploads/fotogalerie/${ID}/`);
    expect(staged()).toEqual([]);
    expect(written).toEqual([]);
  });

  it("writes nothing for the proposal", async () => {
    const { output } = await runAlbum({ url: URL, photos: zip, write: false, check: false }, env(), galleryFile);
    expect(JSON.parse(output)).toMatchObject({ id: ID, total: 3, photos: 3 });
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "HEAD")).toBe(false);
    expect(staged()).toEqual([]);
  });
});
