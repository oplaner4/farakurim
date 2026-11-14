import { describe, expect, it } from "vitest";
import * as z from "zod";
import { parseOrThrow } from "./parse";

describe("parseOrThrow", () => {
  const schema = z.strictObject({ items: z.array(z.string()) });

  it("returns the checked data, or throws naming what is not valid and every problem", () => {
    expect(parseOrThrow(schema, { items: ["a"] }, "the record")).toEqual({ items: ["a"] });
    expect(() => parseOrThrow(schema, { items: [1] }, "the record")).toThrow(
      /^the record is not valid:\n[^]*items\[0\]/,
    );
  });
});
