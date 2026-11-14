import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { RegularService, ScheduleException } from "@/content/types/services";
import { addException, draftException, draftLine, exceptionLine, parseCommand } from "./add-exception";
import { readScheduleExceptions } from "./add-service-sheet";
import { freshTempDir } from "../test-helpers/files";

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

/** Sundays 8:00 in Kuřim and 11:00 in Moravské Knínice, a first-Friday-only mass. */
const REGULAR: RegularService[] = [
  { weekday: 0, time: "11:00", place: "moravske-kninice" },
  { weekday: 0, time: "8:00", place: "kurim" },
  { weekday: 5, time: "18:15", place: "kurim", rule: "first-in-month" },
];

/** The service sheet list (with SHEET) and the later changes (with PILGRIMAGE), written in `dir`. */
function contentFiles(dir: string) {
  const files = {
    serviceSheetsFile: join(dir, "service-sheets.json"),
    exceptionsFile: join(dir, "schedule-exceptions.json"),
  };
  writeFileSync(files.serviceSheetsFile, JSON.stringify({ sheets: [SHEET] }));
  writeFileSync(files.exceptionsFile, JSON.stringify({ exceptions: [PILGRIMAGE] }));
  return files;
}

describe("addException on a temp service-sheets.json and schedule-exceptions.json", () => {
  const dir = freshTempDir("add-exception");
  let files: { serviceSheetsFile: string; exceptionsFile: string };
  const now = new Date("2026-10-09T10:00:00+02:00");
  const dates = () => readScheduleExceptions(files.exceptionsFile).exceptions.map((x) => x.date);
  const raw = () => readFileSync(files.exceptionsFile, "utf8");

  beforeEach(() => {
    files = contentFiles(dir());
  });

  it("adds a change in date order", () => {
    const add = { date: "2026-10-18", services: [{ time: "10:00", place: "kurim", note: "hody" }] };
    const result = addException(files, { add }, { now });
    expect(dates()).toEqual(["2026-10-18", "2026-10-25"]);
    expect(result.written).toEqual([files.exceptionsFile]);
    expect(exceptionLine(result, false)).toBe("Added the change on 2026-10-18: 1 service: 10:00 kurim");
  });

  it("replaces the change of the same date", () => {
    const add = { date: "2026-10-25", services: [{ time: "18:00", place: "jinacovice" }], reason: "přesun" };
    const result = addException(files, { add }, { now });
    expect(readScheduleExceptions(files.exceptionsFile).exceptions).toEqual([add]);
    expect(exceptionLine(result, false)).toBe(
      "Replaced the change on 2026-10-25 (přesun): 1 service: 18:00 jinacovice",
    );
  });

  it("removes a change and names the regular services the day gets back", () => {
    const result = addException(files, { remove: "2026-10-25" }, { now, regular: REGULAR });
    expect(dates()).toEqual([]);
    expect(exceptionLine(result, false)).toBe(
      "Removed the change on 2026-10-25; the day gets back its regular 2 services: 8:00 kurim, 11:00 moravske-kninice",
    );
  });

  it("refuses a date a sheet covers, a past date, a bad record and a removal of no change", () => {
    const before = raw();
    expect(() => addException(files, { add: { date: "2026-10-11", services: [] } }, { now })).toThrow(
      "the sheet 2026-10-04 – 2026-10-11 covers 2026-10-11\nnext: correct the sheet 2026-10-04 – 2026-10-11",
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
    expect(exceptionLine(result, true)).toBe("Would add the change on 2026-10-18: no services");
  });
});

describe("draftException on a temp service-sheets.json and schedule-exceptions.json", () => {
  const dir = freshTempDir("draft-exception");
  let files: { serviceSheetsFile: string; exceptionsFile: string };
  let out: string;
  const now = new Date("2026-10-09T10:00:00+02:00");
  const written = () => JSON.parse(readFileSync(out, "utf8")) as unknown;

  beforeEach(() => {
    files = contentFiles(dir());
    out = join(dir(), "exception.json");
  });

  it("drafts a day with no change from its regular services, by time and with their rules", () => {
    const result = draftException(files, { date: "2026-10-18", out }, { now, regular: REGULAR });
    const draft = {
      date: "2026-10-18",
      services: [
        { time: "8:00", place: "kurim" },
        { time: "11:00", place: "moravske-kninice" },
      ],
    };
    expect(written()).toEqual(draft);
    expect(draftLine(result)).toBe(
      `Wrote the draft record of 2026-10-18 (the regular schedule) to ${out}: 2 services: 8:00 kurim, 11:00 moravske-kninice`,
    );
    const friday = draftException(files, { date: "2026-10-16", out }, { now, regular: REGULAR });
    expect(friday.draft.services).toEqual([]);
  });

  it("drafts a day with a change from that change", () => {
    const result = draftException(files, { date: "2026-10-25", out }, { now, regular: REGULAR });
    expect(written()).toEqual(PILGRIMAGE);
    expect(draftLine(result)).toBe(`Wrote the draft record of 2026-10-25 (its change) to ${out}: no services`);
  });

  it("refuses a date a sheet covers and a past date, writing nothing", () => {
    expect(() => draftException(files, { date: "2026-10-11", out }, { now })).toThrow(
      "the sheet 2026-10-04 – 2026-10-11 covers 2026-10-11\nnext: correct the sheet 2026-10-04 – 2026-10-11",
    );
    const late = new Date("2026-10-20T10:00:00+02:00");
    expect(() => draftException(files, { date: "2026-10-19", out }, { now: late })).toThrow("2026-10-19 is past");
    expect(existsSync(out)).toBe(false);
  });
});

describe("parseCommand", () => {
  const argsDir = freshTempDir("add-exception-args");

  it("reads a record file, or --remove with a date, and --check", () => {
    const record = join(argsDir(), "record.json");
    writeFileSync(record, JSON.stringify(PILGRIMAGE));
    expect(parseCommand([record, "--check"])).toEqual({ change: { add: PILGRIMAGE }, check: true });
    expect(parseCommand(["--remove", "2026-10-25"])).toEqual({ change: { remove: "2026-10-25" }, check: false });
  });

  it("reads --draft with a date and --out", () => {
    expect(parseCommand(["--draft", "2026-10-25", "--out", "x.json"])).toEqual({ draft: "2026-10-25", out: "x.json" });
  });

  it("refuses wrong arguments with the usage", () => {
    for (const args of [
      [],
      ["a.json", "b.json"],
      ["--remove", "25. 10."],
      ["--remove", "2026-02-30"],
      ["a.json", "--remove", "2026-10-25"],
      ["--chek"],
      ["--draft", "2026-10-25"],
      ["--out", "x.json"],
      ["--draft", "25. 10.", "--out", "x.json"],
      ["--draft", "2026-10-25", "--out", "x.json", "--check"],
      ["--draft", "2026-10-25", "--out", "x.json", "--remove", "2026-10-25"],
      ["a.json", "--draft", "2026-10-25", "--out", "x.json"],
    ]) {
      expect(() => parseCommand(args)).toThrow("Usage: pnpm add-exception");
    }
  });
});
