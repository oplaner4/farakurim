import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ScheduleException, SheetDay } from "@/content/types/services";
import { addOhlasky, ohlaskyLines, readOhlasky, type SheetWeek } from "./add-ohlasky";

/** Two hand-entered changes: one the 11.–18. 10. sheet covers (its last day), one after it (no reason, a note). */
const LATER: ScheduleException[] = [
  { date: "2026-10-18", services: [], reason: "pouť" },
  { date: "2026-10-19", services: [{ time: "10:00", place: "kurim", note: "hody" }] },
];

const week = (validFrom: string, validTo: string): SheetWeek => ({
  pdfUrl: `/uploads/porady_bohosluzeb/${validFrom}-porad-bohosluzeb.pdf`,
  validFrom,
  validTo,
});

/** A record (days and announcements) covering every date of the period. */
const record = (dates: string[], newsId?: string) => ({
  days: dates.map((date): SheetDay => ({
    date,
    rows: [{ time: "8:00", place: "kurim", title: "Mše sv.", mass: true }],
  })),
  announcements: [{ category: "info", html: "<p>Sbírka.</p>", ...(newsId && { newsId }) }],
});

const datesOf = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `2026-10-${String(from + i).padStart(2, "0")}`);

describe("addOhlasky on a temp ohlasky.json and news/", () => {
  let dir: string;
  let file: string;
  let news: string;
  const now = new Date("2026-10-09T10:00:00+02:00");
  const sheets = () => readOhlasky(file).sheets.map((s) => s.validFrom);
  const raw = () => readFileSync(file, "utf8");

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "add-ohlasky-"));
    file = join(dir, "ohlasky.json");
    news = join(dir, "news");
    mkdirSync(news);
    writeFileSync(join(news, "10.ts"), '  {\n    id: "farni-den-2026",\n  },\n');
    writeFileSync(file, JSON.stringify({ sheets: [], laterExceptions: LATER }));
    // An older sheet (27. 9.–4. 10.) and the current one (4.–11. 10.), written as the command writes them on
    // 30. 9., when both are still kept.
    const setup = { now: new Date("2026-09-30T10:00:00+02:00") };
    const september = ["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", ...datesOf(1, 4)];
    addOhlasky(file, news, record(september), week("2026-09-27", "2026-10-04"), setup);
    addOhlasky(file, news, record(datesOf(4, 11)), week("2026-10-04", "2026-10-11"), setup);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("adds the next week in advance, prunes the outdated sheet and the covered exception", () => {
    const result = addOhlasky(file, news, record(datesOf(11, 18), "farni-den-2026"), week("2026-10-11", "2026-10-18"), {
      now,
    });
    expect(result).toMatchObject({
      replaced: false,
      removed: ["2026-09-27 – 2026-10-04"],
      removedExceptions: ["2026-10-18"],
      written: [file],
    });
    expect(sheets()).toEqual(["2026-10-04", "2026-10-11"]);
    // The entry on the sheet's last day goes; the next day's stays exactly as written, no keys added.
    expect(readOhlasky(file).laterExceptions).toEqual([LATER[1]]);
    expect(Object.keys(JSON.parse(raw()).sheets[1])).toEqual([
      "pdfUrl",
      "validFrom",
      "validTo",
      "days",
      "announcements",
    ]);
    expect(ohlaskyLines(result, false)).toEqual([
      "Added the sheet 2026-10-11 – 2026-10-18 to src/content/ohlasky.json",
      "Removed the outdated sheet 2026-09-27 – 2026-10-04",
      "Removed the laterExceptions entry on 2026-10-18 (the sheet covers it)",
    ]);
  });

  it("keeps a stale current sheet when the next one comes late", () => {
    const monday = new Date("2026-10-12T10:00:00+02:00");
    addOhlasky(file, news, record(datesOf(11, 18)), week("2026-10-11", "2026-10-18"), { now: monday });
    expect(sheets()).toEqual(["2026-10-11"]);
    const late = new Date("2026-10-21T10:00:00+02:00");
    expect(
      addOhlasky(file, news, record(datesOf(25, 31)), week("2026-10-25", "2026-10-31"), { now: late }).removed,
    ).toEqual([]);
    expect(sheets()).toEqual(["2026-10-11", "2026-10-25"]);
  });

  it("replaces the sheet of the same week (a corrected PDF)", () => {
    const fixed = {
      ...week("2026-10-04", "2026-10-11"),
      pdfUrl: "/uploads/porady_bohosluzeb/2026-10-04-porad-bohosluzeb-2.pdf",
    };
    const result = addOhlasky(file, news, record(datesOf(4, 11)), fixed, { now });
    expect(result.replaced).toBe(true);
    expect(readOhlasky(file).sheets.at(-1)!.pdfUrl).toContain("porad-bohosluzeb-2.pdf");
    expect(ohlaskyLines(result, false)[0]).toBe(
      "Replaced the sheet 2026-10-04 – 2026-10-11 in src/content/ohlasky.json",
    );
  });

  it("refuses an overlap, a week before the current sheet, the PDF fields and an unknown aktualita", () => {
    const before = raw();
    expect(() => addOhlasky(file, news, record(datesOf(10, 17)), week("2026-10-10", "2026-10-17"), { now })).toThrow(
      "starts before 2026-10-04 – 2026-10-11 ends",
    );
    expect(() =>
      addOhlasky(file, news, record(["2026-09-20", "2026-09-21"]), week("2026-09-20", "2026-09-21"), { now }),
    ).toThrow("before the current sheet (2026-10-04)");
    expect(() =>
      addOhlasky(
        file,
        news,
        { ...record(datesOf(11, 18)), validFrom: "2026-10-11" },
        week("2026-10-11", "2026-10-18"),
        { now },
      ),
    ).toThrow("the script reads pdfUrl, validFrom and validTo from the PDF");
    expect(() =>
      addOhlasky(file, news, record(datesOf(11, 18), "neni-2026"), week("2026-10-11", "2026-10-18"), { now }),
    ).toThrow("no aktualita with the id neni-2026");
    expect(() => addOhlasky(file, news, record(datesOf(11, 17)), week("2026-10-11", "2026-10-18"), { now })).toThrow(
      "missing 2026-10-18",
    );
    expect(raw()).toBe(before);
  });

  it("refuses a broken ohlasky.json, also with check, and leaves it unchanged", () => {
    const add = (check: boolean) =>
      addOhlasky(file, news, record(datesOf(11, 18)), week("2026-10-11", "2026-10-18"), { now, check });
    writeFileSync(file, '{ "sheets": [');
    for (const check of [true, false]) expect(() => add(check)).toThrow(`${file} is not valid JSON`);
    const wrongPlace = JSON.stringify({
      sheets: [],
      laterExceptions: [{ date: "2026-10-25", services: [{ time: "10:00", place: "Vranov" }] }],
    });
    writeFileSync(file, wrongPlace);
    for (const check of [true, false]) expect(() => add(check)).toThrow("laterExceptions[0].services[0].place");
    expect(raw()).toBe(wrongPlace);
  });

  it("only validates with check", () => {
    const before = raw();
    const result = addOhlasky(file, news, record(datesOf(11, 18)), week("2026-10-11", "2026-10-18"), {
      now,
      check: true,
    });
    expect(result.written).toEqual([]);
    expect(raw()).toBe(before);
    expect(ohlaskyLines(result, true)).toEqual([
      "Would add the sheet 2026-10-11 – 2026-10-18 to src/content/ohlasky.json",
      "Would remove the outdated sheet 2026-09-27 – 2026-10-04",
      "Would remove the laterExceptions entry on 2026-10-18 (the sheet covers it)",
    ]);
  });
});
