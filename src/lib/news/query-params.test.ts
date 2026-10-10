import { describe, expect, it } from "vitest";
import { archiveHref, parsePage } from "./query-params";

describe("parsePage", () => {
  it.each([
    [null, 1],
    ["2", 2],
    ["0", 1],
    ["abc", 1],
    ["1.5", 1],
  ])("%s → %i", (value, expected) => {
    expect(parsePage(value)).toBe(expected);
  });
});

describe("archiveHref", () => {
  it("leaves out an empty search and the first page", () => {
    expect(archiveHref({ query: "pouť", page: 2 })).toBe("?q=pouť&strana=2");
    expect(archiveHref({ query: "", page: 2 })).toBe("?strana=2");
    expect(archiveHref({ query: "", page: 1 })).toBe("");
  });
});
