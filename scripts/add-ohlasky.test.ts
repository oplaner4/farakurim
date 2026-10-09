import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ServiceSheet, SheetDay } from "@/content/types/services";
import { addOhlasky, ohlaskyLines, setSheets, sheetName, sheetSource, type SheetWeek } from "./add-ohlasky";

const INDEX = `import "server-only";
import type { ScheduleException, ServiceSheet } from "@/content/types/services";

export const serviceSheets: ServiceSheet[] = [];

export const laterExceptions: ScheduleException[] = [
  { date: "2026-10-18", services: [], reason: "pouť" },
  { date: "2026-11-01", services: [], reason: "dušičky" },
];
`;

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

describe("sheetName and sheetSource", () => {
  it("names the export after validFrom and writes a server-only typed module", () => {
    expect(sheetName("2026-10-04")).toBe("sheet20261004");
    const sheet: ServiceSheet = { ...week("2026-10-04", "2026-10-05"), ...record(datesOf(4, 5)) } as ServiceSheet;
    const source = sheetSource(sheet);
    expect(source).toMatch(
      /^import "server-only";\nimport type \{ ServiceSheet \} from "@\/content\/types\/services";/,
    );
    expect(source).toContain("export const sheet20261004: ServiceSheet = {");
    expect(source).toContain('validTo: "2026-10-05"');
  });
});

describe("setSheets", () => {
  it("sets the imports and the array, replacing the old ones", () => {
    const one = setSheets(INDEX, ["2026-10-04"]);
    expect(one).toContain('import { sheet20261004 } from "./2026-10-04";');
    expect(one).toContain("export const serviceSheets: ServiceSheet[] = [sheet20261004];");
    const two = setSheets(one, ["2026-10-11", "2026-10-18"]);
    expect(two).not.toContain("sheet20261004");
    expect(two).toContain(
      'import { sheet20261011 } from "./2026-10-11";\nimport { sheet20261018 } from "./2026-10-18";',
    );
    expect(two).toContain("[sheet20261011, sheet20261018];");
    expect(two).toContain('{ date: "2026-10-18", services: [], reason: "pouť" }');
  });

  it("refuses an index of another shape", () => {
    expect(() => setSheets("export const x = 1;", ["2026-10-04"])).toThrow("unexpected shape");
  });
});

describe("addOhlasky on a temp ohlasky/ and news/", () => {
  let dir: string;
  let ohlasky: string;
  let news: string;
  const now = new Date("2026-10-09T10:00:00+02:00");
  const files = () => readdirSync(ohlasky).sort();

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "add-ohlasky-"));
    ohlasky = join(dir, "ohlasky");
    news = join(dir, "news");
    mkdirSync(ohlasky);
    mkdirSync(news);
    writeFileSync(join(news, "10.ts"), '  {\n    id: "farni-den-2026",\n  },\n');
    writeFileSync(join(ohlasky, "index.ts"), INDEX);
    // An older sheet (27. 9.–4. 10.) and the current one (4.–11. 10.), written as the command writes them on
    // 30. 9., when both are still kept.
    const setup = { now: new Date("2026-09-30T10:00:00+02:00") };
    const september = ["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", ...datesOf(1, 4)];
    addOhlasky(ohlasky, news, record(september), week("2026-09-27", "2026-10-04"), setup);
    addOhlasky(ohlasky, news, record(datesOf(4, 11)), week("2026-10-04", "2026-10-11"), setup);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("adds the next week in advance and prunes the sheets before the current one", () => {
    const result = addOhlasky(
      ohlasky,
      news,
      record(datesOf(11, 18), "farni-den-2026"),
      week("2026-10-11", "2026-10-18"),
      { now },
    );
    expect(result).toMatchObject({
      target: "2026-10-11.ts",
      replaced: false,
      removed: ["2026-09-27.ts"],
      covered: ["2026-10-18"],
    });
    expect(files()).toEqual(["2026-10-04.ts", "2026-10-11.ts", "index.ts"]);
    const index = readFileSync(join(ohlasky, "index.ts"), "utf8");
    expect(index).toContain("[sheet20261004, sheet20261011];");
    expect(result.written).toEqual([join(ohlasky, "2026-10-11.ts"), join(ohlasky, "index.ts")]);
    expect(ohlaskyLines(result, false)).toEqual([
      "Added the sheet 2026-10-11 – 2026-10-18 to src/content/ohlasky/2026-10-11.ts",
      "Removed the outdated sheet src/content/ohlasky/2026-09-27.ts",
      "laterExceptions on 2026-10-18 is now covered by the sheet: remove it from src/content/ohlasky/index.ts",
    ]);
  });

  it("keeps a stale current sheet when the next one comes late", () => {
    const monday = new Date("2026-10-12T10:00:00+02:00");
    addOhlasky(ohlasky, news, record(datesOf(11, 18)), week("2026-10-11", "2026-10-18"), { now: monday });
    expect(files()).toEqual(["2026-10-11.ts", "index.ts"]);
    const late = new Date("2026-10-21T10:00:00+02:00");
    expect(
      addOhlasky(ohlasky, news, record(datesOf(25, 31)), week("2026-10-25", "2026-10-31"), { now: late }).removed,
    ).toEqual([]);
    expect(files()).toEqual(["2026-10-11.ts", "2026-10-25.ts", "index.ts"]);
  });

  it("replaces the sheet of the same week (a corrected PDF)", () => {
    const fixed = {
      ...week("2026-10-04", "2026-10-11"),
      pdfUrl: "/uploads/porady_bohosluzeb/2026-10-04-porad-bohosluzeb-2.pdf",
    };
    const result = addOhlasky(ohlasky, news, record(datesOf(4, 11)), fixed, { now });
    expect(result.replaced).toBe(true);
    expect(readFileSync(join(ohlasky, "2026-10-04.ts"), "utf8")).toContain("porad-bohosluzeb-2.pdf");
    expect(ohlaskyLines(result, false)[0]).toBe(
      "Replaced the sheet 2026-10-04 – 2026-10-11 in src/content/ohlasky/2026-10-04.ts",
    );
  });

  it("refuses an overlap, a week before the current sheet, the PDF fields and an unknown aktualita", () => {
    expect(() => addOhlasky(ohlasky, news, record(datesOf(10, 17)), week("2026-10-10", "2026-10-17"), { now })).toThrow(
      "starts before 2026-10-04 – 2026-10-11 ends",
    );
    expect(() =>
      addOhlasky(ohlasky, news, record(["2026-09-20", "2026-09-21"]), week("2026-09-20", "2026-09-21"), { now }),
    ).toThrow("before the current sheet (2026-10-04)");
    expect(() =>
      addOhlasky(
        ohlasky,
        news,
        { ...record(datesOf(11, 18)), validFrom: "2026-10-11" },
        week("2026-10-11", "2026-10-18"),
        { now },
      ),
    ).toThrow("the script reads pdfUrl, validFrom and validTo from the PDF");
    expect(() =>
      addOhlasky(ohlasky, news, record(datesOf(11, 18), "neni-2026"), week("2026-10-11", "2026-10-18"), { now }),
    ).toThrow("no aktualita with the id neni-2026");
    expect(() => addOhlasky(ohlasky, news, record(datesOf(11, 17)), week("2026-10-11", "2026-10-18"), { now })).toThrow(
      "missing 2026-10-18",
    );
    expect(files()).toEqual(["2026-09-27.ts", "2026-10-04.ts", "index.ts"]);
  });

  it("names a covered exception in the one-line and the expanded form", () => {
    const next = () =>
      addOhlasky(ohlasky, news, record(datesOf(11, 18)), week("2026-10-11", "2026-10-18"), { now, check: true });
    const inline = INDEX.replace(
      /laterExceptions: ScheduleException\[\] = \[[^]*\];/,
      () => 'laterExceptions: ScheduleException[] = [{ date: "2026-10-18", reason: "x", services: [] }];',
    );
    writeFileSync(join(ohlasky, "index.ts"), inline);
    expect(next().covered).toEqual(["2026-10-18"]);
    const expanded = INDEX.replace(
      /laterExceptions: ScheduleException\[\] = \[[^]*\];/,
      () =>
        'laterExceptions: ScheduleException[] = [\n  {\n    date: "2026-10-18",\n    reason: "x",\n    services: [],\n  },\n];',
    );
    writeFileSync(join(ohlasky, "index.ts"), expanded);
    expect(next().covered).toEqual(["2026-10-18"]);
  });

  it("refuses an index of another shape, also with check, and leaves the files unchanged", () => {
    writeFileSync(join(ohlasky, "index.ts"), "export const x = 1;\n");
    for (const check of [true, false]) {
      expect(() =>
        addOhlasky(ohlasky, news, record(datesOf(11, 18)), week("2026-10-11", "2026-10-18"), { now, check }),
      ).toThrow("unexpected shape");
    }
    expect(files()).toEqual(["2026-09-27.ts", "2026-10-04.ts", "index.ts"]);
    expect(readFileSync(join(ohlasky, "index.ts"), "utf8")).toBe("export const x = 1;\n");
  });

  it("only validates with check", () => {
    const result = addOhlasky(ohlasky, news, record(datesOf(11, 18)), week("2026-10-11", "2026-10-18"), {
      now,
      check: true,
    });
    expect(result.written).toEqual([]);
    expect(existsSync(join(ohlasky, "2026-10-11.ts"))).toBe(false);
    expect(ohlaskyLines(result, true)[0]).toBe(
      "Would add the sheet 2026-10-11 – 2026-10-18 to src/content/ohlasky/2026-10-11.ts",
    );
  });
});
