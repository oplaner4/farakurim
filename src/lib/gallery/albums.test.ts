import { describe, expect, it } from "vitest";
import { albumAnchor, photoAlt, photoCountLabel, photoCounter, photoFromHash, photoHash } from "./albums";

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
