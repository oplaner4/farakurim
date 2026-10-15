import { describe, expect, it } from "vitest";
import { campDates, nextCampDates, yearAnchor, yearTint, yearTitle } from "./years";

describe("campDates", () => {
  it("writes a camp's days with the year", () => {
    expect(campDates("2019-08-15", "2019-08-21")).toBe("15.–21. 8. 2019");
    expect(campDates("2020-07-30", "2020-08-02")).toBe("30. 7. – 2. 8. 2020");
  });
});

describe("year cards", () => {
  it("takes the brand tints in turn, newest first", () => {
    expect([2026, 2025, 2024, 2023, 2022].map(yearTint)).toEqual(["magenta", "blue", "green", "orange", "magenta"]);
  });

  it("anchors each card for the old year URLs", () => {
    expect(yearAnchor(2019)).toBe("rok-2019");
  });

  it("shows the theme, or the year when the theme is not known", () => {
    expect(yearTitle({ year: 2019, theme: "Piráti z Ostrova" })).toBe("Piráti z Ostrova");
    expect(yearTitle({ year: 2020 })).toBe("Tábor 2020");
  });
});

describe("nextCampDates", () => {
  it("says the dates are to come until they are known", () => {
    expect(nextCampDates({})).toBe("upřesníme");
    expect(nextCampDates({ start: "2027-08-07", end: "2027-08-14" })).toBe("7.–14. 8. 2027");
  });
});
