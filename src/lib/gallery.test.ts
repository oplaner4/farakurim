import { describe, expect, it } from "vitest";
import { albumAnchor, photoAlt, photoCountLabel, photoCounter } from "./gallery";

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
});
