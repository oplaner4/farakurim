import { describe, expect, it } from "vitest";
import type { Announcement, SheetDay } from "@/content/types";
import { publicDays, sheetExceptions, showWeekLabel, sortAnnouncements, weekView } from "./service-sheet";

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
      { time: "15:00", place: "kurim", title: "Adorace", changed: true },
    ],
  },
];

describe("sheetExceptions", () => {
  it("replaces only days with a changed mass, with the masses at parish churches", () => {
    expect(sheetExceptions({ days }, ["kurim", "moravske-kninice"])).toEqual([
      {
        date: "2026-10-04",
        reason: "změna dle ohlášek",
        masses: [
          { time: "8:00", place: "kurim" },
          { time: "9:30", place: "moravske-kninice" },
        ],
      },
    ]);
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
});
