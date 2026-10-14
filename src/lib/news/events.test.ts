import { describe, expect, it } from "vitest";
import { events as allEvents } from "@/content/news";
import {
  currentNews,
  eventHref,
  eventPageTitle,
  eventTags,
  featuredEvent,
  filterEvents,
  findEventById,
  groupEvents,
  NEWS_FILTER_META,
  NEWS_FILTERS,
  otherEvents,
} from "./events";
import { at, event, events, ids, TODAY } from "@/test/fixtures";

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

  it("leaves out a cancelled pinned event", () => {
    const cancelled = event("pinned", "2026-10-18", undefined, { pinned: true, change: { status: "cancelled" } });
    expect(featuredEvent([cancelled], TODAY)).toBeUndefined();
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

describe("detail URLs", () => {
  it("are the IDs and never clash with the Aktuality filter or archive pages", () => {
    const reserved = [...NEWS_FILTERS.map((f) => NEWS_FILTER_META[f].slug), "archiv"];
    expect(allEvents.map((e) => e.id).filter((id) => reserved.includes(id))).toEqual([]);
  });

  it("finds an event by its ID", () => {
    const jubilee = findEventById(allEvents, "jubileum-800-2026");
    expect(jubilee?.title).toBe("Slavnostní mše k jubileu 800 let");
    expect(eventHref(jubilee!)).toBe("/aktuality/jubileum-800-2026/");
  });
});

describe("otherEvents", () => {
  it("lists the nearest unfinished events without the current one", () => {
    expect(ids(otherEvents(events, events[4], TODAY, 2))).toEqual(["ongoing", "soon"]);
    expect(ids(otherEvents(events, events[2], TODAY, 2))).toEqual(["soon", "pinned"]);
  });
});

describe("eventPageTitle", () => {
  it("adds the year only when another event has the same title", () => {
    const adoration = (id: string, start: string) => ({ id, title: "Adorační den", start, text: "" });
    const list = [
      adoration("a", "2020-11-08"),
      adoration("b", "2021-11-07"),
      { ...adoration("c", "2022-05-01"), title: "Pouť" },
    ];
    expect(eventPageTitle(list[0], list)).toBe("Adorační den 2020");
    expect(eventPageTitle(list[1], list)).toBe("Adorační den 2021");
    expect(eventPageTitle(list[2], list)).toBe("Pouť");
  });

  it("tells every event of the site apart", () => {
    const titles = allEvents.map((e) => eventPageTitle(e, allEvents));
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("eventTags", () => {
  const labels = (tags: { label: string }[]) => tags.map((t) => t.label);

  it("lists the badges in order", () => {
    const full = event("x", "2026-10-02", "2026-10-04", {
      registrationDeadline: "2026-10-03",
      price: "200 Kč",
      sessions: ["2026-10-02", "2026-10-03", "2026-10-04"],
      tags: [{ label: "Pro rodiny" }, { label: "Bez bariér", color: "orange" }],
    });
    expect(eventTags(full, at(TODAY))).toEqual([
      { kind: "now", label: "Právě probíhá" },
      { kind: "orange", label: "Přihlášky do 3. 10." },
      { kind: "blue", label: "200 Kč" },
      { kind: "blue", label: "3 setkání" },
      { kind: "blue", label: "Pro rodiny" },
      { kind: "orange", label: "Bez bariér" },
    ]);
  });

  it('gives a cancelled event only "Zrušeno" and puts "Přesunuto" first', () => {
    const priced = { price: "200 Kč", registrationDeadline: "2026-10-10" };
    const cancelled = event("x", "2026-10-18", undefined, { ...priced, change: { status: "cancelled" } });
    expect(eventTags(cancelled, at(TODAY))).toEqual([{ kind: "cancelled", label: "Zrušeno" }]);
    const moved = event("x", "2026-10-24", undefined, {
      ...priced,
      change: { status: "moved", previousStart: "2026-10-17" },
    });
    expect(labels(eventTags(moved, at(TODAY)))).toEqual(["Přesunuto", "Přihlášky do 10. 10.", "200 Kč"]);
  });

  it("puts a meeting today and the next meeting of a series first", () => {
    const evening = event("x", TODAY, undefined, { startTime: "18:00", price: "200 Kč" });
    expect(eventTags(evening, at(TODAY, "10:00"))).toEqual([
      { kind: "magenta", label: "Dnes v 18:00" },
      { kind: "blue", label: "200 Kč" },
    ]);
    const series = event("x", "2026-10-01", "2026-10-08", { sessions: ["2026-10-01", "2026-10-08"] });
    expect(eventTags(series, at(TODAY))).toEqual([
      { kind: "blue", label: "Další setkání 8. 10." },
      { kind: "blue", label: "2 setkání" },
    ]);
  });

  it("shows the registration deadline until its day has passed", () => {
    const until = (deadline: string) => event("x", "2026-10-18", undefined, { registrationDeadline: deadline });
    expect(labels(eventTags(until(TODAY), at(TODAY)))).toEqual(["Přihlášky do 3. 10."]);
    expect(eventTags(until("2026-10-02"), at(TODAY))).toEqual([]);
  });

  it("marks weekly series, but not other long-term events", () => {
    expect(labels(eventTags(events[5], at(TODAY)))).toEqual(["Každý týden"]);
    expect(eventTags(event("x", "2026-10-01", "2027-06-30", { longTerm: true }), at(TODAY))).toEqual([]);
  });

  it('ends a past event with "Proběhlo"', () => {
    expect(eventTags(events[1], at(TODAY))).toEqual([{ kind: "grey", label: "Proběhlo" }]);
  });
});
