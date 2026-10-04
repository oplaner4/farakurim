import { describe, expect, it } from "vitest";
import { isImageFile, thumbStart, zoomLabel, zoomStep } from "./lightbox";

describe("poster zoom", () => {
  it("labels the fitted size and percentages", () => {
    expect(zoomLabel(1)).toBe("Celý");
    expect(zoomLabel(1.5)).toBe("150 %");
    expect(zoomLabel(1.734)).toBe("173 %");
  });

  it("steps through 1, 1.5, 2 and 3 and stops at the ends", () => {
    expect(zoomStep(1, 1)).toBe(1.5);
    expect(zoomStep(1.5, 1)).toBe(2);
    expect(zoomStep(3, 1)).toBe(3);
    expect(zoomStep(1.7, 1)).toBe(2);
    expect(zoomStep(1.7, -1)).toBe(1.5);
    expect(zoomStep(1, -1)).toBe(1);
    expect(zoomStep(4, -1)).toBe(3);
  });
});

describe("lightbox files and thumbnails", () => {
  it("opens images, not PDFs", () => {
    expect(isImageFile("/uploads/aktuality/plakat.png")).toBe(true);
    expect(isImageFile("/uploads/aktuality/plakat.JPG")).toBe(true);
    expect(isImageFile("/uploads/aktuality/plakat.pdf")).toBe(false);
  });

  it("centres the thumbnail strip inside the album", () => {
    expect(thumbStart(2, 12, 9)).toBe(0);
    expect(thumbStart(6, 12, 9)).toBe(2);
    expect(thumbStart(11, 12, 9)).toBe(3);
    expect(thumbStart(3, 5, 9)).toBe(0);
  });
});
