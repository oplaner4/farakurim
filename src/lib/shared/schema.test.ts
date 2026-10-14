import { describe, expect, it } from "vitest";
import { clockSchema, kebabIdSchema, revSchema, uploadSchema } from "./schema";

describe("clockSchema", () => {
  it("is CLOCK's rule", () => {
    expect(clockSchema.safeParse("9:30").success).toBe(true);
    expect(clockSchema.safeParse("9.30").error?.issues[0].message).toBe("must be H:MM");
  });
});

describe("kebabIdSchema", () => {
  it("takes ASCII kebab-case only", () => {
    expect(kebabIdSchema.safeParse("pout-na-vranov-2026").success).toBe(true);
    for (const id of ["Pout", "pout--na", "-pout", "pouť"]) {
      expect(kebabIdSchema.safeParse(id).error?.issues[0].message, id).toBe("must be ASCII kebab-case");
    }
  });
});

describe("uploadSchema", () => {
  it("names the rule", () => {
    expect(uploadSchema.safeParse("/nahrane/plakat.pdf").error?.issues[0].message).toBe("must be a /uploads/… file");
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
