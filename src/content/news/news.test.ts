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

  // public/.htaccess redirects the 2026 records' old title URLs to their IDs: an ID must never be an old path (its
  // page would be hidden), and every redirect must lead to a record.
  it("keeps the redirected old detail URLs apart from the IDs", () => {
    const htaccess = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../public/.htaccess"), "utf8");
    const redirects = [
      ...htaccess.matchAll(
        /^RedirectMatch 301 \^\/aktuality\/([a-z0-9-]+)\/\?\(\.\*\)\$ \/aktuality\/([a-z0-9-]+)\/\$1$/gm,
      ),
    ];
    const ids = new Set(events.map((e) => e.id));
    expect(redirects.length).toBeGreaterThan(0);
    expect(redirects.map((r) => r[1]).filter((from) => ids.has(from))).toEqual([]);
    expect(redirects.map((r) => r[2]).filter((to) => !ids.has(to))).toEqual([]);
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
