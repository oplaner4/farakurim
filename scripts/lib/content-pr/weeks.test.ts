import { describe, expect, it } from "vitest";
import { formatWeeks, parseWeekHeading } from "./weeks";

describe("parseWeekHeading", () => {
  it("reads a week within a month, across months and across years", () => {
    expect(parseWeekHeading("19.–25. 10. 2026")).toEqual({ validFrom: "2026-10-19", validTo: "2026-10-25" });
    expect(parseWeekHeading("26. 10.–1. 11. 2026")).toEqual({ validFrom: "2026-10-26", validTo: "2026-11-01" });
    expect(parseWeekHeading("28. 12. 2026–3. 1. 2027")).toEqual({ validFrom: "2026-12-28", validTo: "2027-01-03" });
    expect(parseWeekHeading("28. 12.–3. 1. 2027")).toEqual({ validFrom: "2026-12-28", validTo: "2027-01-03" });
  });

  it("takes spaces, a hyphen or a spaced dash", () => {
    expect(parseWeekHeading("19. - 25. 10. 2026")).toEqual({ validFrom: "2026-10-19", validTo: "2026-10-25" });
    expect(parseWeekHeading(" 26.10. – 1.11.2026 ")).toEqual({ validFrom: "2026-10-26", validTo: "2026-11-01" });
  });

  it("refuses anything else, a day that does not exist and a backwards week", () => {
    expect(parseWeekHeading("A")).toBeUndefined();
    expect(parseWeekHeading("Week of 19. 10. 2026")).toBeUndefined();
    expect(parseWeekHeading("30.–31. 2. 2026")).toBeUndefined();
    expect(parseWeekHeading("25.–19. 10. 2026")).toBeUndefined();
  });
});

describe("formatWeeks", () => {
  const week = (validFrom: string, validTo: string) => ({ validFrom, validTo });

  it("writes one week, with the year once", () => {
    expect(formatWeeks([week("2026-10-19", "2026-10-25")])).toBe("19.–25. 10. 2026");
    expect(formatWeeks([week("2026-10-26", "2026-11-01")])).toBe("26. 10.–1. 11. 2026");
    expect(formatWeeks([week("2026-12-28", "2027-01-03")])).toBe("28. 12. 2026–3. 1. 2027");
  });

  it("writes several weeks oldest first, the year once when they end in the same one", () => {
    expect(formatWeeks([week("2026-10-26", "2026-11-01"), week("2026-10-19", "2026-10-25")])).toBe(
      "19.–25. 10. and 26. 10.–1. 11. 2026",
    );
    expect(
      formatWeeks([
        week("2026-12-21", "2026-12-27"),
        week("2026-12-28", "2027-01-03"),
        week("2027-01-04", "2027-01-10"),
      ]),
    ).toBe("21.–27. 12. 2026, 28. 12. 2026–3. 1. 2027 and 4.–10. 1. 2027");
  });

  it("reads back what parseWeekHeading reads", () => {
    for (const heading of ["19.–25. 10. 2026", "26. 10.–1. 11. 2026", "28. 12. 2026–3. 1. 2027"]) {
      expect(formatWeeks([parseWeekHeading(heading)!])).toBe(heading);
    }
  });
});
