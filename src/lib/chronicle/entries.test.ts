import { describe, expect, it } from "vitest";
import { byYear, formatYears } from "./entries";

describe("formatYears", () => {
  it("writes a year or a span with an en dash", () => {
    expect(formatYears({ year: 1226 })).toBe("1226");
    expect(formatYears({ year: 1766, until: 1772 })).toBe("1766–1772");
  });
});

describe("byYear", () => {
  it("sorts by the first year, a single year before a span starting the same year", () => {
    const years = byYear([{ year: 1843 }, { year: 1998, until: 1999 }, { year: 1833 }, { year: 1998 }]);
    expect(years.map(formatYears)).toEqual(["1833", "1843", "1998", "1998–1999"]);
  });
});
