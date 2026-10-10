import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ScheduleException } from "@/content/types/services";
import { addException, exceptionLine, parseCommand } from "./add-exception";
import { readScheduleExceptions } from "./add-ohlasky";

/** A sheet for 4.–11. 10. 2026, every day with one mass. */
const SHEET = {
  validFrom: "2026-10-04",
  validTo: "2026-10-11",
  days: Array.from({ length: 8 }, (_, i) => ({
    date: `2026-10-${String(4 + i).padStart(2, "0")}`,
    rows: [{ time: "8:00", place: "kurim", title: "Mše sv.", mass: true }],
  })),
  announcements: [],
};

const PILGRIMAGE: ScheduleException = { date: "2026-10-25", services: [], reason: "pouť" };

describe("addException on a temp ohlasky.json and schedule-exceptions.json", () => {
  let dir: string;
  let files: { ohlaskyFile: string; exceptionsFile: string };
  const now = new Date("2026-10-09T10:00:00+02:00");
  const dates = () => readScheduleExceptions(files.exceptionsFile).exceptions.map((x) => x.date);
  const raw = () => readFileSync(files.exceptionsFile, "utf8");

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "add-exception-"));
    files = { ohlaskyFile: join(dir, "ohlasky.json"), exceptionsFile: join(dir, "schedule-exceptions.json") };
    writeFileSync(files.ohlaskyFile, JSON.stringify({ sheets: [SHEET] }));
    writeFileSync(files.exceptionsFile, JSON.stringify({ exceptions: [PILGRIMAGE] }));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("adds a change in date order", () => {
    const add = { date: "2026-10-18", services: [{ time: "10:00", place: "kurim", note: "hody" }] };
    const result = addException(files, { add }, { now });
    expect(dates()).toEqual(["2026-10-18", "2026-10-25"]);
    expect(result.written).toEqual([files.exceptionsFile]);
    expect(exceptionLine(result, false)).toBe(
      "Added the change on 2026-10-18 to src/content/schedule-exceptions.json: 1 service: 10:00 kurim",
    );
  });

  it("replaces the change of the same date", () => {
    const add = { date: "2026-10-25", services: [{ time: "18:00", place: "jinacovice" }], reason: "přesun" };
    const result = addException(files, { add }, { now });
    expect(readScheduleExceptions(files.exceptionsFile).exceptions).toEqual([add]);
    expect(exceptionLine(result, false)).toBe(
      "Replaced the change on 2026-10-25 (přesun) in src/content/schedule-exceptions.json: 1 service: 18:00 jinacovice",
    );
  });

  it("removes a change", () => {
    const result = addException(files, { remove: "2026-10-25" }, { now });
    expect(dates()).toEqual([]);
    expect(exceptionLine(result, false)).toBe(
      "Removed the change on 2026-10-25 from src/content/schedule-exceptions.json",
    );
  });

  it("refuses a date a sheet covers, a past date, a bad record and a removal of no change", () => {
    const before = raw();
    expect(() => addException(files, { add: { date: "2026-10-11", services: [] } }, { now })).toThrow(
      "the sheet 2026-10-04 – 2026-10-11 covers 2026-10-11",
    );
    const late = new Date("2026-10-20T10:00:00+02:00");
    expect(() => addException(files, { add: { date: "2026-10-19", services: [] } }, { now: late })).toThrow(
      "2026-10-19 is past",
    );
    expect(() =>
      addException(files, { add: { date: "2026-10-18", services: [{ time: "10:00", place: "Vranov" }] } }, { now }),
    ).toThrow("services[0].place");
    expect(() => addException(files, { remove: "2026-10-18" }, { now })).toThrow("there is no change on 2026-10-18");
    expect(raw()).toBe(before);
  });

  it("only validates with check", () => {
    const before = raw();
    const result = addException(files, { add: { date: "2026-10-18", services: [] } }, { now, check: true });
    expect(result.written).toEqual([]);
    expect(raw()).toBe(before);
    expect(exceptionLine(result, true)).toBe(
      "Would add the change on 2026-10-18 to src/content/schedule-exceptions.json: no services",
    );
  });
});

describe("parseCommand", () => {
  it("reads a record file, or --remove with a date, and --check", () => {
    const dir = mkdtempSync(join(tmpdir(), "add-exception-args-"));
    const record = join(dir, "record.json");
    writeFileSync(record, JSON.stringify(PILGRIMAGE));
    expect(parseCommand([record, "--check"])).toEqual({ change: { add: PILGRIMAGE }, check: true });
    expect(parseCommand(["--remove", "2026-10-25"])).toEqual({ change: { remove: "2026-10-25" }, check: false });
    rmSync(dir, { recursive: true, force: true });
  });

  it("refuses wrong arguments with the usage", () => {
    for (const args of [
      [],
      ["a.json", "b.json"],
      ["--remove", "25. 10."],
      ["a.json", "--remove", "2026-10-25"],
      ["--chek"],
    ]) {
      expect(() => parseCommand(args)).toThrow("Usage: pnpm add-exception");
    }
  });
});
