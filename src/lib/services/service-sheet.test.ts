import { describe, expect, it } from "vitest";
import type { Announcement, RegularService, SheetDay } from "@/content/types/services";
import {
  currentSheet,
  isOneWeek,
  markChanges,
  periodDates,
  publicDays,
  scheduleExceptions,
  sheetCovering,
  sheetExceptions,
  sheetOrderProblems,
  sheetPdfFile,
  showWeekLabel,
  sortAnnouncements,
  toSheet,
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

describe("scheduleExceptions", () => {
  const sheet = { validFrom: "2026-10-02", validTo: "2026-10-05", days };
  const cancelled = (date: string) => ({ date, reason: "zrušeno", services: [] });

  it("adds the hand-entered exceptions after the sheet's days, by date", () => {
    const result = scheduleExceptions([sheet], [cancelled("2026-10-11"), cancelled("2026-10-18")], ["kurim"]);
    expect(result.map((x) => x.date)).toEqual([
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
      "2026-10-11",
      "2026-10-18",
    ]);
    expect(result.at(-1)).toEqual(cancelled("2026-10-18"));
  });

  it("drops hand-entered exceptions the sheet covers", () => {
    const result = scheduleExceptions([sheet], [cancelled("2026-10-04"), cancelled("2026-10-05")], ["kurim"]);
    expect(result).toEqual(sheetExceptions(sheet, ["kurim"]));
  });

  it("lets the newer sheet win the shared day and keeps every other day of both", () => {
    const next = {
      validFrom: "2026-10-05",
      validTo: "2026-10-06",
      days: [
        { date: "2026-10-05", rows: [{ time: "9:00", place: "kurim", title: "Mše sv.", mass: true }] },
        { date: "2026-10-06", rows: [] },
      ],
    };
    const result = scheduleExceptions([sheet, next], [cancelled("2026-10-06"), cancelled("2026-10-07")], ["kurim"]);
    expect(result.map((x) => x.date)).toEqual([
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
    ]);
    expect(result[3]).toEqual({
      date: "2026-10-05",
      reason: "dle ohlášek",
      services: [{ time: "9:00", place: "kurim" }],
    });
    expect(result.at(-1)).toEqual(cancelled("2026-10-07"));
  });

  it("leaves a gap between sheets to the regular schedule, except on a hand-entered exception there", () => {
    const later = { validFrom: "2026-10-11", validTo: "2026-10-11", days: [{ date: "2026-10-11", rows: [] }] };
    const dates = scheduleExceptions([sheet, later], [cancelled("2026-10-09")], ["kurim"]).map((x) => x.date);
    expect(dates).not.toContain("2026-10-08");
    expect(dates.slice(-2)).toEqual(["2026-10-09", "2026-10-11"]);
  });
});

describe("sheetCovering", () => {
  const sheets = [
    { validFrom: "2026-10-04", validTo: "2026-10-11" },
    { validFrom: "2026-10-18", validTo: "2026-10-25" },
  ];

  it("finds the sheet whose period holds the date, its first and last day included", () => {
    expect(sheetCovering(sheets, "2026-10-04")).toBe(sheets[0]);
    expect(sheetCovering(sheets, "2026-10-25")).toBe(sheets[1]);
    expect(sheetCovering(sheets, "2026-10-12")).toBeUndefined();
  });
});

describe("toSheet", () => {
  it("adds the PDF's URL, with the rev of a corrected PDF", () => {
    const record = { validFrom: "2026-10-04", validTo: "2026-10-11", days: [], announcements: [] };
    expect(toSheet(record)).toEqual({
      ...record,
      pdfUrl: "/uploads/porady_bohosluzeb/2026-10-04-porad-bohosluzeb.pdf",
    });
    expect(toSheet({ ...record, rev: 2 }).pdfUrl).toBe("/uploads/porady_bohosluzeb/2026-10-04-porad-bohosluzeb-r2.pdf");
    expect(sheetPdfFile({ validFrom: "2026-10-04", rev: 3 })).toBe(
      "porady_bohosluzeb/2026-10-04-porad-bohosluzeb-r3.pdf",
    );
  });
});

describe("periodDates", () => {
  it("lists every date of the period, across the DST change too", () => {
    expect(periodDates("2026-10-24", "2026-10-26")).toEqual(["2026-10-24", "2026-10-25", "2026-10-26"]);
    expect(periodDates("2026-10-04", "2026-10-04")).toEqual(["2026-10-04"]);
  });
});

describe("currentSheet", () => {
  const sheets = [
    { validFrom: "2026-10-04", validTo: "2026-10-11" },
    { validFrom: "2026-10-11", validTo: "2026-10-18" },
    { validFrom: "2026-10-25", validTo: "2026-11-01" },
  ];

  it("is the sheet whose week has started last", () => {
    expect(currentSheet(sheets, "2026-10-08")).toBe(sheets[0]);
    expect(currentSheet(sheets, "2026-10-12")).toBe(sheets[1]);
  });

  it("is the newer sheet on the shared Sunday", () => {
    expect(currentSheet(sheets, "2026-10-11")).toBe(sheets[1]);
  });

  it("stays on the last started sheet in a gap and after the last week", () => {
    expect(currentSheet(sheets, "2026-10-21")).toBe(sheets[1]);
    expect(currentSheet(sheets, "2026-12-01")).toBe(sheets[2]);
  });

  it("is the first sheet before any week starts, and nothing without sheets", () => {
    expect(currentSheet(sheets, "2026-09-01")).toBe(sheets[0]);
    expect(currentSheet([], "2026-10-08")).toBeUndefined();
  });
});

describe("sheetOrderProblems", () => {
  it("allows sheets sharing their boundary day, and gaps", () => {
    expect(
      sheetOrderProblems([
        { validFrom: "2026-10-04", validTo: "2026-10-11" },
        { validFrom: "2026-10-11", validTo: "2026-10-18" },
        { validFrom: "2026-10-25", validTo: "2026-11-01" },
      ]),
    ).toEqual([]);
  });

  it("names a sheet that starts before the previous one ends, or is out of order", () => {
    expect(
      sheetOrderProblems([
        { validFrom: "2026-10-04", validTo: "2026-10-11" },
        { validFrom: "2026-10-10", validTo: "2026-10-17" },
      ]),
    ).toEqual(["2026-10-10 – 2026-10-17 starts before 2026-10-04 – 2026-10-11 ends (only its last day may be shared)"]);
    expect(
      sheetOrderProblems([
        { validFrom: "2026-10-11", validTo: "2026-10-18" },
        { validFrom: "2026-10-04", validTo: "2026-10-11" },
      ]),
    ).toHaveLength(1);
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
