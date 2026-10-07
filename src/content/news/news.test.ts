import { readdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { duplicates, isClock, isIsoDate, isSorted, minutes, UPLOAD } from "@/content/test-helpers";
import type { NewsEvent } from "@/content/types/news";
import { eventClock } from "@/lib/news/ics";
import { events } from "./index";

describe("Aktuality (news/)", () => {
  it.each(events.map((e) => [e.id, e] as const))("%s has valid dates", (_, e) => {
    expect(isIsoDate(e.start), `start ${e.start}`).toBe(true);
    if (e.end !== undefined) {
      expect(isIsoDate(e.end), `end ${e.end}`).toBe(true);
      expect(e.end > e.start, `end ${e.end} must be after start ${e.start} (omit it for one day)`).toBe(true);
    }
    if (e.registrationDeadline) expect(isIsoDate(e.registrationDeadline)).toBe(true);
    if (e.published) expect(isIsoDate(e.published), `published ${e.published}`).toBe(true);
  });

  it.each(events.filter((e) => e.time).map((e) => [e.id, e] as const))("%s has a readable time", (_, e) => {
    // An unreadable time ("18.00") makes the event all-day in the .ics file and the JSON-LD.
    const clock = eventClock(e);
    expect(clock, `time "${e.time}" must be "H:MM" or "H:MM–H:MM"`).toBeDefined();
    expect([clock!.from, clock!.to ?? clock!.from].every(isClock), e.time).toBe(true);
    if (clock!.to) expect(minutes(clock!.to)).toBeGreaterThan(minutes(clock!.from));
  });

  it("has unique IDs and at most one pinned event", () => {
    expect(duplicates(events.map((e) => e.id))).toEqual([]);
    expect(events.filter((e) => e.pinned).length).toBeLessThanOrEqual(1);
  });

  it("links uploaded files root-relative under /uploads/", () => {
    const files = events.flatMap((e) => [
      ...(e.poster ? [e.poster.src] : []),
      ...(e.attachments ?? []).map((a) => a.file),
    ]);
    expect(files.filter((f) => !UPLOAD.test(f))).toEqual([]);
  });

  it("has absolute links and poster alt texts", () => {
    const hrefs = events.flatMap((e) => (e.links ?? []).map((l) => l.href));
    expect(hrefs.filter((h) => !/^(https:\/\/|mailto:)/.test(h))).toEqual([]);
    expect(events.filter((e) => e.poster && !e.poster.alt.trim()).map((e) => e.id)).toEqual([]);
  });

  it("gives weekly series a valid time and multi-session events an end", () => {
    for (const e of events) {
      if (e.longTerm && e.longTerm !== true) expect(isClock(e.longTerm.weeklyAt), e.id).toBe(true);
      if (e.sessions !== undefined) expect(e.end, `${e.id}: sessions need an end`).toBeDefined();
    }
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
