import { describe, expect, it } from "vitest";
import { events as allEvents } from "@/content/news";
import {
  currentNews,
  eventHref,
  eventSlug,
  eventStatus,
  featuredEvent,
  filterEvents,
  findEventBySlug,
  groupEvents,
  NEWS_FILTER_META,
  NEWS_FILTERS,
  otherEvents,
  posterAlt,
  slugify,
} from "./events";
import { event, events, ids, TODAY } from "./test-fixtures";

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

describe("posterAlt", () => {
  it("names the event, its date, time and place", () => {
    const base = { id: "x", title: "Farní den", start: "2026-10-18", text: "" };
    expect(posterAlt({ ...base, time: "9:30", place: "farní zahrada" })).toBe(
      "Plakát: Farní den, neděle 18. října 2026 v 9:30, farní zahrada",
    );
    expect(posterAlt(base)).toBe("Plakát: Farní den, neděle 18. října 2026");
  });
});
