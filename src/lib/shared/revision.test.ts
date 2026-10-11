import { describe, expect, it } from "vitest";
import { fileRev, revSchema, revSuffix } from "./revision";

describe("revSuffix", () => {
  it("is -r<rev>, or nothing for the first PDF", () => {
    expect(revSuffix(2)).toBe("-r2");
    expect(revSuffix(undefined)).toBe("");
  });
});

describe("fileRev", () => {
  it("reads the rev of a corrected file", () => {
    expect(fileRev("/uploads/aktuality/hody-2026-plakat.pdf")).toBeUndefined();
    expect(fileRev("/uploads/aktuality/hody-2026-plakat-r2.pdf")).toBe(2);
    expect(fileRev("/uploads/aktuality/hody-2026-plakat-r12.webp")).toBe(12);
  });
});

describe("revSchema", () => {
  it("takes 2 or more, or nothing", () => {
    expect(revSchema.parse(3)).toBe(3);
    expect(revSchema.parse(undefined)).toBeUndefined();
    expect(revSchema.safeParse(1).success).toBe(false);
    expect(revSchema.safeParse(2.5).success).toBe(false);
  });
});
