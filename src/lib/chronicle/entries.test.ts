import { describe, expect, it } from "vitest";
import { byYear, startYear } from "./entries";

describe("startYear", () => {
  it("reads the year and the start of a span", () => {
    expect(startYear({ year: "1226" })).toBe(1226);
    expect(startYear({ year: "1766–1772" })).toBe(1766);
  });
});

describe("byYear", () => {
  it("sorts by the first year, a single year before a span starting the same year", () => {
    const years = byYear([{ year: "1843" }, { year: "1998–1999" }, { year: "1833" }, { year: "1998" }]);
    expect(years.map((e) => e.year)).toEqual(["1833", "1843", "1998", "1998–1999"]);
  });
});
