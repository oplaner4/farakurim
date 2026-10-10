import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Album } from "@/content/types/gallery";
import { MAX_ALBUMS } from "@/lib/gallery/albums";
import {
  addAlbum,
  albumLines,
  parseCommand,
  photoItems,
  photoUrl,
  readAlbumPage,
  readGallery,
  selectPhotos,
  slug,
  titleAndDate,
  type ZoneramaItem,
} from "./add-album";

// An album page with Zonerama's markup (eu.zonerama.com/FarnostKurim/Album/<n>): the title, then the photos as JSON in
// `var result = {...}` inside a script. Items without a photoId are banners; data-type="video" marks a video.
const item = (photoId: number, width: number, height: number, type = "photo") => ({
  photoId,
  width,
  height,
  html: `<div class="gallery-inner " data-type="${type}" data-id="${photoId}"></div>`,
  image: `https://eu.zonerama.com/photos/${photoId}_{width}x{height}_18.jpg`,
});
const banner = {
  width: 1050,
  height: 800,
  html: '<div class="gallery-inner" data-banner="photo"></div>',
  image: "https://eu.zonerama.com/View/Banner/Image?id=6a83&width={width}&height={height}",
};
/** 3:2 photos (one cropped by 3 px), 4:3 photos, a portrait, a video, a photo without an image and a banner. */
const ITEMS = [
  banner,
  item(1, 1500, 1000),
  item(2, 1600, 1200),
  item(3, 1497, 1000),
  item(4, 1000, 1500),
  item(5, 1500, 1000),
  item(6, 1600, 1200),
  item(7, 1920, 1080, "video"),
  item(8, 1500, 1000),
  { ...item(9, 1500, 1000), image: "" },
];
const page = (title: string, items: object[] = ITEMS) =>
  `<html><head><title>${title} | Zonerama.com</title></head><body><script type="text/javascript">
    function _flowLayout_Album_Init(){
        var result = ${JSON.stringify({ items, isEnd: true })};
    }</script></body></html>`;
const ids = (items: ZoneramaItem[]) => items.map((i) => i.photoId);
/** The { small, large } URLs the album gets for photo `n` of `width` × 1000. */
const urls = (n: number, width: number) => ({
  small: photoUrl(item(n, width, 1000), 800),
  large: photoUrl(item(n, width, 1000), 1600),
});

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

describe("photoItems", () => {
  it("keeps the photos with an image, without banners and videos", () => {
    expect(ids(photoItems(page("x")))).toEqual([1, 2, 3, 4, 5, 6, 8]);
  });

  it("stops on a page without album data", () => {
    expect(() => photoItems("<html><title>FarnostKurim | Zonerama.com</title></html>")).toThrow(/is it an album page/);
    expect(() => titleAndDate("<html></html>")).toThrow(/is it an album page/);
  });
});

describe("selectPhotos", () => {
  it("takes the most common landscape ratio, the most common size first", () => {
    const { ratio, group } = selectPhotos(photoItems(page("x")));
    expect(ratio).toBe(1.5);
    expect(ids(group)).toEqual([1, 5, 8, 3]);
  });

  it("takes all photos when none is landscape", () => {
    const { ratio, group } = selectPhotos([item(4, 1000, 1500)]);
    expect(ratio).toBe(0.67);
    expect(ids(group)).toEqual([4]);
  });

  it("stops on an album without photos", () => {
    expect(() => selectPhotos([])).toThrow(/no photos/);
  });
});

describe("photoUrl", () => {
  it("fills the width and the height scaled to it", () => {
    expect(photoUrl(item(1, 1500, 1000), 800)).toBe("https://eu.zonerama.com/photos/1_800x533_18.jpg");
    expect(photoUrl(item(1, 1500, 1000), 1600)).toBe("https://eu.zonerama.com/photos/1_1600x1067_18.jpg");
  });
});

describe("slug", () => {
  it("is ASCII kebab-case", () => {
    expect(slug("Pěší pouť na Vranov")).toBe("pesi-pout-na-vranov");
    expect(slug("  Žehnání – náměstí! ")).toBe("zehnani-namesti");
  });
});

describe("readAlbumPage", () => {
  it("proposes the album and builds its record", () => {
    const { proposal, album } = readAlbumPage(page("2026_09_27 pěš&#237; pouť na Vranov"), "16583642");
    expect(proposal).toEqual({
      id: "pesi-pout-na-vranov",
      title: "Pěší pouť na Vranov",
      date: "2026-09-27",
      ratio: 1.5,
      total: 7,
      inRatio: 4,
      photos: 4,
    });
    expect(album).toEqual({
      id: "pesi-pout-na-vranov",
      title: "Pěší pouť na Vranov",
      date: "2026-09-27",
      href: "https://www.zonerama.com/FarnostKurim/Album/16583642",
      photoCount: 4,
      photos: [urls(1, 1500), urls(5, 1500), urls(8, 1500), urls(3, 1497)],
    });
  });

  it("takes the overrides, the id from the overridden title", () => {
    const page1 = page("2026_09_27 pěš&#237; pouť na Vranov");
    expect(readAlbumPage(page1, "1", { title: "Pouť na Vranov" }).proposal.id).toBe("pout-na-vranov");
    expect(readAlbumPage(page1, "1", { id: "vranov", date: "2026-09-28" }).album).toMatchObject({
      id: "vranov",
      title: "Pěší pouť na Vranov",
      date: "2026-09-28",
    });
  });

  it("takes at most 15 photos", () => {
    const many = Array.from({ length: 20 }, (_, i) => item(i + 1, 1500, 1000));
    const { proposal, album } = readAlbumPage(page("2026_01_01 Album", many), "1");
    expect(proposal).toMatchObject({ total: 20, inRatio: 20, photos: 15 });
    expect(album.photoCount).toBe(15);
  });
});

/** Album `n`, dated 2026-06-(10 + n), so a higher n is newer. */
const stored = (n: number, fields: Partial<Album> = {}): Album => ({
  id: `album-${n}`,
  title: `Album ${n}`,
  date: `2026-06-${String(10 + n).padStart(2, "0")}`,
  href: `https://www.zonerama.com/FarnostKurim/Album/${n}`,
  photoCount: 1,
  photos: [
    {
      small: `https://eu.zonerama.com/photos/${n}_800x533_18.jpg`,
      large: `https://eu.zonerama.com/photos/${n}_1600x1067_18.jpg`,
    },
  ],
  ...fields,
});
/** A full gallery: albums MAX_ALBUMS … 1, newest first. */
const FULL = Array.from({ length: MAX_ALBUMS }, (_, i) => stored(MAX_ALBUMS - i));

describe("addAlbum on a temp gallery.json", () => {
  let dir: string;
  let file: string;
  const save = (albums: Album[]) => writeFileSync(file, `${JSON.stringify({ albums }, null, 2)}\n`);
  const raw = () => readFileSync(file, "utf8");
  const idsInFile = () => readGallery(file).albums.map((a) => a.id);

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gallery-"));
    file = join(dir, "gallery.json");
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

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
    expect(parseCommand([URL])).toEqual({ url: URL, write: false });
    expect(parseCommand([URL, "--write", "--title", "Pouť", "--date", "2026-09-27", "--id", "pout"])).toEqual({
      url: URL,
      write: true,
      title: "Pouť",
      date: "2026-09-27",
      id: "pout",
    });
  });

  it("refuses a missing URL, a missing option value and an unknown option with the usage", () => {
    expect(() => parseCommand([])).toThrow(/^Usage: pnpm add-album/m);
    expect(() => parseCommand([URL, "--write", "--title"])).toThrow(/--title[^]*\nUsage: pnpm add-album/);
    expect(() => parseCommand([URL, "--dryrun"])).toThrow(/--dryrun[^]*\nUsage: pnpm add-album/);
  });
});
