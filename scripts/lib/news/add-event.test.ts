import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { readEvents, readMonth } from "@/content/news";
import type { NewsEvent } from "@/content/types/news";
import { newsEvent } from "@/test/fixtures";
import { addEvent, insertRecord, parseCommand, targetLine, venueLines } from "./add-event";
import { formatFiles, NEWS_DIR } from "../content-files";
import { useNewsFixture } from "../test-helpers/content";
import { freshTempDir } from "../test-helpers/files";

// The newest year folder in news/ and the one after it, which does not exist yet: the new-year test must keep
// passing after a real event of that year adds its folder.
const LAST_YEAR = Math.max(
  ...readdirSync(NEWS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}$/.test(entry.name))
    .map((entry) => Number(entry.name)),
);
const NEW_YEAR = String(LAST_YEAR + 1);
// A month of 2019 (two migrated records) without a file.
const FREE_2019 = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].find(
  (m) => !existsSync(join(NEWS_DIR, "2019", `${m}.json`)),
);

describe("insertRecord", () => {
  const list = (...starts: string[]) => starts.map((start, i) => newsEvent({ id: `e${i}`, start }));
  const ids = (events: NewsEvent[]) => events.map((e) => e.id);
  const insert = (events: NewsEvent[], start: string) => insertRecord(events, newsEvent({ id: "new", start }));

  it("keeps start-date order", () => {
    expect(ids(insert(list("2026-10-05", "2026-10-20"), "2026-10-01"))).toEqual(["new", "e0", "e1"]);
    expect(ids(insert(list("2026-10-05", "2026-10-20"), "2026-10-10"))).toEqual(["e0", "new", "e1"]);
    expect(ids(insert(list("2026-10-05", "2026-10-20"), "2026-10-25"))).toEqual(["e0", "e1", "new"]);
    expect(ids(insert(list("2026-10-05", "2026-10-05", "2026-10-09"), "2026-10-05"))).toEqual([
      "e0",
      "e1",
      "new",
      "e2",
    ]);
    expect(ids(insert([], "2026-10-05"))).toEqual(["new"]);
  });
});

describe("targetLine", () => {
  it("names the record added", () => {
    expect(targetLine({ record: { id: "hody-2026" } }, false)).toBe("Added the record hody-2026");
    expect(targetLine({ record: { id: "hody-2026" } }, true)).toBe("Would add the record hody-2026");
  });
});

// Prettier makes these slower than the unit tests.
describe("addEvent on a copy of news/", { timeout: 30_000 }, () => {
  const dir = freshTempDir("add-event");
  let news: string;
  beforeEach(() => {
    news = join(dir(), "news");
    cpSync(NEWS_DIR, news, { recursive: true });
  });

  const now = new Date("2026-10-07T10:00:00Z");
  const full = newsEvent({
    id: "hody-ceska-test-2026",
    start: "2026-10-03",
    end: "2026-10-04",
    startTime: "18:00",
    endTime: "20:30",
    text: 'Zveme na „hody“ – a na "koncert".',
    body: '<p>Program pro <strong>celou rodinu</strong>, <a href="https://www.ceska.cz/">obec Česká</a>.</p>',
    program: [{ time: "18:00", title: "Stavění máje", note: "u obecního úřadu" }],
    links: [{ label: "obec@ceska.cz", href: "mailto:obec@ceska.cz" }],
    poster: { src: "/uploads/aktuality/hody-ceska-test-2026-plakat.webp", alt: "Plakát: Hody v České" },
    attachments: [{ label: "Plakát", file: "/uploads/aktuality/hody-ceska-test-2026-plakat.png", size: 1240000 }],
  });
  const raw = (file: string) => readFileSync(join(news, file), "utf8");

  it("writes a record that reads back unchanged, in a formatted file", async () => {
    const { written } = addEvent(news, full, { now });
    expect(written).toEqual(["2026/10.json"]);
    await formatFiles(written.map((f) => join(news, f)));
    const formatted = raw("2026/10.json");
    await formatFiles(written.map((f) => join(news, f)));
    expect(raw("2026/10.json")).toBe(formatted);
    expect(formatted).toContain('"text": "Zveme na „hody“ – a na \\"koncert\\"."');
    expect(formatted).toContain('"published": "2026-10-07"');

    const list = readMonth(news, "2026/10.json");
    expect(list.find((e) => e.id === full.id)).toEqual({ ...full, published: "2026-10-07" });
    expect(list.map((e) => e.start)).toEqual(list.map((e) => e.start).toSorted());
  });

  it("sets published to the Prague date and keeps one it is given", () => {
    // 22:30 UTC on 6 October is already 7 October in Prague.
    addEvent(news, newsEvent({ id: "x-2026" }), { now: new Date("2026-10-06T22:30:00Z") });
    addEvent(news, newsEvent({ id: "y-2026", published: "2026-09-21" }), { now });
    const list = readMonth(news, "2026/10.json");
    expect(list.find((e) => e.id === "x-2026")?.published).toBe("2026-10-07");
    expect(list.find((e) => e.id === "y-2026")?.published).toBe("2026-09-21");
  });

  it("only checks with check", () => {
    const before = raw("2026/10.json");
    expect(addEvent(news, full, { now, check: true })).toMatchObject({ target: "2026/10.json", written: [] });
    expect(raw("2026/10.json")).toBe(before);
  });

  it("refuses an invalid record with every problem and a taken ID", () => {
    expect(() => addEvent(news, { ...newsEvent(), start: "x", tittle: "y" }, { now })).toThrow(
      /Unrecognized key: "tittle"[\s\S]*→ at start/,
    );
    expect(() => addEvent(news, ["not", "a", "record"], { now })).toThrow(/not valid/);
    expect(() => addEvent(news, newsEvent({ id: "setkani-prvokomunikantu-2026" }), { now })).toThrow(
      "id setkani-prvokomunikantu-2026 is already taken",
    );
  });

  it("notes but takes a venue from another municipality", () => {
    const elsewhere = addEvent(news, newsEvent({ id: "v-2026", place: "Česká, fara", venue: "kurim-fara" }), {
      now,
      check: true,
    });
    expect(venueLines(elsewhere.record)).toEqual([
      'tell: the venue kurim-fara is in Kuřim, which the place "Česká, fara" does not start with: check it is meant',
    ]);
    const fitting = newsEvent({ id: "v-2026", place: "Kuřim, fara", venue: "kurim-fara" });
    expect(addEvent(news, fitting, { now, check: true }).target).toBe("2026/10.json");
  });

  it("adds a record to a migrated year", () => {
    const result = addEvent(news, newsEvent({ id: "dodatek-2024", start: "2024-03-15" }), { now });
    expect(result.target).toBe("2024/03.json");
    const list = readMonth(news, "2024/03.json");
    expect(list.map((e) => e.id)).toContain("dodatek-2024");
    expect(list.map((e) => e.start)).toEqual(list.map((e) => e.start).toSorted());
  });

  it("creates the month file in an existing year", () => {
    expect(FREE_2019).toBeDefined();
    const result = addEvent(news, newsEvent({ id: "dodatek-2019", start: `2019-${FREE_2019}-10` }), { now });
    expect(result).toMatchObject({ target: `2019/${FREE_2019}.json` });
    expect(readMonth(news, `2019/${FREE_2019}.json`).map((e) => e.id)).toEqual(["dodatek-2019"]);
  });

  it("starts a new year", () => {
    const id = `trikralova-sbirka-${NEW_YEAR}`;
    const result = addEvent(news, newsEvent({ id, start: `${NEW_YEAR}-01-02` }), { now });
    expect(result).toMatchObject({ target: `${NEW_YEAR}/01.json`, written: [`${NEW_YEAR}/01.json`] });
    expect(readEvents(news)[0].id).toBe(id);
  });

  it("stops on a broken month file, also with check, and writes nothing", () => {
    writeFileSync(join(news, "2024/03.json"), raw("2024/03.json").replace(/\n\]\n?$/, ",\n]\n"));
    const before = raw("2026/10.json");
    for (const check of [true, false]) {
      expect(() => addEvent(news, full, { now, check })).toThrow(/2024\/03\.json is not valid JSON/);
    }
    expect(raw("2026/10.json")).toBe(before);
  });
});

describe("addEvent with pinned", () => {
  const news = useNewsFixture({
    "2026/09.json": [newsEvent({ id: "zari-2026", start: "2026-09-12", pinned: true })],
    "2026/10.json": [newsEvent({ id: "hody-2026", start: "2026-10-20" })],
  });
  const now = new Date("2026-10-07T10:00:00Z");
  const pinnedIds = () =>
    readEvents(news.dir())
      .filter((e) => e.pinned)
      .map((e) => e.id);

  it("moves the pin to the new record", () => {
    const result = addEvent(news.dir(), newsEvent({ id: "novy-2026", start: "2026-11-01", pinned: true }), { now });
    expect(result.unpinned.map((e) => e.id)).toEqual(["zari-2026"]);
    expect(result.written).toEqual(["2026/11.json", "2026/09.json"]);
    expect(pinnedIds()).toEqual(["novy-2026"]);
  });

  it("writes a month file once when it holds both records", () => {
    addEvent(news.dir(), newsEvent({ id: "x-2026", start: "2026-10-10", pinned: true }), { now });
    const result = addEvent(news.dir(), newsEvent({ id: "y-2026", start: "2026-10-12", pinned: true }), { now });
    expect(result.unpinned.map((e) => e.id)).toEqual(["x-2026"]);
    expect(result.written).toEqual(["2026/10.json"]);
    expect(pinnedIds()).toEqual(["y-2026"]);
  });

  it("only reports the unpinned record with check", () => {
    const result = addEvent(news.dir(), newsEvent({ id: "novy-2026", start: "2026-11-01", pinned: true }), {
      now,
      check: true,
    });
    expect(result.unpinned.map((e) => e.id)).toEqual(["zari-2026"]);
    expect(result.written).toEqual([]);
    expect(pinnedIds()).toEqual(["zari-2026"]);
  });

  it("refuses to pin a record that has ended, also with check", () => {
    for (const check of [true, false]) {
      expect(() =>
        addEvent(news.dir(), newsEvent({ id: "stare-2026", start: "2026-10-01", pinned: true }), { now, check }),
      ).toThrow("cannot pin stare-2026: it ended on 2026-10-01");
    }
    expect(pinnedIds()).toEqual(["zari-2026"]);
  });

  it("leaves the pin alone without pinned, and drops pinned: false", () => {
    const result = addEvent(news.dir(), newsEvent({ id: "novy-2026", start: "2026-10-25", pinned: false }), { now });
    expect(result.unpinned).toEqual([]);
    expect(result.written).toEqual(["2026/10.json"]);
    expect(readMonth(news.dir(), "2026/10.json").find((e) => e.id === "novy-2026")).not.toHaveProperty("pinned");
    expect(pinnedIds()).toEqual(["zari-2026"]);
  });
});

describe("parseCommand", () => {
  it("has this command's usage", () => {
    expect(() => parseCommand([])).toThrow(/^Usage: pnpm add-event <record.json \| -> \[--check\]$/);
  });
});
