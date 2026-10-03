import { describe, expect, it } from "vitest";
import { formatDateRange, formatEventDate, formatLongDate, formatWeekdayDate, plural } from "./czech";

describe("plural", () => {
  const forms: [string, string, string] = ["den", "dny", "dní"];
  it.each([
    [0, "dní"],
    [1, "den"],
    [2, "dny"],
    [4, "dny"],
    [5, "dní"],
    [21, "dní"],
  ])("%i → %s", (n, expected) => {
    expect(plural(n, forms)).toBe(expected);
  });
});

describe("date formatting", () => {
  it("formats long, weekday and range dates", () => {
    expect(formatLongDate("2026-09-20")).toBe("20. září 2026");
    expect(formatWeekdayDate("2026-10-04")).toBe("Ne 4. 10.");
    expect(formatDateRange("2026-09-27", "2026-10-04")).toBe("27. 9. – 4. 10. 2026");
  });

  it("formats single-day, same-month and cross-month events", () => {
    expect(formatEventDate("2026-10-07")).toEqual({ days: "7.", months: "října", label: "7. října", isRange: false });
    expect(formatEventDate("2026-10-02", "2026-10-04")).toEqual({
      days: "2.–4.",
      months: "října",
      label: "2.–4. října",
      isRange: true,
    });
    expect(formatEventDate("2026-09-30", "2026-10-02").label).toBe("30. září – 2. října");
  });
});
