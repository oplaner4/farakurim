import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readMonth } from "@/content/news";
import type { NewsEvent } from "@/content/types/news";
import { changedFields, parseCommand, replaceAktualita, replaceLines } from "./replace-aktualita";
import { useNewsFixture } from "../test-helpers";

const record = (fields: Partial<NewsEvent> = {}): NewsEvent => ({
  id: "hody-ceska-2026",
  title: "Hody v České",
  start: "2026-10-02",
  place: "Česká",
  text: "Srdečně zveme na tradiční hody.",
  ...fields,
});

describe("changedFields", () => {
  it("names the fields that differ, whatever the key order inside them", () => {
    const poster = { src: "/uploads/aktuality/a.webp", alt: "Plakát" };
    expect(changedFields(record({ poster }), record({ poster: { alt: "Plakát", src: poster.src } }))).toEqual([]);
    expect(changedFields(record({ time: "9:30" }), record({ title: "Hody", lead: "Zveme." }))).toEqual([
      "title",
      "time",
      "lead",
    ]);
  });
});

describe("replaceAktualita", () => {
  const news = useNewsFixture({
    "2025/12.json": [record({ id: "silvestr-2025-2026", start: "2025-12-31" })],
    "2026/09.json": [
      record({ id: "zari-2026", start: "2026-09-12", published: "2026-09-01", pinned: true }),
      record({ id: "pout-2026", start: "2026-09-20", published: "2026-09-02" }),
    ],
    "2026/10.json": [
      record({ id: "hody-2026", start: "2026-10-05", published: "2026-09-03" }),
      record({ id: "koncert-2026", start: "2026-10-20" }),
    ],
  });
  const now = new Date("2026-09-10T10:00:00Z");
  const ids = (file: string) => readMonth(news.dir(), file).map((e) => e.id);

  it("replaces the record in place, keeping its published date and pin", () => {
    const result = replaceAktualita(
      news.dir(),
      record({ id: "zari-2026", start: "2026-09-12", time: "10:00", pinned: true, published: "2026-09-10" }),
      { now },
    );
    expect(result).toMatchObject({ from: "2026/09.json", target: "2026/09.json", changed: ["time"], removed: [] });
    expect(result.written).toEqual(["2026/09.json"]);
    expect(readMonth(news.dir(), "2026/09.json")[0]).toEqual(
      record({ id: "zari-2026", start: "2026-09-12", time: "10:00", published: "2026-09-01", pinned: true }),
    );
    expect(replaceLines(result, false)).toEqual([
      "Replaced the record in src/content/news/2026/09.json",
      "Changed: time",
    ]);
  });

  it("keeps start-date order for a new start in the same month", () => {
    replaceAktualita(news.dir(), record({ id: "hody-2026", start: "2026-10-25" }), { now });
    expect(ids("2026/10.json")).toEqual(["koncert-2026", "hody-2026"]);
  });

  it("moves the record to its new start month, and removes a month file left empty", () => {
    const moved = replaceAktualita(news.dir(), record({ id: "pout-2026", start: "2026-10-10" }), { now });
    expect(moved).toMatchObject({ written: ["2026/10.json", "2026/09.json"], removed: [], changed: ["start"] });
    expect(ids("2026/10.json")).toEqual(["hody-2026", "pout-2026", "koncert-2026"]);
    expect(ids("2026/09.json")).toEqual(["zari-2026"]);

    const left = replaceAktualita(news.dir(), record({ id: "koncert-2026", start: "2026-12-08" }), { now });
    replaceAktualita(news.dir(), record({ id: "hody-2026", start: "2026-11-05" }), { now });
    const last = replaceAktualita(news.dir(), record({ id: "pout-2026", start: "2026-11-10" }), { now });
    expect(replaceLines(left, false)[0]).toBe(
      "Moved the record from src/content/news/2026/10.json to src/content/news/2026/12.json (new file)",
    );
    expect(last.removed).toEqual(["2026/10.json"]);
    expect(replaceLines(last, true).at(-1)).toBe("Would remove src/content/news/2026/10.json (no record left)");
    expect(existsSync(join(news.dir(), "2026/10.json"))).toBe(false);

    // The last month of a year takes its folder with it (an id holds the start year, so only one naming both).
    replaceAktualita(news.dir(), record({ id: "silvestr-2025-2026", start: "2026-01-01" }), { now });
    expect(ids("2026/01.json")).toEqual(["silvestr-2025-2026"]);
    expect(existsSync(join(news.dir(), "2025"))).toBe(false);
  });

  it("only checks with check", () => {
    const result = replaceAktualita(news.dir(), record({ id: "pout-2026", start: "2026-10-10" }), { now, check: true });
    expect(result.written).toEqual([]);
    expect(ids("2026/09.json")).toEqual(["zari-2026", "pout-2026"]);
  });

  it("refuses an unknown id, an invalid record and a change of the pin", () => {
    expect(() => replaceAktualita(news.dir(), record({ id: "nove-2026" }), { now })).toThrow(
      "there is no aktualita nove-2026: add a new one with pnpm add-aktualita",
    );
    expect(() => replaceAktualita(news.dir(), { ...record({ id: "hody-2026" }), start: "5. 10." }, { now })).toThrow(
      "the record is not valid",
    );
    expect(() => replaceAktualita(news.dir(), record({ id: "hody-2026", pinned: true }), { now })).toThrow(
      "the pin of hody-2026 changes only with pnpm pin-aktualita",
    );
    expect(() => replaceAktualita(news.dir(), record({ id: "zari-2026", start: "2026-09-12" }), { now })).toThrow(
      "the pin of zari-2026 changes only with pnpm pin-aktualita",
    );
  });
});

describe("parseCommand", () => {
  it("reads the record file (- for stdin) and --check", () => {
    expect(parseCommand(["record.json"])).toEqual({ file: "record.json", check: false });
    expect(parseCommand(["-", "--check"])).toEqual({ file: "-", check: true });
  });

  it("refuses an unknown option, no file and two files", () => {
    expect(() => parseCommand(["record.json", "--chek"])).toThrow(/--chek[^]*\nUsage: pnpm replace-aktualita/);
    expect(() => parseCommand([])).toThrow(/^Usage: pnpm replace-aktualita/);
    expect(() => parseCommand(["a.json", "b.json"])).toThrow(/^Usage: pnpm replace-aktualita/);
  });
});
