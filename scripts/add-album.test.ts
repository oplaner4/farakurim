import { describe, expect, it } from "vitest";
import { photoItems, photoUrl, readAlbumPage, selectPhotos, slug, titleAndDate, type ZoneramaItem } from "./add-album";

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
