import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { NewsEvent } from "@/content/types/news";
import {
  addAktualita,
  addYear,
  existingIds,
  formatFiles,
  insertRecord,
  monthFile,
  recordSource,
  toSource,
  yearFiles,
} from "./add-aktualita";

const root = fileURLToPath(new URL("..", import.meta.url));

// The newest year folder in news/ and the one after it, which does not exist yet: the new-year tests must keep
// passing after a real event of that year adds its folder.
const LAST_YEAR = Math.max(
  ...readdirSync(join(root, "src/content/news"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}$/.test(entry.name))
    .map((entry) => Number(entry.name)),
);
const NEW_YEAR = String(LAST_YEAR + 1);

/** Formats `files` (relative to `dir`) with the repo's Prettier config, as the command does. */
const prettier = (dir: string, files: string[]) => formatFiles(files.map((f) => join(dir, f)));

const record = (fields: Partial<NewsEvent> = {}): NewsEvent => ({
  id: "hody-ceska-2026",
  title: "Hody v České",
  start: "2026-10-02",
  place: "Česká",
  text: "Srdečně zveme na tradiční hody.",
  ...fields,
});

const october = (...starts: string[]) =>
  [
    'import type { NewsEvent } from "@/content/types/news";',
    "",
    "export const october: NewsEvent[] = [",
    ...starts.flatMap((start, i) => ["  {", `    id: "e${i}",`, `    start: "${start}",`, "  },"]),
    "];",
    "",
  ].join("\n");

/** The record IDs in a month file's source, in file order. */
const ids = (source: string) => [...existingIds([source])];

describe("toSource", () => {
  it("writes upload paths with the UPLOADS constant", () => {
    expect(toSource("/uploads/aktuality/hody-ceska-plakat.webp")).toBe("`${UPLOADS}/hody-ceska-plakat.webp`");
    expect(toSource("/uploads/petrklic/1/cover.webp")).toBe('"/uploads/petrklic/1/cover.webp"');
    expect(toSource("https://example.cz/uploads/aktuality/x.pdf")).toBe('"https://example.cz/uploads/aktuality/x.pdf"');
  });

  it("escapes text and keeps Czech letters", () => {
    expect(toSource('Zveme na „hody“ – a "koncert"\n')).toBe('"Zveme na „hody“ – a \\"koncert\\"\\n"');
  });

  it("writes nested values", () => {
    expect(toSource({ program: [{ time: "9:30", title: "Mše" }], longTerm: { weeklyAt: "18:30" }, sessions: 4 })).toBe(
      '{ program: [{ time: "9:30", title: "Mše" }], longTerm: { weeklyAt: "18:30" }, sessions: 4 }',
    );
    expect(toSource({ longTerm: true, pinned: true })).toBe("{ longTerm: true, pinned: true }");
  });
});

describe("recordSource", () => {
  it("writes one field per line, in the schema's order", () => {
    const poster = { src: "/uploads/aktuality/a.webp", alt: "a" };
    expect(recordSource({ text: "t", id: "a", poster, title: "T", start: "2026-10-02" })).toBe(
      [
        "  {",
        '    id: "a",',
        '    title: "T",',
        '    start: "2026-10-02",',
        '    text: "t",',
        '    poster: { src: `${UPLOADS}/a.webp`, alt: "a" },',
        "  },",
      ].join("\n"),
    );
  });
});

describe("monthFile", () => {
  it("is the file of the start month", () => {
    expect(monthFile("2026-10-02")).toEqual({ year: "2026", month: "10", name: "october", path: "2026/10.ts" });
    expect(monthFile("2027-01-31").path).toBe("2027/01.ts");
  });
});

describe("insertRecord", () => {
  const insert = (source: string, start: string) => insertRecord(source, record({ id: "new", start }), "october");

  it("keeps start-date order", () => {
    expect(ids(insert(october("2026-10-05", "2026-10-20"), "2026-10-01"))).toEqual(["new", "e0", "e1"]);
    expect(ids(insert(october("2026-10-05", "2026-10-20"), "2026-10-10"))).toEqual(["e0", "new", "e1"]);
    expect(ids(insert(october("2026-10-05", "2026-10-20"), "2026-10-25"))).toEqual(["e0", "e1", "new"]);
  });

  it("puts a record after the ones starting the same day", () => {
    expect(ids(insert(october("2026-10-05", "2026-10-05", "2026-10-09"), "2026-10-05"))).toEqual([
      "e0",
      "e1",
      "new",
      "e2",
    ]);
  });

  it("fills an empty month", () => {
    expect(ids(insert(yearFiles("2026")["10.ts"], "2026-10-05"))).toEqual(["new"]);
  });

  it("adds the UPLOADS import only when needed, and once", () => {
    const poster = { src: "/uploads/aktuality/new-plakat.webp", alt: "Plakát: Nové" };
    const once = insertRecord(october("2026-10-05"), record({ id: "new", poster }), "october");
    expect(once).toContain(
      'import type { NewsEvent } from "@/content/types/news";\nimport { UPLOADS } from "../uploads";',
    );
    const twice = insertRecord(once, record({ id: "newer", poster }), "october");
    expect(twice.match(/import \{ UPLOADS \}/g)).toHaveLength(1);
    expect(insert(october("2026-10-05"), "2026-10-06")).not.toContain("UPLOADS");
  });

  it("refuses a file it does not recognise", () => {
    expect(() => insertRecord(october(), record(), "november")).toThrow(/no "export const november/);
    expect(() => insert(october("2026-10-05").replace("  {", '  { id: "x" },\n  {'), "2026-10-06")).toThrow(
      /unexpected line/,
    );
    expect(() => insert(october("2026-10-05").replace(/ {4}start.*\n/, ""), "2026-10-06")).toThrow(/no start date/);
  });
});

describe("yearFiles and addYear", () => {
  it("creates a month file per month and an index joining them", () => {
    const files = yearFiles("2027");
    expect(Object.keys(files)).toHaveLength(13);
    expect(files["01.ts"]).toContain("export const january: NewsEvent[] = [];");
    expect(files["12.ts"]).toContain("export const december: NewsEvent[] = [];");
    expect(files["index.ts"]).toContain('import { june } from "./06";');
    expect(files["index.ts"]).toContain("export const events2027: NewsEvent[] = [...january, ");
  });

  it("lists the new year first in news/index.ts", () => {
    const updated = addYear(readFileSync(join(root, "src/content/news/index.ts"), "utf8"), NEW_YEAR);
    expect(updated).toContain(
      `import { events${LAST_YEAR} } from "./${LAST_YEAR}";\nimport { events${NEW_YEAR} } from "./${NEW_YEAR}";`,
    );
    // Prettier wraps the list, and the command formats the file afterwards.
    expect(updated.replace(/\s+/g, " ")).toContain(
      `export const events: NewsEvent[] = [...events${NEW_YEAR}, ...events${LAST_YEAR},`,
    );
    expect(() => addYear("export const x = 1;", "2027")).toThrow(/unexpected shape/);
  });
});

// Prettier and the imports of the copied files make these slower than the unit tests.
describe("addAktualita on a copy of news/", { timeout: 30_000 }, () => {
  let dir: string;
  let news: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "add-aktualita-"));
    news = join(dir, "news");
    cpSync(join(root, "src/content/news"), news, { recursive: true });
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const now = new Date("2026-10-07T10:00:00Z");
  const full = record({
    id: "hody-ceska-test-2026",
    start: "2026-10-03",
    end: "2026-10-04",
    time: "18:00–20:30",
    body: "<p>Program pro <strong>celou rodinu</strong>.</p>",
    program: [{ time: "18:00", title: "Stavění máje", note: "u obecního úřadu" }],
    links: [{ label: "obec@ceska.cz", href: "mailto:obec@ceska.cz" }],
    poster: { src: "/uploads/aktuality/hody-ceska-test-2026-plakat.webp", alt: "Plakát: Hody v České" },
    attachments: [{ label: "Plakát", file: "/uploads/aktuality/hody-ceska-test-2026-plakat.png", size: 1240000 }],
  });

  it("writes a record that reads back unchanged, in a formatted file", async () => {
    const { written } = addAktualita(news, full, { now });
    expect(written).toEqual(["2026/10.ts"]);
    await prettier(news, written);
    const formatted = readFileSync(join(news, "2026/10.ts"), "utf8");
    await prettier(news, written);
    expect(readFileSync(join(news, "2026/10.ts"), "utf8")).toBe(formatted);
    expect(formatted).toContain('    published: "2026-10-07",\n');
    expect(formatted).toContain(
      '    poster: { src: `${UPLOADS}/hody-ceska-test-2026-plakat.webp`, alt: "Plakát: Hody v České" },',
    );

    const { october: list } = (await import(`${join(news, "2026/10.ts")}?t=${Date.now()}`)) as {
      october: NewsEvent[];
    };
    expect(list.find((e) => e.id === full.id)).toEqual({ ...full, published: "2026-10-07" });
    expect(list.map((e) => e.start)).toEqual(list.map((e) => e.start).toSorted());
  });

  it("sets published to the Prague date and keeps one it is given", () => {
    // 22:30 UTC on 6 October is already 7 October in Prague.
    addAktualita(news, record({ id: "x-2026" }), { now: new Date("2026-10-06T22:30:00Z") });
    addAktualita(news, record({ id: "y-2026", published: "2026-09-21" }), { now });
    const source = readFileSync(join(news, "2026/10.ts"), "utf8");
    expect(source).toContain('published: "2026-10-07"');
    expect(source).toContain('published: "2026-09-21"');
  });

  it("only checks with check", () => {
    const before = readFileSync(join(news, "2026/10.ts"), "utf8");
    expect(addAktualita(news, full, { now, check: true })).toMatchObject({ target: "2026/10.ts", written: [] });
    expect(readFileSync(join(news, "2026/10.ts"), "utf8")).toBe(before);
  });

  it("refuses an invalid record with every problem, a taken ID and a migrated year", () => {
    expect(() => addAktualita(news, { ...record(), start: "x", tittle: "y" }, { now })).toThrow(
      /Unrecognized key: "tittle"[\s\S]*→ at start/,
    );
    expect(() => addAktualita(news, ["not", "a", "record"], { now })).toThrow(/not valid/);
    expect(() => addAktualita(news, record({ id: "setkani-prvokomunikantu-2026" }), { now })).toThrow(
      "id setkani-prvokomunikantu-2026 is already taken",
    );
    expect(() => addAktualita(news, record({ id: "x-2025", start: "2025-10-02" }), { now })).toThrow(
      /2025 is a migrated year/,
    );
  });

  it("starts a new year", async () => {
    const id = `trikralova-sbirka-${NEW_YEAR}`;
    const result = addAktualita(news, record({ id, start: `${NEW_YEAR}-01-02` }), { now });
    expect(result.newYear).toBe(true);
    expect(result.written).toEqual([...Object.keys(yearFiles(NEW_YEAR)).map((f) => `${NEW_YEAR}/${f}`), "index.ts"]);
    expect(existsSync(join(news, `${NEW_YEAR}/12.ts`))).toBe(true);
    await prettier(news, result.written);

    const { events } = (await import(`${join(news, "index.ts")}?t=${Date.now()}`)) as { events: NewsEvent[] };
    expect(events[0].id).toBe(id);
  });
});
