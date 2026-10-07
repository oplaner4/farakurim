import { describe, expect, it } from "vitest";
import type { Announcement, RegularService, SheetDay } from "@/content/types/services";
import {
  isOneWeek,
  markChanges,
  publicDays,
  sheetExceptions,
  showWeekLabel,
  sortAnnouncements,
  weekView,
} from "./service-sheet";

const days: SheetDay[] = [
  { date: "2026-10-02", rows: [{ time: "18:15", place: "kurim", title: "Mše sv.", mass: true }] },
  {
    date: "2026-10-03",
    rows: [
      { time: "8:00", place: "kurim", title: "Mše sv.", mass: true, detail: "za farníky" },
      { time: "10:00", place: "kurim", title: "Pohřeb", detail: "[jméno]", public: false },
    ],
  },
  {
    date: "2026-10-04",
    rows: [
      { time: "8:00", place: "kurim", title: "Mše sv.", mass: true },
      { time: "9:30", place: "moravske-kninice", title: "Mše sv.", mass: true, changed: true },
      { time: "11:00", place: "Vranov", title: "Mše sv.", mass: true },
      { time: "15:00", place: "kurim", title: "Adorace", service: true },
      { time: "16:00", place: "kurim", title: "Křest", detail: "[jméno]" },
    ],
  },
];

describe("sheetExceptions", () => {
  const sheet = { validFrom: "2026-10-02", validTo: "2026-10-05", days };
  const result = sheetExceptions(sheet, ["kurim", "moravske-kninice"]);

  it("replaces every day of the week with its masses and services at parish churches", () => {
    expect(result.slice(0, 3)).toEqual([
      { date: "2026-10-02", reason: "dle ohlášek", services: [{ time: "18:15", place: "kurim" }] },
      { date: "2026-10-03", reason: "dle ohlášek", services: [{ time: "8:00", place: "kurim" }] },
      {
        date: "2026-10-04",
        reason: "dle ohlášek",
        services: [
          { time: "8:00", place: "kurim" },
          { time: "9:30", place: "moravske-kninice" },
          { time: "15:00", place: "kurim", title: "Adorace" },
        ],
      },
    ]);
  });

  it("leaves a day of the week without rows without masses", () => {
    expect(result[3]).toEqual({ date: "2026-10-05", reason: "dle ohlášek", services: [] });
    expect(result).toHaveLength(4);
  });

  it("covers every day of a two-week sheet", () => {
    const twoWeeks = sheetExceptions({ validFrom: "2026-10-04", validTo: "2026-10-18", days }, ["kurim"]);
    expect(twoWeeks.map((x) => x.date)).toHaveLength(15);
    expect(twoWeeks.at(-1)).toEqual({ date: "2026-10-18", reason: "dle ohlášek", services: [] });
  });
});

describe("markChanges", () => {
  const regular: RegularService[] = [
    { weekday: 4, time: "17:30", place: "kurim", title: "Adorace" },
    { weekday: 4, time: "18:00", place: "kurim" },
    { weekday: 5, time: "16:45", place: "kurim", rule: "not-first-in-month" },
    { weekday: 5, time: "18:15", place: "kurim", rule: "first-in-month" },
    { weekday: 0, time: "8:00", place: "kurim" },
  ];
  const mass = (time: string, place = "kurim") => ({ time, place, title: "Mše sv.", mass: true });
  const changed = (days: SheetDay[]) => markChanges(days, regular).map((d) => d.rows.map((r) => !!r.changed));

  it("tags masses that are not in the regular schedule of their date", () => {
    expect(
      changed([
        { date: "2026-10-01", rows: [mass("18:00"), mass("19:00"), mass("18:00", "moravske-kninice")] },
        { date: "2026-10-04", rows: [mass("8:00"), mass("9:30")] },
      ]),
    ).toEqual([
      [false, true, true],
      [false, true],
    ]);
  });

  it("applies the first-in-month rules", () => {
    expect(
      changed([
        { date: "2026-10-02", rows: [mass("18:15"), mass("16:45")] },
        { date: "2026-10-09", rows: [mass("18:15"), mass("16:45")] },
      ]),
    ).toEqual([
      [false, true],
      [true, false],
    ]);
  });

  it("leaves weekdays without a regular mass, other services and manual tags alone", () => {
    const days: SheetDay[] = [
      { date: "2026-10-06", rows: [mass("8:00")] },
      { date: "2026-10-01", rows: [{ time: "17:00", place: "kurim", title: "Adorace", service: true }] },
      { date: "2026-10-04", rows: [{ ...mass("8:00"), changed: true }] },
    ];
    expect(changed(days)).toEqual([[false], [false], [true]]);
  });
});

describe("publicDays", () => {
  it("drops details that are not public", () => {
    const rows = publicDays(days)[1].rows;
    expect(rows[0].detail).toBe("za farníky");
    expect(rows[1]).toEqual({ time: "10:00", place: "kurim", title: "Pohřeb" });
  });
});

describe("sortAnnouncements", () => {
  it("puts changes first and keeps the editor's order otherwise", () => {
    const items: Announcement[] = [
      { category: "smireni", html: "a" },
      { category: "info", html: "b" },
      { category: "zmena", html: "c" },
    ];
    expect(sortAnnouncements(items).map((a) => a.html)).toEqual(["c", "a", "b"]);
  });
});

describe("weekView", () => {
  it("shows today and the coming days by default", () => {
    expect(weekView(days, "2026-10-03", false)).toEqual({ days: days.slice(1), pastCount: 1 });
    expect(weekView(days, "2026-10-03", true)).toEqual({ days, pastCount: 1 });
  });

  it("shows the whole week with nothing to toggle once it is over, or before it starts", () => {
    expect(weekView(days, "2026-10-05", false)).toEqual({ days, pastCount: 0 });
    expect(weekView(days, "2026-10-01", false)).toEqual({ days, pastCount: 0 });
  });
});

describe("showWeekLabel", () => {
  it("uses the Czech plural", () => {
    expect(showWeekLabel(1)).toBe("Zobrazit celý týden (+1 den)");
    expect(showWeekLabel(3)).toBe("Zobrazit celý týden (+3 dny)");
    expect(showWeekLabel(6)).toBe("Zobrazit celý týden (+6 dní)");
  });

  it("names the whole period of a sheet longer than a week", () => {
    expect(showWeekLabel(9, false)).toBe("Zobrazit celé období (+9 dní)");
  });
});

describe("isOneWeek", () => {
  it("counts a sheet of up to 8 days as one week", () => {
    expect(isOneWeek({ validFrom: "2026-10-04", validTo: "2026-10-11" })).toBe(true);
    expect(isOneWeek({ validFrom: "2026-10-05", validTo: "2026-10-11" })).toBe(true);
  });

  it("does not count a two-week sheet, across the DST change too", () => {
    expect(isOneWeek({ validFrom: "2026-10-04", validTo: "2026-10-12" })).toBe(false);
    expect(isOneWeek({ validFrom: "2026-10-18", validTo: "2026-11-01" })).toBe(false);
  });
});
