import { describe, expect, it } from "vitest";
import {
  eventCount,
  eventDateBlock,
  fileType,
  formatCompactDate,
  formatDateRange,
  formatEventDate,
  formatEventWhen,
  formatFileSize,
  formatLongDate,
  formatMonthYear,
  formatWeekdayDate,
  plural,
  relativeEventLabel,
} from "./czech";

describe("eventCount", () => {
  it.each([
    ["Nalezen", 1, undefined, "Nalezena jedna akce"],
    ["Nalezen", 2, undefined, "Nalezeny 2 akce"],
    ["Nalezen", 4, undefined, "Nalezeny 4 akce"],
    ["Nalezen", 5, undefined, "Nalezeno 5 akcí"],
    ["Nalezen", 0, undefined, "Nalezeno 0 akcí"],
    ["Zobrazen", 3, undefined, "Zobrazeny 3 akce"],
    ["Zobrazen", 21, undefined, "Zobrazeno 21 akcí"],
    ["Zobrazen", 20, 34, "Zobrazeno 20 z 34 akcí"],
  ] as const)("%s %i (z %s) → %s", (verb, n, of, expected) => {
    expect(eventCount(verb, n, of)).toBe(expected);
  });
});

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

describe("event formatting", () => {
  const base = { id: "x", title: "x", place: "x", text: "x" };

  it("writes single days, ranges and times", () => {
    expect(formatEventWhen({ ...base, start: "2026-10-25", time: "9:30" })).toEqual({
      date: "neděle 25. 10. 2026",
      time: "9:30",
    });
    expect(formatEventWhen({ ...base, start: "2026-10-18" }, { longMonth: true }).date).toBe("neděle 18. října 2026");
    expect(formatEventWhen({ ...base, start: "2026-10-02", end: "2026-10-04" }).date).toBe(
      "pátek 2. – neděle 4. 10. 2026",
    );
    expect(formatEventWhen({ ...base, start: "2026-10-30", end: "2026-11-01" }).date).toBe(
      "pátek 30. 10. – neděle 1. 11. 2026",
    );
  });

  it("writes series and long-term events", () => {
    expect(
      formatEventWhen({ ...base, start: "2026-10-11", end: "2026-11-22", time: "18:00–20:30", sessions: 7 }).date,
    ).toBe("od neděle 11. 10. 2026, vždy 18:00–20:30");
    expect(
      formatEventWhen({ ...base, start: "2026-10-01", end: "2027-04-29", longTerm: { weeklyAt: "18:30" } }).date,
    ).toBe("1. 10. 2026 – 29. 4. 2027, každý čtvrtek od 18:30");
    expect(formatEventWhen({ ...base, start: "2026-03-01", end: "2026-11-30", longTerm: true }).date).toBe(
      "březen – listopad 2026",
    );
  });

  it("builds the date block", () => {
    expect(eventDateBlock({ ...base, start: "2026-10-02", end: "2026-10-04" })).toEqual({
      top: "2.–4.",
      bottom: "října",
    });
    expect(eventDateBlock({ ...base, start: "2026-10-11", end: "2026-11-22", sessions: 7 })).toEqual({
      top: "11.",
      bottom: "října",
    });
    expect(
      eventDateBlock({ ...base, start: "2026-10-01", end: "2027-04-29", longTerm: { weeklyAt: "18:30" } }),
    ).toEqual({ top: "čt", bottom: "18:30" });
    expect(eventDateBlock({ ...base, start: "2026-03-01", end: "2026-11-30", longTerm: true })).toEqual({
      top: "III–XI",
      bottom: "2026",
    });
  });

  it("names months and file types", () => {
    expect(formatMonthYear("2026-10-01")).toBe("Říjen 2026");
    expect(fileType("/uploads/aktuality/6ab538eec7721.Plakát.png")).toBe("PNG");
    expect(fileType("https://example.cz/soubory/pozvanka")).toBe("");
  });
});

describe("formatCompactDate", () => {
  it("writes the archive date column", () => {
    expect(formatCompactDate("2026-08-03")).toBe("3. 8.");
    expect(formatCompactDate("2026-08-08", "2026-08-15")).toBe("8.–15. 8.");
    expect(formatCompactDate("2026-07-30", "2026-08-02")).toBe("30. 7. – 2. 8.");
  });
});

describe("relativeEventLabel", () => {
  const at = (start: string, end?: string) => ({ id: "", title: "", place: "", text: "", start, end });
  it("counts Prague calendar days to the start", () => {
    expect(relativeEventLabel(at("2026-10-18"), "2026-10-03")).toBe("Za 15 dní");
    expect(relativeEventLabel(at("2026-10-06"), "2026-10-03")).toBe("Za 3 dny");
    // Across the change to winter time on 25. 10.
    expect(relativeEventLabel(at("2026-10-27"), "2026-10-24")).toBe("Za 3 dny");
    expect(relativeEventLabel(at("2026-10-04"), "2026-10-03")).toBe("Zítra");
    expect(relativeEventLabel(at("2026-10-03"), "2026-10-03")).toBe("Dnes");
  });

  it("marks ongoing and finished events", () => {
    expect(relativeEventLabel(at("2026-10-02", "2026-10-04"), "2026-10-04")).toBe("Právě probíhá");
    expect(relativeEventLabel(at("2026-10-02", "2026-10-04"), "2026-10-05")).toBe("Proběhlo");
    expect(relativeEventLabel(at("2026-10-02"), "2026-10-03")).toBe("Proběhlo");
  });
});

describe("formatFileSize", () => {
  it("uses kB below a megabyte and a decimal comma", () => {
    expect(formatFileSize(340_123)).toBe("340 kB");
    expect(formatFileSize(120)).toBe("1 kB");
    expect(formatFileSize(1_234_567)).toBe("1,2 MB");
  });
});
