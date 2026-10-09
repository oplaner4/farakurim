import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as z from "zod";
import { duplicates, isSorted } from "@/content/test-helpers";
import type { NewsEvent } from "@/content/types/news";
import { newsEventSchema } from "@/lib/news/schema";
import { events } from "./index";

describe("Aktuality (news/)", () => {
  // The rules of one record (dates, times, uploads, links, unknown fields) are the schema's, shared with the
  // add-aktualita script; failures name the field ("✖ must be H:MM → at longTerm.weeklyAt").
  it.each(events.map((e) => [e.id, e] as const))("%s matches the record schema", (_, e) => {
    const result = newsEventSchema.safeParse(e);
    expect(result.success, result.error && z.prettifyError(result.error)).toBe(true);
  });

  it("has unique IDs and at most one pinned event", () => {
    expect(duplicates(events.map((e) => e.id))).toEqual([]);
    expect(events.filter((e) => e.pinned).length).toBeLessThanOrEqual(1);
  });

  // public/.htaccess redirects the 2026 records' old title URLs to their IDs. Its rules run here as JS regexes: a
  // rule matching a detail page would hide it (an old path that prefixes its ID looped), and every old path, also
  // its kalendar.ics and without the slash, must lead to a record's page.
  describe("the redirected old detail URLs", () => {
    const htaccess = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../public/.htaccess"), "utf8");
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

  // news/<year>/<MM>.ts: the skill adds an event to the file of its start month, in start-date order.
  const newsDir = dirname(fileURLToPath(import.meta.url));
  const monthFiles = readdirSync(newsDir, { recursive: true, encoding: "utf8" }).filter((f) =>
    /^\d{4}[/\\]\d{2}\.ts$/.test(f),
  );
  it.each(monthFiles)("keeps news/%s to its month, in start-date order", async (file) => {
    const [year, month] = file.replace(/\.ts$/, "").split(/[/\\]/);
    const list = Object.values(await import(`./${year}/${month}.ts`)).flat() as NewsEvent[];
    expect(list.filter((e) => !e.start.startsWith(`${year}-${month}-`)).map((e) => e.id)).toEqual([]);
    expect(isSorted(list, (a, b) => a.start <= b.start)).toBe(true);
  });
});
