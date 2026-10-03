import { describe, expect, it } from "vitest";
import type { NewsEvent } from "@/content/types";
import { currentNews, eventStatus, featuredEvent, filterEvents, groupEvents, parsePage } from "./news";

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
