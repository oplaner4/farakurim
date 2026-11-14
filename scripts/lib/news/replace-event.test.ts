import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readMonth } from "@/content/news";
import { newsEvent } from "@/test/fixtures";
import { draftEvent, draftLine, parseCommand, replaceEvent, replaceLines } from "./replace-event";
import { useNewsFixture } from "../test-helpers/content";
import { freshTempDir } from "../test-helpers/files";

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

  it("names a new venue, and notes one from another municipality", () => {
    const atFara = newsEvent({ id: "pout-2026", start: "2026-09-20", place: "Kuřim, fara", venue: "kurim-fara" });
    const result = replaceEvent(news.dir(), atFara, { now, check: true });
    expect(replaceLines(result, true)).toContain("Changed: place, venue");
    const elsewhere = replaceEvent(news.dir(), { ...atFara, place: "Česká, fara" }, { now, check: true });
    expect(replaceLines(elsewhere, true)).toContain(
      'tell: the venue kurim-fara is in Kuřim, which the place "Česká, fara" does not start with: check it is meant',
    );
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

describe("draftEvent", () => {
  const pinned = newsEvent({
    id: "zari-2026",
    start: "2026-09-12",
    published: "2026-09-01",
    pinned: true,
    poster: { src: "/uploads/aktuality/zari-2026-plakat.webp", alt: "Plakát: Září" },
    attachments: [{ label: "Plakát", file: "/uploads/aktuality/zari-2026-plakat.pdf", size: 1200 }],
  });
  const news = useNewsFixture({ "2026/09.json": [pinned] });
  const dir = freshTempDir("draft-event");

  it("writes the record whole, which replaces it with no change", () => {
    const out = join(dir(), "record.json");
    const result = draftEvent(news.dir(), { id: "zari-2026", out });
    const draft = JSON.parse(readFileSync(out, "utf8"));
    expect(draft).toEqual(pinned);
    expect(draftLine(result)).toBe(`Wrote the draft record of zari-2026 ("${pinned.title}", 2026-09-12) to ${out}`);
    const now = new Date("2026-09-10T10:00:00Z");
    expect(replaceEvent(news.dir(), draft, { now, check: true }).changed).toEqual([]);
  });

  it("refuses an unknown id, before writing", () => {
    const out = join(dir(), "none.json");
    expect(() => draftEvent(news.dir(), { id: "nove-2026", out })).toThrow("there is no event nove-2026");
    expect(existsSync(out)).toBe(false);
  });
});

describe("parseCommand", () => {
  it("reads a record file and --check, or --draft with --out", () => {
    expect(parseCommand(["r.json", "--check"])).toEqual({ file: "r.json", check: true });
    expect(parseCommand(["--draft", "hody-2026", "--out", "d.json"])).toEqual({ draft: "hody-2026", out: "d.json" });
  });

  it("has this command's usage", () => {
    const usage = /^Usage: pnpm replace-event <record.json \| -> \[--check\] \| --draft <id> --out <record.json>$/;
    expect(() => parseCommand([])).toThrow(usage);
    expect(() => parseCommand(["--draft", "hody-2026"])).toThrow(usage);
    expect(() => parseCommand(["--out", "d.json"])).toThrow(usage);
    expect(() => parseCommand(["--draft", "hody-2026", "--out", "d.json", "--check"])).toThrow(usage);
    expect(() => parseCommand(["r.json", "--draft", "hody-2026", "--out", "d.json"])).toThrow(usage);
  });
});
