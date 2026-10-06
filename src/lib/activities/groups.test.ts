import { describe, expect, it } from "vitest";
import {
  formatDuration,
  groupPhotoFromHash,
  groupPhotoHash,
  groupPhotoSet,
  otherGroups,
  youtubeEmbedUrl,
} from "./groups";

describe("formatDuration", () => {
  it.each([
    [142, "2:22"],
    [59, "0:59"],
    [600, "10:00"],
    [65, "1:05"],
  ])("%i s → %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe("youtubeEmbedUrl", () => {
  it("plays from youtube-nocookie.com and starts at once", () => {
    expect(youtubeEmbedUrl("abc")).toBe("https://www.youtube-nocookie.com/embed/abc?autoplay=1&rel=0");
  });
});

describe("group photo hash", () => {
  it("round-trips a photo number", () => {
    expect(groupPhotoHash(3)).toBe("#foto-3");
    expect(groupPhotoFromHash(groupPhotoHash(3), 19)).toBe(2);
  });

  it("ignores other hashes and photos out of range", () => {
    expect(groupPhotoFromHash("", 19)).toBeNull();
    expect(groupPhotoFromHash("#foto-0", 19)).toBeNull();
    expect(groupPhotoFromHash("#foto-20", 19)).toBeNull();
    expect(groupPhotoFromHash("#obsah", 19)).toBeNull();
  });
});

describe("groupPhotoSet", () => {
  const photo = { small: "/a-nahled.webp", large: "/a.webp" };

  it("puts the hero before the grid's photos", () => {
    const hero = { src: "/uvod.webp", small: "/uvod-nahled.webp", alt: "Schola" };
    expect(groupPhotoSet({ hero, photos: [photo] })).toEqual([
      { small: "/uvod-nahled.webp", large: "/uvod.webp" },
      photo,
    ]);
  });

  it("works without a hero or without photos", () => {
    expect(groupPhotoSet({ photos: [photo] })).toEqual([photo]);
    expect(groupPhotoSet({})).toEqual([]);
  });
});

describe("otherGroups", () => {
  const groups = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
  const ids = (list: { id: string }[]) => list.map((g) => g.id);

  it("keeps the list's order without the current group", () => {
    expect(ids(otherGroups(groups, "a"))).toEqual(["b", "c", "d"]);
    expect(ids(otherGroups(groups, "c"))).toEqual(["a", "b", "d"]);
  });

  it("takes the first ones for an unknown id", () => {
    expect(ids(otherGroups(groups.slice(0, 3), "b", 3))).toEqual(["a", "c"]);
    expect(ids(otherGroups(groups, "x"))).toEqual(["a", "b", "c"]);
  });
});
