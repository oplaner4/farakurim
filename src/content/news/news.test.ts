import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { duplicates, isSorted } from "@/lib/test/content-checks";
import { events, monthFiles, readEvents, readMonth } from "./index";

const newsDir = dirname(fileURLToPath(import.meta.url));

describe("Aktuality (news/)", () => {
  // The rules of one record (dates, times, uploads, links, unknown fields) are the schema's: the loader checks every
  // month file with it on import, so a broken record fails here naming the file and the field.

  it("has unique IDs and at most one pinned event", () => {
    expect(duplicates(events.map((e) => e.id))).toEqual([]);
    expect(events.filter((e) => e.pinned).length).toBeLessThanOrEqual(1);
  });

  // public/.htaccess redirects the 2026 records' old title URLs to their IDs. Its rules run here as JS regexes: a
  // rule matching a detail page would hide it (an old path that prefixes its ID looped), and every old path, also
  // its kalendar.ics and without the slash, must lead to a record's page.
  describe("the redirected old detail URLs", () => {
    const htaccess = readFileSync(join(newsDir, "../../../public/.htaccess"), "utf8");
    const rules = [...htaccess.matchAll(/^RedirectMatch 301 (\^\/aktuality\/([a-z0-9-]+)\S*) (\S+)$/gm)].map(
      ([, from, old, to]) => ({ from: new RegExp(from), old, to }),
    );
    /** Where the first matching rule sends `path`, as Apache's RedirectMatch does (`$1` is the same in JS). */
    const redirect = (path: string) => {
      const rule = rules.find((r) => r.from.test(path));
      return rule && path.replace(rule.from, rule.to);
    };
    const pages = events.flatMap((e) => [`/aktuality/${e.id}/`, `/aktuality/${e.id}/kalendar.ics`]);

    it("never catch a detail page", () => {
      expect(rules.length).toBeGreaterThan(0);
      expect(pages.filter((page) => redirect(page) !== undefined)).toEqual([]);
    });

    it("lead each old path to a record's page", () => {
      const paths = rules.flatMap(({ old: o }) => [
        `/aktuality/${o}`,
        `/aktuality/${o}/`,
        `/aktuality/${o}/kalendar.ics`,
      ]);
      expect(paths.filter((path) => !pages.includes(redirect(path) ?? ""))).toEqual([]);
    });
  });

  // news/<year>/<MM>.json: the script adds an event to the file of its start month, in start-date order.
  it.each(monthFiles(newsDir))("keeps news/%s to its month, in start-date order", (file) => {
    const list = readMonth(newsDir, file);
    const month = file.replace(/\.json$/, "").replace("/", "-");
    expect(list.length).toBeGreaterThan(0);
    expect(list.filter((e) => !e.start.startsWith(`${month}-`)).map((e) => e.id)).toEqual([]);
    expect(isSorted(list, (a, b) => a.start <= b.start)).toBe(true);
  });

  it("holds nothing but the month files, the loader and this test", () => {
    const stray = readdirSync(newsDir, { recursive: true, encoding: "utf8" })
      .map((f) => f.replaceAll("\\", "/"))
      .filter((f) => !/^\d{4}$/.test(f) && !/^\d{4}\/\d{2}\.json$/.test(f))
      .filter((f) => f !== "index.ts" && f !== "news.test.ts");
    expect(stray).toEqual([]);
  });
});

describe("readEvents", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "news-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const write = (file: string, data: unknown) => {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), typeof data === "string" ? data : JSON.stringify(data));
  };
  const event = (id: string, start: string) => ({ id, title: "T", start, text: "T." });

  it("lists the newest year first and the months of a year in order", () => {
    write("2025/12.json", [event("c-2025", "2025-12-01")]);
    write("2026/10.json", [event("b-2026", "2026-10-01")]);
    write("2026/02.json", [event("a-2026", "2026-02-01")]);
    write("2026/notes.txt", "x");
    expect(monthFiles(dir)).toEqual(["2026/02.json", "2026/10.json", "2025/12.json"]);
    expect(readEvents(dir).map((e) => e.id)).toEqual(["a-2026", "b-2026", "c-2025"]);
  });

  it("names the file and the field of a broken record, and a file that is not JSON", () => {
    write("2026/10.json", [{ id: "x-2026", start: "2026-10-01", text: "T." }]);
    expect(() => readEvents(dir)).toThrow(/2026\/10\.json is not valid:[\s\S]*title/);
    write("2026/10.json", '[{ "id": "x-2026", }]');
    expect(() => readEvents(dir)).toThrow(/2026\/10\.json is not valid JSON/);
  });
});
