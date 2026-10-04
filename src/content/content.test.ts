import { isMatch } from "date-fns";
import { describe, expect, it, vi } from "vitest";
import { eventClock } from "@/lib/news/ics";
import { albums } from "./gallery";
import { parishChurches, places, regularServices } from "./masses";
import { events } from "./news";
import { scheduleExceptions, serviceSheet } from "./ohlasky";
import { petrklicIssues } from "./petrklic";
import { contacts, parish } from "./site";

// Checks on the content the farnost-create-* skills write from posters and PDFs: a typo there does not break the
// build, it quietly shows the wrong thing (an event without its time, a missing poster, a misplaced album).

vi.mock("server-only", () => ({}));

const isIsoDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && isMatch(date, "yyyy-MM-dd");
const isClock = (time: string) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(time);
const isMonthDay = (date: string) => /^\d{2}-\d{2}$/.test(date) && isMatch(`2024-${date}`, "yyyy-MM-dd");
const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
const isPlaceId = (place: string) => Object.hasOwn(places, place);
const duplicates = (values: unknown[]) => values.filter((v, i) => values.indexOf(v) !== i);
/** Every adjacent pair is in order (`ordered(a, b)` true), so the list is sorted. */
const isSorted = <T>(list: T[], ordered: (a: T, b: T) => boolean) =>
  list.every((item, i) => i === 0 || ordered(list[i - 1], item));
const UPLOAD = /^\/uploads\/[^\s]+\.(pdf|png|jpe?g|webp|mp3)$/;

describe("Aktuality (news.ts, news-archive/)", () => {
  it.each(events.map((e) => [e.id, e] as const))("%s has valid dates", (_, e) => {
    expect(isIsoDate(e.start), `start ${e.start}`).toBe(true);
    if (e.end !== undefined) {
      expect(isIsoDate(e.end), `end ${e.end}`).toBe(true);
      expect(e.end > e.start, `end ${e.end} must be after start ${e.start} (omit it for one day)`).toBe(true);
    }
    if (e.registrationDeadline) expect(isIsoDate(e.registrationDeadline)).toBe(true);
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
});

describe("Pořad bohoslužeb (masses.ts, ohlasky.ts)", () => {
  it("has a valid regular schedule", () => {
    for (const s of regularServices) {
      expect(s.weekday, s.time).toBeGreaterThanOrEqual(0);
      expect(s.weekday).toBeLessThanOrEqual(6);
      expect(isClock(s.time), s.time).toBe(true);
      expect(isPlaceId(s.place), s.place).toBe(true);
    }
  });

  it("only lets a not-first-in-month service give way to a first-in-month variant", () => {
    const firstInMonth = (weekday: number, place: string) =>
      regularServices.some((s) => s.rule === "first-in-month" && s.weekday === weekday && s.place === place);
    const orphans = regularServices.filter((s) => s.rule === "not-first-in-month" && !firstInMonth(s.weekday, s.place));
    expect(orphans).toEqual([]);
  });

  it("covers one week of consecutive days in the ohlášky", () => {
    const { validFrom, validTo, days } = serviceSheet;
    expect([validFrom, validTo, ...days.map((d) => d.date)].every(isIsoDate)).toBe(true);
    expect(validFrom <= validTo).toBe(true);
    expect(isSorted(days, (a, b) => a.date < b.date)).toBe(true);
    expect(days.every((d) => d.date >= validFrom && d.date <= validTo)).toBe(true);
    // During the week only the sheet's masses count, so a missing day would have none.
    const week = scheduleExceptions.filter((x) => x.date >= validFrom && x.date <= validTo).map((x) => x.date);
    expect(days.map((d) => d.date)).toEqual(week);
    expect(serviceSheet.pdfUrl).toMatch(UPLOAD);
  });

  it("lists the ohlášky rows of a day in time order", () => {
    for (const day of serviceSheet.days) {
      expect(
        day.rows.every((r) => isClock(r.time)),
        day.date,
      ).toBe(true);
      expect(
        isSorted(day.rows, (a, b) => minutes(a.time) <= minutes(b.time)),
        day.date,
      ).toBe(true);
    }
  });

  it("links announcements to existing Aktuality", () => {
    const ids = new Set(events.map((e) => e.id));
    const missing = serviceSheet.announcements.filter((a) => a.newsId && !ids.has(a.newsId)).map((a) => a.newsId);
    expect(missing).toEqual([]);
  });

  it("has valid schedule exceptions", () => {
    for (const x of scheduleExceptions) {
      expect(isIsoDate(x.date), x.date).toBe(true);
      expect(
        x.services.every((m) => isClock(m.time) && isPlaceId(m.place)),
        x.date,
      ).toBe(true);
    }
  });

  it("has valid office hours", () => {
    for (const slot of contacts.officeHours) {
      expect(isClock(slot.from) && isClock(slot.to), `${slot.from}–${slot.to}`).toBe(true);
      expect(minutes(slot.to)).toBeGreaterThan(minutes(slot.from));
      if (slot.closed) expect(isMonthDay(slot.closed.from) && isMonthDay(slot.closed.to)).toBe(true);
    }
  });
});

describe("Kostely a kaple (masses.ts)", () => {
  it("has one church or chapel per village of the parish, in the footer's order", () => {
    expect(parishChurches.map((c) => c.village)).toEqual(parish.villages.map((v) => v.name));
    for (const c of parishChurches) expect(c.building, c.village).not.toBe("");
  });
});

describe("Petrklíč (petrklic.ts)", () => {
  it("has unique IDs named after the year and number", () => {
    expect(duplicates(petrklicIssues.map((i) => i.id))).toEqual([]);
    for (const i of petrklicIssues) expect(i.id.startsWith(`${i.year}-${i.number}`), i.id).toBe(true);
  });

  it("lists the issues newest first", () => {
    const newer = (a: (typeof petrklicIssues)[number], b: (typeof petrklicIssues)[number]) =>
      a.year > b.year || (a.year === b.year && a.number >= b.number);
    expect(isSorted(petrklicIssues, newer)).toBe(true);
  });

  it("has uploaded files and a page image per page", () => {
    for (const i of petrklicIssues) {
      expect(i.pageCount, i.id).toBeGreaterThan(0);
      expect(i.pdfUrl).toMatch(UPLOAD);
      if (i.cover) expect(i.cover).toMatch(UPLOAD);
      if (i.pageImages) expect(i.pageImages, i.id).toHaveLength(i.pageCount);
    }
  });
});

describe("Fotogalerie (gallery.ts)", () => {
  it("has unique IDs and lists the albums newest first", () => {
    expect(duplicates(albums.map((a) => a.id))).toEqual([]);
    expect(albums.every((a) => isIsoDate(a.date))).toBe(true);
    expect(isSorted(albums, (a, b) => a.date >= b.date)).toBe(true);
  });

  it("links Zonerama and never shows more photos than the album has", () => {
    for (const a of albums) {
      expect(a.href, a.id).toMatch(/^https:\/\/(www|eu)\.zonerama\.com\//);
      expect(a.photoCount, a.id).toBeGreaterThan(0);
      if (a.photos) expect(a.photos.length, a.id).toBeLessThanOrEqual(a.photoCount);
    }
  });
});
