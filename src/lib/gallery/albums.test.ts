import { describe, expect, it } from "vitest";
import {
  albumAnchor,
  albumHref,
  albumPhoto,
  albumPhotoPath,
  albumSrcSet,
  photoAlt,
  photoCountLabel,
  photoCounter,
  photoFromHash,
  photoHash,
  scaledHeight,
} from "./albums";

describe("gallery labels", () => {
  it("counts photos in Czech", () => {
    expect(photoCountLabel(1)).toBe("1 fotografie");
    expect(photoCountLabel(3)).toBe("3 fotografie");
    expect(photoCountLabel(12)).toBe("12 fotografií");
  });

  it("formats the strip counter", () => {
    expect(photoCounter(1, 3, 12)).toBe("1–3 / 12");
    expect(photoCounter(4, 4, 12)).toBe("4 / 12");
  });

  it("names photos and album anchors", () => {
    expect(photoAlt({ title: "Den národnostních menšin" }, 3)).toBe("Den národnostních menšin, fotografie 3");
    expect(albumAnchor({ id: "den-mensin" })).toBe("#album-den-mensin");
  });

  it("links a lightbox photo by the hash", () => {
    const album = { id: "pout", photoCount: 12 };
    expect(photoHash(album, 3)).toBe("#album-pout-foto-3");
    expect(photoFromHash(album, "#album-pout-foto-3")).toBe(2);
    expect(photoFromHash(album, "#album-pout-foto-13")).toBeNull();
    expect(photoFromHash(album, "#album-pout-foto-0")).toBeNull();
    expect(photoFromHash(album, "#album-pouti-foto-3")).toBeNull();
    expect(photoFromHash(album, "")).toBeNull();
  });
});

describe("albumHref and scaledHeight", () => {
  it("links the parish's album and scales a photo's height to a width", () => {
    expect(albumHref("13811797")).toBe("https://www.zonerama.com/FarnostKurim/Album/13811797");
    expect(scaledHeight(800, 1600, 1067)).toBe(534);
  });
});

describe("album photo paths", () => {
  it("names each width in the album's folder", () => {
    expect(albumPhotoPath("den-mensin-2026", 3, 1200)).toBe("/uploads/fotogalerie/den-mensin-2026/foto-3-1200.webp");
    expect(albumPhoto("den-mensin-2026", 3)).toEqual({
      small: "/uploads/fotogalerie/den-mensin-2026/foto-3-800.webp",
      large: "/uploads/fotogalerie/den-mensin-2026/foto-3-1600.webp",
    });
  });
});

describe("albumSrcSet", () => {
  it("offers an album photo in four widths", () => {
    const at = (w: number) => `/uploads/fotogalerie/den-mensin-2026/foto-3-${w}.webp ${w}w`;
    expect(albumSrcSet(albumPhoto("den-mensin-2026", 3).large)).toBe([400, 800, 1200, 1600].map(at).join(", "));
  });

  it("leaves other photos alone", () => {
    expect(albumSrcSet("/uploads/skupiny/schola/foto-1.webp")).toBeUndefined();
    expect(albumSrcSet("https://eu.zonerama.com/photos/662362586_1600x1067_18.jpg")).toBeUndefined();
  });
});
