import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readMonth } from "@/content/news";
import { newsEvent } from "@/test/fixtures";
import { changedFields, parseCommand, replaceEvent, replaceLines } from "./replace-event";
import { useNewsFixture } from "../test-helpers";

describe("changedFields", () => {
  it("names the fields that differ, whatever the key order inside them", () => {
    const poster = { src: "/uploads/aktuality/a.webp", alt: "Plakát" };
    expect(changedFields(newsEvent({ poster }), newsEvent({ poster: { alt: "Plakát", src: poster.src } }))).toEqual([]);
    expect(changedFields(newsEvent({ startTime: "9:30" }), newsEvent({ title: "Hody", lead: "Zveme." }))).toEqual([
      "title",
      "startTime",
      "lead",
    ]);
  });
});

describe("replaceEvent", () => {
  const news = useNewsFixture({
    "2025/12.json": [newsEvent({ id: "silvestr-2025-2026", start: "2025-12-31" })],
    "2026/09.json": [
      newsEvent({ id: "zari-2026", start: "2026-09-12", published: "2026-09-01", pinned: true }),
      newsEvent({ id: "pout-2026", start: "2026-09-20", published: "2026-09-02" }),
    ],
    "2026/10.json": [
      newsEvent({ id: "hody-2026", start: "2026-10-05", published: "2026-09-03" }),
      newsEvent({ id: "koncert-2026", start: "2026-10-20" }),
    ],
  });
  const now = new Date("2026-09-10T10:00:00Z");
  const ids = (file: string) => readMonth(news.dir(), file).map((e) => e.id);

  it("replaces the record in place, keeping its published date and pin", () => {
    const result = replaceEvent(
      news.dir(),
      newsEvent({ id: "zari-2026", start: "2026-09-12", startTime: "10:00", pinned: true, published: "2026-09-10" }),
      { now },
    );
    expect(result).toMatchObject({ from: "2026/09.json", target: "2026/09.json", changed: ["startTime"], removed: [] });
    expect(result.written).toEqual(["2026/09.json"]);
    expect(readMonth(news.dir(), "2026/09.json")[0]).toEqual(
      newsEvent({ id: "zari-2026", start: "2026-09-12", startTime: "10:00", published: "2026-09-01", pinned: true }),
    );
    expect(replaceLines(result, false)).toEqual(["Replaced the record zari-2026", "Changed: startTime"]);
  });

  it("keeps start-date order for a new start in the same month", () => {
    replaceEvent(news.dir(), newsEvent({ id: "hody-2026", start: "2026-10-25" }), { now });
    expect(ids("2026/10.json")).toEqual(["koncert-2026", "hody-2026"]);
  });

  it("moves the record to its new start month, and removes a month file left empty", () => {
    const moved = replaceEvent(news.dir(), newsEvent({ id: "pout-2026", start: "2026-10-10" }), { now });
    expect(moved).toMatchObject({ written: ["2026/10.json", "2026/09.json"], removed: [], changed: ["start"] });
    expect(ids("2026/10.json")).toEqual(["hody-2026", "pout-2026", "koncert-2026"]);
    expect(ids("2026/09.json")).toEqual(["zari-2026"]);

    const left = replaceEvent(news.dir(), newsEvent({ id: "koncert-2026", start: "2026-12-08" }), { now });
    replaceEvent(news.dir(), newsEvent({ id: "hody-2026", start: "2026-11-05" }), { now });
    const last = replaceEvent(news.dir(), newsEvent({ id: "pout-2026", start: "2026-11-10" }), { now });
    expect(replaceLines(left, false)).toEqual(["Replaced the record koncert-2026", "Changed: start"]);
    expect(last.removed).toEqual(["2026/10.json"]);
    expect(existsSync(join(news.dir(), "2026/10.json"))).toBe(false);

    // The last month of a year takes its folder with it (an id holds the start year, so only one naming both).
    replaceEvent(news.dir(), newsEvent({ id: "silvestr-2025-2026", start: "2026-01-01" }), { now });
    expect(ids("2026/01.json")).toEqual(["silvestr-2025-2026"]);
    expect(existsSync(join(news.dir(), "2025"))).toBe(false);
  });

  it("only checks with check", () => {
    const result = replaceEvent(news.dir(), newsEvent({ id: "pout-2026", start: "2026-10-10" }), { now, check: true });
    expect(result.written).toEqual([]);
    expect(ids("2026/09.json")).toEqual(["zari-2026", "pout-2026"]);
  });

  it("refuses an unknown id, an invalid record and a change of the pin", () => {
    expect(() => replaceEvent(news.dir(), newsEvent({ id: "nove-2026" }), { now })).toThrow(
      "there is no event nove-2026\nnext: pnpm add-event adds a new one",
    );
    expect(() => replaceEvent(news.dir(), { ...newsEvent({ id: "hody-2026" }), start: "5. 10." }, { now })).toThrow(
      "the record is not valid",
    );
    expect(() => replaceEvent(news.dir(), newsEvent({ id: "hody-2026", pinned: true }), { now })).toThrow(
      "the pin of hody-2026 changes only with pnpm pin-event",
    );
    expect(() => replaceEvent(news.dir(), newsEvent({ id: "zari-2026", start: "2026-09-12" }), { now })).toThrow(
      "the pin of zari-2026 changes only with pnpm pin-event",
    );
  });
});

describe("parseCommand", () => {
  it("reads the record file and --check, with this command's usage", () => {
    expect(parseCommand(["-", "--check"])).toEqual({ file: "-", check: true });
    expect(() => parseCommand([])).toThrow(/^Usage: pnpm replace-event <record.json \| -> \[--check\]$/);
  });
});
