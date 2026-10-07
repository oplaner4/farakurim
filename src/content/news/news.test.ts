import { readdirSync } from "node:fs";
import { dirname } from "node:path";
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
