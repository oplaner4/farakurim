import { describe, expect, it } from "vitest";
import { newsEvent } from "@/test/fixtures";
import { changedItems, changedKeys, changedLine } from "./changes";

describe("changedKeys", () => {
  it("names the keys that differ, whatever the key order inside them", () => {
    const poster = { src: "/uploads/aktuality/a.webp", alt: "Plakát" };
    expect(changedKeys(newsEvent({ poster }), newsEvent({ poster: { alt: "Plakát", src: poster.src } }))).toEqual([]);
    expect(changedKeys(newsEvent({ startTime: "9:30" }), newsEvent({ title: "Hody", lead: "Zveme." }))).toEqual([
      "title",
      "startTime",
      "lead",
    ]);
  });
});

describe("changedItems", () => {
  const list = ["a", "b", "c", "d"];

  it("names nothing for equal lists", () => {
    expect(changedItems(list, [...list], "item")).toEqual([]);
  });

  it("names an item changed at its place", () => {
    expect(changedItems(list, ["a", "B", "c", "d"], "item")).toEqual(["item 2"]);
  });

  it("names only the items a merge touches", () => {
    expect(changedItems(list, ["a", "b+c", "d"], "item")).toEqual(["item 2", "removed item 3"]);
  });

  it("names an inserted item by its new number and a removed one by its old number", () => {
    expect(changedItems(list, ["a", "x", "b", "c", "d"], "item")).toEqual(["added item 2"]);
    expect(changedItems(list, ["a", "b", "d"], "item")).toEqual(["removed item 3"]);
  });

  it("names a reordering", () => {
    expect(changedItems(list, ["b", "a", "c", "d"], "item")).toEqual(["item order"]);
  });

  it("matches equal items at their own place first", () => {
    expect(changedItems(["a", "a"], ["a", "x", "a"], "item")).toEqual(["added item 2"]);
  });
});

describe("changedLine", () => {
  it("names what changed, or says nothing did", () => {
    expect(changedLine(["title", "start"])).toBe("Changed: title, start");
    expect(changedLine([])).toBe("Nothing changed");
  });
});
