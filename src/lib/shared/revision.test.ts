import { describe, expect, it } from "vitest";
import { revSchema, revSuffix } from "./revision";

describe("revSuffix", () => {
  it("is -r<rev>, or nothing for the first PDF", () => {
    expect(revSuffix(2)).toBe("-r2");
    expect(revSuffix(undefined)).toBe("");
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
