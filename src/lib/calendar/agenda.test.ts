import { describe, expect, it } from "vitest";
import type { CalendarEntry } from "@/content/types/calendar";
import type { NewsEvent } from "@/content/types/news";
import type { Place, PlaceId } from "@/content/types/services";
import {
  addRange,
  addToMonth,
  agendaByDate,
  calendarStatus,
  containsRange,
  dayCellLabel,
  dayHeading,
  daySummary,
  mergeEntries,
  monthGridRange,
  monthHeading,
  newsEntries,
  parseDayParam,
  parseMonthParam,
  scheduleEntries,
  shortWeekday,
  splitEvents,
  weekCardLabels,
  weekHeading,
  weekRange,
  weekRangeLabel,
  weekStart,
} from "./agenda";

const places = {
  kurim: { name: "Kuřim", color: "blue", mapQuery: "" },
  "moravske-kninice": { name: "Moravské Knínice", color: "green", mapQuery: "" },
  jinacovice: { name: "Jinačovice", color: "orange", mapQuery: "" },
} satisfies Record<PlaceId, Place>;

const entry = (e: Partial<CalendarEntry> & Pick<CalendarEntry, "id" | "date">): CalendarEntry => ({
  calendar: "events",
  title: e.id,
  ...e,
});

describe("monthGridRange", () => {
  it("spans whole weeks from Monday to Sunday", () => {
    expect(monthGridRange("2026-10")).toEqual({ from: "2026-09-28", to: "2026-11-01" });
    expect(monthGridRange("2026-02")).toEqual({ from: "2026-01-26", to: "2026-03-01" });
  });
});

describe("addToMonth", () => {
  it("crosses year boundaries", () => {
    expect(addToMonth("2026-12", 1)).toBe("2027-01");
    expect(addToMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("agendaByDate", () => {
  const range = { from: "2026-10-02", to: "2026-10-04" };

  it("puts all-day items first, then sorts by time", () => {
    const days = agendaByDate(
      [
        entry({ id: "b", date: "2026-10-04", time: "11:00", calendar: "services" }),
        entry({ id: "a", date: "2026-10-04", time: "8:00", calendar: "services" }),
        entry({ id: "c", date: "2026-10-04" }),
      ],
      range,
    );
    expect(days.get("2026-10-04")!.map((i) => i.title)).toEqual(["c", "a", "b"]);
  });

  it("shows a multi-day entry on each day, with the time on the first one only", () => {
    const days = agendaByDate([entry({ id: "x", date: "2026-10-01", end: "2026-10-03", time: "18:00" })], range);
    expect(days.get("2026-10-02")).toEqual([{ key: "events:x:2026-10-02", calendar: "events", title: "x" }]);
    expect(days.get("2026-10-03")).toHaveLength(1);
    expect(days.get("2026-10-04")).toEqual([]);
  });
});

describe("labels", () => {
  it("describes a day cell", () => {
    const items = [
      { key: "1", calendar: "services" as const, title: "Mše svatá" },
      { key: "2", calendar: "services" as const, title: "Mše svatá" },
      { key: "3", calendar: "events" as const, title: "Pouť" },
    ];
    expect(dayCellLabel("2026-10-18", items)).toBe("18. října, 2 bohoslužby, 1 akce");
    expect(dayCellLabel("2026-10-19", [])).toBe("19. října, nic v kalendáři");
  });

  it("titles the day detail relative to today", () => {
    expect(dayHeading("2026-10-03", "2026-10-03")).toBe("Dnes · Sobota 3. října");
    expect(dayHeading("2026-10-04", "2026-10-03")).toBe("Zítra · Neděle 4. října");
    expect(dayHeading("2026-10-18", "2026-10-03")).toBe("Neděle 18. října");
  });

  it("labels the week calendar cards", () => {
    expect(weekCardLabels("2026-10-03", "2026-10-03")).toEqual({ label: "Dnes", date: "so 3. 10." });
    expect(weekCardLabels("2026-10-04", "2026-10-03")).toEqual({ label: "Zítra", date: "ne 4. 10." });
    expect(weekCardLabels("2026-10-05", "2026-10-03")).toEqual({ label: "Pondělí", date: "5. 10." });
  });

  it("names the month", () => {
    expect(monthHeading("2026-10")).toBe("Říjen 2026");
  });
});

describe("scheduleEntries", () => {
  it("lists the services of each day with the note in the title", () => {
    const source = {
      regular: [
        { weekday: 0, time: "9:30", place: "kurim" as const, note: "s katechezí" },
        { weekday: 4, time: "17:30", place: "kurim" as const, title: "Adorace" },
      ],
      exceptions: [],
    };
    const entries = scheduleEntries(source, places, { from: "2026-10-01", to: "2026-10-04" });
    expect(entries.map(({ date, time, title, place }) => [date, time, title, place])).toEqual([
      ["2026-10-01", "17:30", "Adorace", "Kuřim"],
      ["2026-10-04", "9:30", "Mše svatá s katechezí", "Kuřim"],
    ]);
  });
});

describe("newsEntries", () => {
  const base = { place: "Tišnov", text: "" };
  const href = (e: NewsEvent) => `/aktuality/${e.id}/`;

  it("keeps single and multi-day events as one entry", () => {
    const events: NewsEvent[] = [{ ...base, id: "hody", title: "Hody", start: "2026-10-02", end: "2026-10-04" }];
    expect(newsEntries(events, href)).toEqual([
      {
        id: "hody",
        calendar: "events",
        title: "Hody",
        date: "2026-10-02",
        end: "2026-10-04",
        place: "Tišnov",
        href: "/aktuality/hody/",
      },
    ]);
  });

  it("splits series into their meetings and skips long-term events without a day", () => {
    const events: NewsEvent[] = [
      {
        ...base,
        id: "vecery",
        title: "Večery",
        start: "2026-10-11",
        end: "2026-11-21",
        time: "18:00–20:30",
        sessions: ["2026-10-11", { date: "2026-10-20", time: "9:00" }, { date: "2026-11-20", end: "2026-11-21" }],
      },
      { ...base, id: "seminar", title: "Seminář", start: "2026-03-01", end: "2026-11-30", longTerm: true },
    ];
    expect(newsEntries(events, href).map((e) => [e.id, e.date, e.end, e.time])).toEqual([
      ["vecery-2026-10-11", "2026-10-11", undefined, "18:00"],
      ["vecery-2026-10-20", "2026-10-20", undefined, "9:00"],
      ["vecery-2026-11-20", "2026-11-20", "2026-11-21", "18:00"],
    ]);
  });
});

describe("query parameters", () => {
  it("accepts real months and days only", () => {
    expect(parseMonthParam("2026-11")).toBe("2026-11");
    expect(parseMonthParam("2026-13")).toBeUndefined();
    expect(parseMonthParam(null)).toBeUndefined();
    expect(parseDayParam("2026-10-18")).toBe("2026-10-18");
    expect(parseDayParam("2026-02-30")).toBeUndefined();
    expect(parseDayParam("18. 10.")).toBeUndefined();
  });
});

describe("mergeEntries", () => {
  const build = [
    entry({ id: "a", date: "2026-10-18", title: "build" }),
    entry({ id: "b", date: "2026-11-15", title: "build" }),
    entry({ id: "gone", date: "2026-11-20" }),
  ];

  it("keeps the build's entries until something is read", () => {
    expect(mergeEntries(build, [])).toBe(build);
  });

  it("replaces only the days of the read range", () => {
    const read = {
      range: { from: "2026-10-26", to: "2026-12-06" },
      entries: [entry({ id: "b", date: "2026-11-15", title: "live" }), entry({ id: "new", date: "2026-12-01" })],
    };
    const merged = mergeEntries(build, [read]);
    // 18. 10. lies outside the read November grid, so the build's entry stays (e.g. the selected day).
    expect(merged.map((e) => `${e.id}:${e.title}`).sort()).toEqual(["a:build", "b:live", "new:new"]);
  });

  it("keeps an entry read by two overlapping ranges once", () => {
    const shared = entry({ id: "s", date: "2026-11-01" });
    const merged = mergeEntries(
      [],
      [
        { range: { from: "2026-09-28", to: "2026-11-01" }, entries: [shared] },
        { range: { from: "2026-10-26", to: "2026-12-06" }, entries: [shared] },
      ],
    );
    expect(merged).toEqual([shared]);
  });
});

describe("shown ranges", () => {
  const october = { from: "2026-09-28", to: "2026-11-01" };
  const november = { from: "2026-10-26", to: "2026-12-06" };

  it("knows whether a range lies within another", () => {
    const prerendered = { from: "2026-08-31", to: "2027-04-04" };
    expect(containsRange(prerendered, october)).toBe(true);
    expect(containsRange(prerendered, prerendered)).toBe(true);
    expect(containsRange(prerendered, { from: "2026-08-30", to: "2026-09-05" })).toBe(false);
    expect(containsRange(prerendered, { from: "2027-03-29", to: "2027-04-05" })).toBe(false);
  });

  it("adds a range once, keeping the array while nothing is new", () => {
    const one = addRange([], october);
    expect(one).toEqual([october]);
    // A copy with the same days is the same range (each render passes a new object).
    expect(addRange(one, { ...october })).toBe(one);
    expect(addRange(one, november)).toEqual([october, november]);
    // Same start, other end: another range.
    expect(addRange(one, { from: october.from, to: "2026-10-04" })).toHaveLength(2);
  });

  it("copies only the days of the range", () => {
    const [added] = addRange([], { ...october, extra: true } as typeof october);
    expect(added).toEqual(october);
  });
});

describe("calendarStatus", () => {
  const status = (s: Partial<Parameters<typeof calendarStatus>[0]>) =>
    calendarStatus({ live: true, prerendered: false, read: false, failed: false, ...s });

  it("is ready without an API key, whatever else holds", () => {
    expect(status({ live: false })).toBe("ready");
    expect(status({ live: false, failed: true })).toBe("ready");
  });

  it("is ready for a prerendered range before Google answers, also when it fails", () => {
    expect(status({ prerendered: true })).toBe("ready");
    expect(status({ prerendered: true, failed: true })).toBe("ready");
  });

  it("waits for Google outside the prerendered range", () => {
    expect(status({})).toBe("loading");
    expect(status({ read: true })).toBe("ready");
    expect(status({ failed: true })).toBe("error");
  });

  it("keeps an answer that a later retry failed to refresh", () => {
    expect(status({ read: true, failed: true })).toBe("ready");
  });
});

describe("week calendar", () => {
  it("runs Monday to Sunday", () => {
    expect(weekStart("2026-10-03")).toBe("2026-09-28");
    expect(weekStart("2026-09-28")).toBe("2026-09-28");
    expect(weekStart("2026-10-04")).toBe("2026-09-28");
    expect(weekRange("2026-10-03", 0)).toEqual({ from: "2026-09-28", to: "2026-10-04" });
    expect(weekRange("2026-10-03", 2)).toEqual({ from: "2026-10-12", to: "2026-10-18" });
    expect(weekRange("2026-10-03", -1)).toEqual({ from: "2026-09-21", to: "2026-09-27" });
  });

  it("crosses the daylight saving change", () => {
    expect(weekRange("2026-10-24", 1)).toEqual({ from: "2026-10-26", to: "2026-11-01" });
  });

  it("names the week", () => {
    expect(weekHeading(0, "2026-09-28")).toBe("Tento týden");
    expect(weekHeading(1, "2026-10-05")).toBe("Příští týden");
    expect(weekHeading(-1, "2026-09-21")).toBe("Minulý týden");
    expect(weekHeading(2, "2026-10-12")).toBe("Týden 12. 10.");
    expect(weekRangeLabel({ from: "2026-09-28", to: "2026-10-04" })).toBe("po 28. 9. – ne 4. 10.");
  });

  it("summarises a past day", () => {
    const item = (calendar: "events" | "services", key: string) => ({ key, calendar, title: key });
    expect(daySummary([item("services", "a"), item("services", "b"), item("events", "c")])).toBe("2× mše · 1 akce");
    expect(daySummary([item("events", "a"), item("events", "b"), item("events", "c")])).toBe("3 akce");
    expect(daySummary(Array.from({ length: 5 }, (_, i) => item("events", `${i}`)))).toBe("5 akcí");
    expect(daySummary([])).toBe("—");
    expect(shortWeekday("2026-09-28")).toBe("Po");
  });

  it("shows two events, or one and +N další", () => {
    expect(splitEvents(["a", "b"])).toEqual({ shown: ["a", "b"], hidden: 0 });
    expect(splitEvents(["a", "b", "c"])).toEqual({ shown: ["a"], hidden: 2 });
    expect(splitEvents([])).toEqual({ shown: [], hidden: 0 });
  });
});
