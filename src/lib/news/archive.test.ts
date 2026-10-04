import { describe, expect, it } from "vitest";
import { archiveListing, archivedEvents, archiveYearList, archiveYears, groupByMonth, searchEvents } from "./archive";
import { event, events, ids, TODAY } from "./test-fixtures";

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

  it("lists the years with an archived event, newest first", () => {
    expect(archiveYearList(list, TODAY)).toEqual([2026, 2025, 2023]);
    expect(archiveYearList([], TODAY)).toEqual([2026]);
    expect(archiveYearList([event("x", "2025-12-24")], "2026-01-02")).toEqual([2025]);
  });

  it("gives every year a button, the newest as the default", () => {
    const archived = archivedEvents(list, TODAY);
    const years = archiveYears([2026, 2025, 2023]);
    expect(years.map((y) => [y.slug, y.label])).toEqual([
      ["", "2026"],
      ["2025", "2025"],
      ["2023", "2023"],
    ]);
    expect(years.map((y) => archived.filter(y.matches).length)).toEqual([5, 1, 1]);
    // Events of a newer year stay on the default page until a rebuild adds their button.
    expect(archiveYears([2025])[0].matches(event("new", "2026-01-02"))).toBe(true);
    expect(archiveYears([2026, 2025])[1].matches(event("new", "2026-01-02"))).toBe(false);
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
    archiveListing(items, { years: [2026, 2025], yearSlug: "", query: "", page: 1, today: TODAY, ...o });

  it("counts the years and shows the first 20 events of the year", () => {
    const l = listing({});
    expect(l.years.map((y) => y.count)).toEqual([26, 2]);
    expect([l.matching.length, l.shownCount, l.countLabel]).toEqual([26, 20, "Zobrazeno 20 z 26 akcí"]);
    expect(listing({ page: 2 }).countLabel).toBe("Zobrazeno 26 akcí");
  });

  it("marks the rows and months after the shown pages", () => {
    const l = listing({});
    const rows = l.groups.flatMap((g) => g.events);
    expect(rows.filter((r) => r.more)).toHaveLength(6);
    // A month is hidden only when its first row is.
    for (const g of l.groups) expect(g.more).toBe(g.events[0].more);
    expect(listing({ page: 2 }).groups.every((g) => !g.more)).toBe(true);
  });

  it("offers the year before, except on the oldest year and while searching", () => {
    expect(listing({}).previous?.slug).toBe("2025");
    expect(listing({ yearSlug: "2025" }).previous).toBeUndefined();
    expect(listing({ query: "pout" }).previous).toBeUndefined();
  });

  it("falls back to the newest year for an unknown slug", () => {
    expect(listing({ yearSlug: "starsi" }).year.slug).toBe("");
  });

  it("searches across all years and names the result count", () => {
    const l = listing({ yearSlug: "2025", query: "pout" });
    expect(l.matching.map((e) => e.id)).toEqual(["pout"]);
    expect(l.countLabel).toBe("Nalezeno 1 akce");
    expect(listing({ yearSlug: "2025" }).year.label).toBe("2025");
  });
});
