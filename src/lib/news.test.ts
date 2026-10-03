import { describe, expect, it } from "vitest";
import type { NewsItem } from "@/content/types";
import { currentNews, isOngoing } from "./news";

const item = (id: string, start: string, end?: string): NewsItem => ({
  id,
  title: id,
  excerpt: "",
  start,
  end,
  href: "#",
});

const items = [
  item("later", "2026-12-19"),
  item("past", "2026-09-20"),
  item("ongoing", "2026-10-02", "2026-10-04"),
  item("soon", "2026-10-07"),
];

describe("currentNews", () => {
  it("drops finished items, sorts by start and applies the limit", () => {
    expect(currentNews(items, "2026-10-03", 2).map((i) => i.id)).toEqual(["ongoing", "soon"]);
  });

  it("keeps a single-day item on its own day", () => {
    expect(currentNews(items, "2026-10-07", 5).map((i) => i.id)).toEqual(["soon", "later"]);
  });
});

describe("isOngoing", () => {
  it("is true from start to end inclusive", () => {
    expect(isOngoing(items[2], "2026-10-02")).toBe(true);
    expect(isOngoing(items[2], "2026-10-04")).toBe(true);
    expect(isOngoing(items[2], "2026-10-05")).toBe(false);
    expect(isOngoing(items[3], "2026-10-03")).toBe(false);
  });
});
