import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ScheduleException, SheetDay } from "@/content/types/services";
import { addOhlasky, ohlaskyLines, readOhlasky, readScheduleExceptions, type SheetWeek } from "./add-ohlasky";

/** Two hand-entered changes: one the 11.–18. 10. sheet covers (its last day), one after it (no reason, a note). */
const LATER: ScheduleException[] = [
  { date: "2026-10-18", services: [], reason: "pouť" },
  { date: "2026-10-19", services: [{ time: "10:00", place: "kurim", note: "hody" }] },
];

const week = (validFrom: string, validTo: string): SheetWeek => ({ validFrom, validTo });

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

describe("addOhlasky on a temp ohlasky.json, schedule-exceptions.json and news/", () => {
  let dir: string;
  let file: string;
  let laterFile: string;
  let files: { ohlaskyFile: string; exceptionsFile: string; newsDir: string };
  const now = new Date("2026-10-09T10:00:00+02:00");
  const sheets = () => readOhlasky(file).sheets.map((s) => s.validFrom);
  const raw = () => readFileSync(file, "utf8");

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "add-ohlasky-"));
    file = join(dir, "ohlasky.json");
    laterFile = join(dir, "schedule-exceptions.json");
    const news = join(dir, "news");
    files = { ohlaskyFile: file, exceptionsFile: laterFile, newsDir: news };
    mkdirSync(join(news, "2026"), { recursive: true });
    writeFileSync(
      join(news, "2026", "10.json"),
      JSON.stringify([{ id: "farni-den-2026", title: "Farní den", start: "2026-10-11", text: "Farní den." }]),
    );
    writeFileSync(file, JSON.stringify({ sheets: [] }));
    writeFileSync(laterFile, JSON.stringify({ exceptions: LATER }));
    // An older sheet (27. 9.–4. 10.) and the current one (4.–11. 10.), written as the command writes them on
    // 30. 9., when both are still kept.
    const setup = { now: new Date("2026-09-30T10:00:00+02:00") };
    const september = ["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", ...datesOf(1, 4)];
    addOhlasky(files, record(september), week("2026-09-27", "2026-10-04"), setup);
    addOhlasky(files, record(datesOf(4, 11)), week("2026-10-04", "2026-10-11"), setup);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("adds the next week in advance, prunes the outdated sheet and the covered exception", () => {
    const result = addOhlasky(files, record(datesOf(11, 18), "farni-den-2026"), week("2026-10-11", "2026-10-18"), {
      now,
    });
    expect(result).toMatchObject({
      replaced: false,
      removed: ["2026-09-27 – 2026-10-04"],
      coveredExceptions: ["2026-10-18"],
      pastExceptions: [],
      written: [file, laterFile],
    });
    expect(sheets()).toEqual(["2026-10-04", "2026-10-11"]);
    // The entry on the sheet's last day goes; the next day's stays exactly as written, no keys added.
    expect(readScheduleExceptions(laterFile).exceptions).toEqual([LATER[1]]);
    expect(Object.keys(JSON.parse(raw()).sheets[1])).toEqual(["validFrom", "validTo", "days", "announcements"]);
    expect(ohlaskyLines(result, false)).toEqual([
      "Added the sheet 2026-10-11 – 2026-10-18 to src/content/ohlasky.json",
      "Removed the outdated sheet 2026-09-27 – 2026-10-04",
      "Removed the later change on 2026-10-18 from src/content/schedule-exceptions.json (a sheet covers it)",
    ]);
  });

  it("keeps a stale current sheet when the next one comes late", () => {
    const monday = new Date("2026-10-12T10:00:00+02:00");
    addOhlasky(files, record(datesOf(11, 18)), week("2026-10-11", "2026-10-18"), { now: monday });
    expect(sheets()).toEqual(["2026-10-11"]);
    const late = new Date("2026-10-21T10:00:00+02:00");
    expect(addOhlasky(files, record(datesOf(25, 31)), week("2026-10-25", "2026-10-31"), { now: late }).removed).toEqual(
      [],
    );
    expect(sheets()).toEqual(["2026-10-11", "2026-10-25"]);
  });

  it("replaces the sheet of the same week (a corrected PDF)", () => {
    const fixed = { ...week("2026-10-04", "2026-10-11"), rev: 2 };
    const result = addOhlasky(files, record(datesOf(4, 11)), fixed, { now });
    expect(result.replaced).toBe(true);
    expect(readOhlasky(file).sheets.at(-1)!.rev).toBe(2);
    expect(Object.keys(JSON.parse(raw()).sheets.at(-1)).slice(0, 3)).toEqual(["validFrom", "validTo", "rev"]);
    expect(ohlaskyLines(result, false)[0]).toBe(
      "Replaced the sheet 2026-10-04 – 2026-10-11 with rev 2 in src/content/ohlasky.json",
    );
  });

  it("refuses an overlap, a week before the current sheet, the PDF fields and an unknown aktualita", () => {
    const before = raw();
    expect(() => addOhlasky(files, record(datesOf(10, 17)), week("2026-10-10", "2026-10-17"), { now })).toThrow(
      "starts before 2026-10-04 – 2026-10-11 ends",
    );
    expect(() =>
      addOhlasky(files, record(["2026-09-20", "2026-09-21"]), week("2026-09-20", "2026-09-21"), { now }),
    ).toThrow("before the current sheet (2026-10-04)");
    expect(() =>
      addOhlasky(files, { ...record(datesOf(11, 18)), validFrom: "2026-10-11" }, week("2026-10-11", "2026-10-18"), {
        now,
      }),
    ).toThrow("the script reads validFrom, validTo and rev from the PDF");
    expect(() =>
      addOhlasky(files, record(datesOf(11, 18), "neni-2026"), week("2026-10-11", "2026-10-18"), { now }),
    ).toThrow("no aktualita with the id neni-2026");
    expect(() => addOhlasky(files, record(datesOf(11, 17)), week("2026-10-11", "2026-10-18"), { now })).toThrow(
      "missing 2026-10-18",
    );
    expect(raw()).toBe(before);
  });

  it("refuses a broken ohlasky.json or schedule-exceptions.json, also with check, and leaves it unchanged", () => {
    const add = (check: boolean) =>
      addOhlasky(files, record(datesOf(11, 18)), week("2026-10-11", "2026-10-18"), { now, check });
    writeFileSync(file, '{ "sheets": [');
    for (const check of [true, false]) expect(() => add(check)).toThrow("ohlasky.json is not valid JSON");
    writeFileSync(file, JSON.stringify({ sheets: [] }));
    const wrongPlace = JSON.stringify({
      exceptions: [{ date: "2026-10-25", services: [{ time: "10:00", place: "Vranov" }] }],
    });
    writeFileSync(laterFile, wrongPlace);
    for (const check of [true, false]) expect(() => add(check)).toThrow("exceptions[0].services[0].place");
    expect(readFileSync(laterFile, "utf8")).toBe(wrongPlace);
  });

  it("keeps the exceptions in a gap between sheets until they are past", () => {
    // 25.–31. 10. leaves a gap after 4.–11. 10.: both entries (18. and 19. 10.) are in it, so they still hold.
    const result = addOhlasky(files, record(datesOf(25, 31)), week("2026-10-25", "2026-10-31"), { now });
    expect(sheets()).toEqual(["2026-10-04", "2026-10-25"]);
    expect(readScheduleExceptions(laterFile).exceptions).toEqual(LATER);
    expect(result).toMatchObject({ coveredExceptions: [], pastExceptions: [], written: [file] });
    // Once 25.–31. 10. is the current sheet, the next sheet removes them as past.
    const later = new Date("2026-10-27T10:00:00+02:00");
    const november = ["2026-10-31", ...Array.from({ length: 7 }, (_, i) => `2026-11-0${i + 1}`)];
    const next = addOhlasky(files, record(november), week("2026-10-31", "2026-11-07"), { now: later });
    expect(readScheduleExceptions(laterFile).exceptions).toEqual([]);
    expect(ohlaskyLines(next, false).slice(-2)).toEqual([
      "Removed the later change on 2026-10-18 from src/content/schedule-exceptions.json (it is past)",
      "Removed the later change on 2026-10-19 from src/content/schedule-exceptions.json (it is past)",
    ]);
  });

  it("only validates with check", () => {
    const before = raw();
    const result = addOhlasky(files, record(datesOf(11, 18)), week("2026-10-11", "2026-10-18"), {
      now,
      check: true,
    });
    expect(result.written).toEqual([]);
    expect(raw()).toBe(before);
    expect(ohlaskyLines(result, true)).toEqual([
      "Would add the sheet 2026-10-11 – 2026-10-18 to src/content/ohlasky.json",
      "Would remove the outdated sheet 2026-09-27 – 2026-10-04",
      "Would remove the later change on 2026-10-18 from src/content/schedule-exceptions.json (a sheet covers it)",
    ]);
  });
});
