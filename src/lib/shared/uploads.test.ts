import { describe, expect, it } from "vitest";
import { isUpload, uploadSchema } from "./uploads";

describe("isUpload", () => {
  it("takes a root-relative /uploads/ file of a linked type", () => {
    expect(isUpload("/uploads/aktuality/hody-2026-plakat.pdf")).toBe(true);
    expect(isUpload("/uploads/petrklic/2025-3/cover.webp")).toBe(true);
    expect(isUpload("/uploads/aktuality/koncert-2026-zaznam.mp3")).toBe(true);
  });

  it("refuses another site, a relative path, another folder or file type", () => {
    for (const href of [
      "https://example.cz/uploads/plakat.jpg",
      "uploads/aktuality/plakat.pdf",
      "/nahrane/plakat.pdf",
      "/uploads/aktuality/plakat.mp4",
      "/uploads/aktuality/plakat.jpeg",
      "/uploads/aktuality/muj plakat.pdf",
    ]) {
      expect(isUpload(href), href).toBe(false);
    }
  });
});

describe("uploadSchema", () => {
  it("names the rule", () => {
    expect(uploadSchema.safeParse("/nahrane/plakat.pdf").error?.issues[0].message).toBe("must be a /uploads/… file");
  });
});
