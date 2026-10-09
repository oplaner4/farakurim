import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readEvents, readMonth } from "@/content/news";
import type { NewsEvent } from "@/content/types/news";
import { addAktualita, insertRecord, monthFile, targetLine } from "./add-aktualita";
import { formatFiles, NEWS_DIR } from "./content-files";

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

const record = (fields: Partial<NewsEvent> = {}): NewsEvent => ({
  id: "hody-ceska-2026",
  title: "Hody v České",
  start: "2026-10-02",
  place: "Česká",
  text: "Srdečně zveme na tradiční hody.",
  ...fields,
});

describe("monthFile", () => {
  it("is the JSON file of the start month", () => {
    expect(monthFile("2026-10-02")).toBe("2026/10.json");
    expect(monthFile("2027-01-31")).toBe("2027/01.json");
  });
});

describe("insertRecord", () => {
  const list = (...starts: string[]) => starts.map((start, i) => record({ id: `e${i}`, start }));
  const ids = (events: NewsEvent[]) => events.map((e) => e.id);
  const insert = (events: NewsEvent[], start: string) => insertRecord(events, record({ id: "new", start }));

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
  it("says where the record went, and when the file is new", () => {
    expect(targetLine({ target: "2026/10.json", created: false }, false)).toBe(
      "Added the record to src/content/news/2026/10.json",
    );
    expect(targetLine({ target: "2027/01.json", created: true }, true)).toBe(
      "Would add the record to src/content/news/2027/01.json (new file)",
    );
  });
});

// Prettier makes these slower than the unit tests.
describe("addAktualita on a copy of news/", { timeout: 30_000 }, () => {
  let dir: string;
  let news: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "add-aktualita-"));
    news = join(dir, "news");
    cpSync(NEWS_DIR, news, { recursive: true });
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const now = new Date("2026-10-07T10:00:00Z");
  const full = record({
    id: "hody-ceska-test-2026",
    start: "2026-10-03",
    end: "2026-10-04",
    time: "18:00–20:30",
    text: 'Zveme na „hody“ – a na "koncert".',
    body: '<p>Program pro <strong>celou rodinu</strong>, <a href="https://www.ceska.cz/">obec Česká</a>.</p>',
    program: [{ time: "18:00", title: "Stavění máje", note: "u obecního úřadu" }],
    links: [{ label: "obec@ceska.cz", href: "mailto:obec@ceska.cz" }],
    poster: { src: "/uploads/aktuality/hody-ceska-test-2026-plakat.webp", alt: "Plakát: Hody v České" },
    attachments: [{ label: "Plakát", file: "/uploads/aktuality/hody-ceska-test-2026-plakat.png", size: 1240000 }],
  });
  const raw = (file: string) => readFileSync(join(news, file), "utf8");

  it("writes a record that reads back unchanged, in a formatted file", async () => {
    const { written, created } = addAktualita(news, full, { now });
    expect({ written, created }).toEqual({ written: ["2026/10.json"], created: false });
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
    addAktualita(news, record({ id: "x-2026" }), { now: new Date("2026-10-06T22:30:00Z") });
    addAktualita(news, record({ id: "y-2026", published: "2026-09-21" }), { now });
    const list = readMonth(news, "2026/10.json");
    expect(list.find((e) => e.id === "x-2026")?.published).toBe("2026-10-07");
    expect(list.find((e) => e.id === "y-2026")?.published).toBe("2026-09-21");
  });

  it("only checks with check", () => {
    const before = raw("2026/10.json");
    expect(addAktualita(news, full, { now, check: true })).toMatchObject({ target: "2026/10.json", written: [] });
    expect(raw("2026/10.json")).toBe(before);
  });

  it("refuses an invalid record with every problem and a taken ID", () => {
    expect(() => addAktualita(news, { ...record(), start: "x", tittle: "y" }, { now })).toThrow(
      /Unrecognized key: "tittle"[\s\S]*→ at start/,
    );
    expect(() => addAktualita(news, ["not", "a", "record"], { now })).toThrow(/not valid/);
    expect(() => addAktualita(news, record({ id: "setkani-prvokomunikantu-2026" }), { now })).toThrow(
      "id setkani-prvokomunikantu-2026 is already taken",
    );
  });

  it("adds a record to a migrated year", () => {
    const result = addAktualita(news, record({ id: "dodatek-2024", start: "2024-03-15" }), { now });
    expect(result.target).toBe("2024/03.json");
    const list = readMonth(news, "2024/03.json");
    expect(list.map((e) => e.id)).toContain("dodatek-2024");
    expect(list.map((e) => e.start)).toEqual(list.map((e) => e.start).toSorted());
  });

  it("creates the month file in an existing year", () => {
    expect(FREE_2019).toBeDefined();
    const result = addAktualita(news, record({ id: "dodatek-2019", start: `2019-${FREE_2019}-10` }), { now });
    expect(result).toMatchObject({ target: `2019/${FREE_2019}.json`, created: true });
    expect(readMonth(news, `2019/${FREE_2019}.json`).map((e) => e.id)).toEqual(["dodatek-2019"]);
  });

  it("starts a new year", () => {
    const id = `trikralova-sbirka-${NEW_YEAR}`;
    const result = addAktualita(news, record({ id, start: `${NEW_YEAR}-01-02` }), { now });
    expect(result).toMatchObject({ target: `${NEW_YEAR}/01.json`, created: true, written: [`${NEW_YEAR}/01.json`] });
    expect(readEvents(news)[0].id).toBe(id);
  });

  it("stops on a broken month file, also with check, and writes nothing", () => {
    writeFileSync(join(news, "2024/03.json"), raw("2024/03.json").replace(/\n\]\n?$/, ",\n]\n"));
    const before = raw("2026/10.json");
    for (const check of [true, false]) {
      expect(() => addAktualita(news, full, { now, check })).toThrow(/2024\/03\.json is not valid JSON/);
    }
    expect(raw("2026/10.json")).toBe(before);
  });
});
