import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readEvents } from "@/content/news";
import type { NewsEvent } from "@/content/types/news";
import { assertPinnable, parseCommand, pinAktualita, pinLines } from "./pin-aktualita";
import { useNewsFixture } from "./test-helpers";

const event = (id: string, start: string, fields: Partial<NewsEvent> = {}): NewsEvent => ({
  id,
  title: `Akce ${id}`,
  start,
  place: "Kuřim",
  text: "Srdečně zveme.",
  ...fields,
});

// 7 October 2026 in Prague: "zari-2026" has ended, "dnes-2026" ends today, "hody-2026" is upcoming.
const now = new Date("2026-10-07T10:00:00Z");

describe("pinAktualita", () => {
  const news = useNewsFixture({
    "2026/09.json": [event("zari-2026", "2026-09-12", { pinned: true })],
    "2026/10.json": [event("dnes-2026", "2026-10-05", { end: "2026-10-07" }), event("hody-2026", "2026-10-20")],
  });
  const pinnedIds = () =>
    readEvents(news.dir())
      .filter((e) => e.pinned)
      .map((e) => e.id);
  const raw = (file: string) => readFileSync(join(news.dir(), file), "utf8");

  it("moves the pin and writes both month files", () => {
    const result = pinAktualita(news.dir(), "hody-2026", { now });
    expect(result.pinned?.id).toBe("hody-2026");
    expect(result.unpinned.map((e) => e.id)).toEqual(["zari-2026"]);
    expect(result.written).toEqual(["2026/09.json", "2026/10.json"]);
    expect(pinnedIds()).toEqual(["hody-2026"]);
    // The unpinned record loses the key, it does not get "pinned": false.
    expect(raw("2026/09.json")).not.toContain("pinned");
  });

  it("only reports with check", () => {
    const before = [raw("2026/09.json"), raw("2026/10.json")];
    const result = pinAktualita(news.dir(), "hody-2026", { now, check: true });
    expect(result.unpinned.map((e) => e.id)).toEqual(["zari-2026"]);
    expect(result.written).toEqual([]);
    expect([raw("2026/09.json"), raw("2026/10.json")]).toEqual(before);
  });

  it("unpins every pinned record with null", () => {
    const result = pinAktualita(news.dir(), null, { now });
    expect(result.pinned).toBeUndefined();
    expect(result.written).toEqual(["2026/09.json"]);
    expect(pinnedIds()).toEqual([]);
  });

  it("repairs data with several pinned records", () => {
    pinAktualita(news.dir(), "dnes-2026", { now });
    // A hand edit pins "zari-2026" again.
    writeFileSync(
      join(news.dir(), "2026/09.json"),
      JSON.stringify([event("zari-2026", "2026-09-12", { pinned: true })]),
    );
    expect(pinAktualita(news.dir(), "hody-2026", { now }).unpinned.map((e) => e.id)).toEqual([
      "zari-2026",
      "dnes-2026",
    ]);
    expect(pinnedIds()).toEqual(["hody-2026"]);
  });

  it("pins an event ending today, and writes nothing when it is already the only pinned one", () => {
    pinAktualita(news.dir(), "dnes-2026", { now });
    const result = pinAktualita(news.dir(), "dnes-2026", { now });
    expect(result).toMatchObject({ alreadyPinned: true, unpinned: [], written: [] });
    expect(pinnedIds()).toEqual(["dnes-2026"]);
  });

  it("refuses an unknown id and an event that has ended, before writing", () => {
    const before = raw("2026/09.json");
    expect(() => pinAktualita(news.dir(), "nic-2026", { now })).toThrow("there is no aktualita nic-2026");
    expect(() => pinAktualita(news.dir(), "zari-2026", { now })).toThrow(
      "cannot pin zari-2026: it ended on 2026-09-12",
    );
    expect(raw("2026/09.json")).toBe(before);
  });
});

describe("assertPinnable", () => {
  it("accepts an event until its last day", () => {
    expect(() => assertPinnable(event("a-2026", "2026-10-01", { end: "2026-10-07" }), "2026-10-07")).not.toThrow();
    expect(() => assertPinnable(event("a-2026", "2026-10-06"), "2026-10-07")).toThrow(
      "cannot pin a-2026: it ended on 2026-10-06",
    );
  });
});

describe("pinLines", () => {
  const hody = event("hody-2026", "2026-10-20");
  const zari = event("zari-2026", "2026-09-12");

  it("names what was pinned and unpinned", () => {
    expect(pinLines({ pinned: hody, unpinned: [zari] }, false)).toEqual([
      "Unpinned zari-2026 (Akce zari-2026)",
      "Pinned hody-2026 (Akce hody-2026)",
    ]);
    expect(pinLines({ unpinned: [zari] }, true)).toEqual(["Would unpin zari-2026 (Akce zari-2026)"]);
    expect(pinLines({ pinned: hody, unpinned: [] }, true)).toEqual(["Would pin hody-2026 (Akce hody-2026)"]);
    expect(pinLines({ unpinned: [] }, false)).toEqual(["Nothing is pinned"]);
    expect(pinLines({ pinned: hody, unpinned: [], alreadyPinned: true }, false)).toEqual([
      "hody-2026 (Akce hody-2026) is already the only pinned aktualita",
    ]);
  });
});

describe("parseCommand", () => {
  it("reads the id or --none, and --check", () => {
    expect(parseCommand(["hody-2026"])).toEqual({ id: "hody-2026", check: false });
    expect(parseCommand(["hody-2026", "--check"])).toEqual({ id: "hody-2026", check: true });
    expect(parseCommand(["--none"])).toEqual({ id: null, check: false });
  });

  it("refuses no id, an id with --none, two ids and an unknown option", () => {
    expect(() => parseCommand([])).toThrow(/^Usage: pnpm pin-aktualita/);
    expect(() => parseCommand(["hody-2026", "--none"])).toThrow(/^Usage: pnpm pin-aktualita/);
    expect(() => parseCommand(["a", "b"])).toThrow(/^Usage: pnpm pin-aktualita/);
    expect(() => parseCommand(["hody-2026", "--chek"])).toThrow(/--chek[^]*\nUsage: pnpm pin-aktualita/);
  });
});
