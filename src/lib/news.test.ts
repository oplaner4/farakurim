import { describe, expect, it } from "vitest";
import { events as allEvents } from "@/content/news";
import type { NewsEvent } from "@/content/types";
import {
  archiveListing,
  archivePage,
  archivePages,
  archivedEvents,
  archiveYears,
  currentNews,
  eventHref,
  eventSlug,
  eventStatus,
  featuredEvent,
  filterEvents,
  findEventBySlug,
  groupByMonth,
  groupEvents,
  latestArchiveYear,
  oldestArchiveYear,
  NEWS_FILTER_META,
  NEWS_FILTERS,
  otherEvents,
  parsePage,
  searchEvents,
  slugify,
} from "./news";

const event = (id: string, start: string, end?: string, extra: Partial<NewsEvent> = {}): NewsEvent => ({
  id,
  title: id,
  place: "",
  text: "",
  start,
  end,
  ...extra,
});

// Saturday 3. 10. 2026: the week ends on Sunday 4. 10., the month on 31. 10.
const TODAY = "2026-10-03";

const events = [
  event("later", "2026-12-19"),
  event("past", "2026-09-20"),
  event("ongoing", "2026-10-02", "2026-10-04"),
  event("soon", "2026-10-07"),
  event("pinned", "2026-10-18", undefined, { pinned: true }),
  event("weekly", "2026-10-01", "2027-04-29", { longTerm: { weeklyAt: "18:30" } }),
  event("long-past", "2026-03-01", "2026-09-30", { longTerm: true }),
];

const ids = (list: NewsEvent[]) => list.map((e) => e.id);

describe("eventStatus", () => {
  it("is now from start to end inclusive, but never for long-term series", () => {
    expect(eventStatus(events[2], "2026-10-02")).toBe("now");
    expect(eventStatus(events[2], "2026-10-04")).toBe("now");
    expect(eventStatus(events[2], "2026-10-05")).toBe("past");
    expect(eventStatus(events[3], TODAY)).toBe("upcoming");
    expect(eventStatus(events[5], TODAY)).toBe("upcoming");
  });
});

describe("currentNews", () => {
  it("drops finished and long-term items, sorts by start and applies the limit", () => {
    expect(ids(currentNews(events, TODAY, 2))).toEqual(["ongoing", "soon"]);
  });

  it("keeps a single-day item on its own day", () => {
    expect(ids(currentNews(events, "2026-10-07", 5))).toEqual(["soon", "pinned", "later"]);
  });
});

describe("featuredEvent", () => {
  it("is the pinned event until it ends", () => {
    expect(featuredEvent(events, TODAY)?.id).toBe("pinned");
    expect(featuredEvent(events, "2026-10-19")).toBeUndefined();
  });
});

describe("filterEvents", () => {
  it.each([
    ["upcoming", ["later", "ongoing", "soon", "weekly"]],
    ["week", ["ongoing"]],
    ["month", ["ongoing", "soon"]],
    ["long", ["weekly"]],
    ["all", ["later", "past", "ongoing", "soon", "weekly", "long-past"]],
  ] as const)("%s", (filter, expected) => {
    expect(ids(filterEvents(events, filter, TODAY))).toEqual(expected);
  });

  it("lists the pinned event again once it has finished", () => {
    expect(ids(filterEvents(events, "all", "2026-10-19"))).toContain("pinned");
  });
});

describe("groupEvents", () => {
  it("groups by start month, then long-term, then finished, each sorted by start", () => {
    const groups = groupEvents(filterEvents(events, "all", TODAY), TODAY);
    expect(groups.map((g) => (g.kind === "month" ? g.month : g.kind))).toEqual([
      "2026-10-01",
      "2026-12-01",
      "long",
      "past",
    ]);
    expect(groups.map((g) => ids(g.events))).toEqual([
      ["ongoing", "soon"],
      ["later"],
      ["weekly"],
      ["long-past", "past"],
    ]);
  });
});

describe("parsePage", () => {
  it.each([
    [null, 1],
    ["2", 2],
    ["0", 1],
    ["abc", 1],
    ["1.5", 1],
  ])("%s → %i", (value, expected) => {
    expect(parsePage(value)).toBe(expected);
  });
});

describe("slugs", () => {
  it("turns a Czech title into a URL part, unless the event sets its own", () => {
    expect(slugify("Slavnostní mše k jubileu 800 let")).toBe("slavnostni-mse-k-jubileu-800-let");
    expect(slugify("Proměna farnosti – Patrik (Tchaj-wan)!")).toBe("promena-farnosti-patrik-tchaj-wan");
    expect(eventSlug(event("x", TODAY, undefined, { title: "Hody v České", slug: "hody" }))).toBe("hody");
  });

  it("are unique and never clash with the Aktuality filter or archive pages", () => {
    const slugs = allEvents.map(eventSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const reserved = [...NEWS_FILTERS.map((f) => NEWS_FILTER_META[f].slug), "archiv"];
    expect(slugs.filter((s) => reserved.includes(s))).toEqual([]);
  });

  it("finds an event by its slug", () => {
    const jubilee = findEventBySlug(allEvents, "slavnostni-mse-k-jubileu-800-let");
    expect(jubilee?.id).toBe("jubileum-800-2026");
    expect(eventHref(jubilee!)).toBe("/aktuality/slavnostni-mse-k-jubileu-800-let/");
  });
});

describe("otherEvents", () => {
  it("lists the nearest unfinished events without the current one", () => {
    expect(ids(otherEvents(events, events[4], TODAY, 2))).toEqual(["ongoing", "soon"]);
    expect(ids(otherEvents(events, events[2], TODAY, 2))).toEqual(["soon", "pinned"]);
  });
});

describe("archive", () => {
  const list = [
    event("old", "2023-05-01"),
    event("last-year", "2025-12-24"),
    event("summer", "2026-08-08", "2026-08-15", { place: "Tišnov" }),
    event("hidden", "2026-08-01", undefined, { archiveHidden: true }),
    event("pout", "2026-06-28", undefined, { title: "Malhostovská pouť" }),
    event("same-day-longer", "2026-06-28", "2026-06-29"),
    ...events,
  ];

  it("takes finished, not hidden events from the day after their end, newest first", () => {
    expect(ids(archivedEvents(list, TODAY))).toEqual([
      "past",
      "summer",
      "same-day-longer",
      "pout",
      "long-past",
      "last-year",
      "old",
    ]);
    expect(ids(archivedEvents(list, "2026-10-05"))).toContain("ongoing");
    expect(ids(archivedEvents(list, "2026-10-04"))).not.toContain("ongoing");
  });

  it("defaults to the year of the newest archived event", () => {
    expect(latestArchiveYear(list, TODAY)).toBe(2026);
    expect(latestArchiveYear([], TODAY)).toBe(2026);
    expect(latestArchiveYear([event("x", "2025-12-24")], "2026-01-02")).toBe(2025);
  });

  it("splits the years into the default, the year before and older", () => {
    const archived = archivedEvents(list, TODAY);
    const years = archiveYears(2026);
    expect(years.map((y) => [y.slug, y.label])).toEqual([
      ["", "2026"],
      ["2025", "2025"],
      ["starsi", "Starší"],
    ]);
    expect(years.map((y) => archived.filter(y.matches).length)).toEqual([5, 1, 1]);
    // Events of a newer year stay on the default page until a rebuild adds their button.
    expect(archiveYears(2025)[0].matches(event("new", "2026-01-02"))).toBe(true);
  });

  it("has a page for every year from the oldest archived event, older years under Starší", () => {
    expect(oldestArchiveYear(list, TODAY, 2026)).toBe(2023);
    expect(oldestArchiveYear([], TODAY, 2026)).toBe(2026);
    expect(archivePages(2026, 2023).map((p) => [p.slug, p.button])).toEqual([
      ["", ""],
      ["2025", "2025"],
      ["starsi", "starsi"],
      ["2024", "starsi"],
      ["2023", "starsi"],
    ]);
    expect(archivePages(2026, 2026).map((p) => p.slug)).toEqual(["", "2025", "starsi"]);
    const archived = archivedEvents(list, TODAY);
    expect(ids(archived.filter(archivePage(2026, "2023").matches))).toEqual(["old"]);
    expect(archived.filter(archivePage(2026, "2024").matches)).toEqual([]);
    // After New Year's rebuild, 2025 keeps its URL, now under "Starší".
    expect(archivePage(2027, "2025").button).toBe("starsi");
    expect(ids(archived.filter(archivePage(2027, "2025").matches))).toEqual(["last-year"]);
    // Unknown slugs, and years with a button or newer, fall back to the default.
    for (const slug of ["x", "2026", "2030"]) expect(archivePage(2026, slug).slug).toBe("");
  });

  it("searches the title and place without case and diacritics", () => {
    expect(ids(searchEvents(list, "POUT"))).toEqual(["pout"]);
    expect(ids(searchEvents(list, "tišnov"))).toEqual(["summer"]);
    expect(ids(searchEvents(list, "malhost pouť"))).toEqual(["pout"]);
    expect(searchEvents(list, "koncert")).toEqual([]);
  });

  it("groups consecutive events by their start month", () => {
    const groups = groupByMonth(archivedEvents(list, TODAY));
    expect(groups.map((g) => [g.month, ids(g.events)])).toEqual([
      ["2026-09-01", ["past"]],
      ["2026-08-01", ["summer"]],
      ["2026-06-01", ["same-day-longer", "pout"]],
      ["2026-03-01", ["long-past"]],
      ["2025-12-01", ["last-year"]],
      ["2023-05-01", ["old"]],
    ]);
  });
});

describe("archiveListing", () => {
  const year = (y: number, n: number) =>
    Array.from({ length: n }, (_, i) =>
      event(`${y}-${i}`, `${y}-0${1 + (i % 9)}-${String(10 + (i % 18)).padStart(2, "0")}`),
    );
  const items = [...year(2026, 25), ...year(2025, 2), event("pout", "2026-06-28", undefined, { title: "Pouť" })];
  const listing = (o: Partial<{ yearSlug: string; query: string; page: number }>) =>
    archiveListing(items, { latest: 2026, yearSlug: "", query: "", page: 1, today: TODAY, ...o });

  it("counts the years and shows the first page of the year", () => {
    const l = listing({});
    expect(l.years.map((y) => y.count)).toEqual([26, 2, 0]);
    expect([l.matching.length, l.shownCount, l.countLabel]).toEqual([26, 20, "Zobrazeno 20 akcí"]);
  });

  it("marks the rows and months after the shown pages", () => {
    const l = listing({});
    const rows = l.groups.flatMap((g) => g.events);
    expect(rows.filter((r) => r.more)).toHaveLength(6);
    // A month is hidden only when its first row is.
    for (const g of l.groups) expect(g.more).toBe(g.events[0].more);
    expect(listing({ page: 2 }).groups.every((g) => !g.more)).toBe(true);
  });

  it("searches across all years and names the result count", () => {
    const l = listing({ yearSlug: "2025", query: "pout" });
    expect(l.matching.map((e) => e.id)).toEqual(["pout"]);
    expect(l.countLabel).toBe("Nalezeno 1 akce");
    expect(listing({ yearSlug: "2025" }).year.label).toBe("2025");
  });
});
