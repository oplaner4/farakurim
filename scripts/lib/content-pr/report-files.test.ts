import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { freshTempDir } from "../test-helpers/files";
import { fixResult, reportQuestion, reportWeek, sheetReport, sheetRunReport } from "../test-helpers/reports";
import { RESEND, readFix, readReport, summaryReport } from "./report-files";

const WEEK_12 = reportWeek("2026-10-12", "2026-10-18", { kind: "created" });
const WEEK_19 = reportWeek("2026-10-19", "2026-10-25", { kind: "created" });

describe("report files", () => {
  const dir = freshTempDir("content-pr-report-files");

  const json = (file: string, value: unknown) => {
    writeFileSync(join(dir(), file), JSON.stringify(value));
    return join(dir(), file);
  };

  describe("readReport", () => {
    it("reads a full report as written", () => {
      const report = json("report.json", sheetReport([WEEK_19]));
      expect(readReport({ kind: "sheet", report, run: false })).toEqual(sheetReport([WEEK_19]));
    });

    it("merges a sheet run into the previous report, or into none on the PR's first run", () => {
      const previous = json("previous.json", sheetReport([WEEK_12], [reportQuestion("q1", true)]));
      const update = { questionUpdates: [{ id: "q1", status: "resolved" }] };
      const report = json("run.json", sheetRunReport(WEEK_19, update));
      expect(readReport({ kind: "sheet", report, run: true, previous })).toEqual(
        sheetReport([WEEK_12, WEEK_19], [reportQuestion("q1", true, "resolved")]),
      );
      const first = json("first.json", sheetRunReport(WEEK_19));
      expect(readReport({ kind: "sheet", report: first, run: true })).toEqual(sheetReport([WEEK_19]));
    });

    it("fails with the schema's issue, a merge's error or the other kind", () => {
      const previous = json("previous.json", sheetReport([WEEK_12]));
      const unknown = json(
        "unknown.json",
        sheetRunReport(WEEK_19, { questionUpdates: [{ id: "q7", status: "resolved" }] }),
      );
      expect(() => readReport({ kind: "sheet", report: unknown, run: true, previous })).toThrow(
        "question q7 to update is not in the report",
      );
      const broken = json("broken.json", { ...sheetRunReport(WEEK_19), week: { ...WEEK_19, validTo: "2026-13-01" } });
      expect(() => readReport({ kind: "sheet", report: broken, run: true })).toThrow("week.validTo:");
      const sheet = json("sheet.json", sheetReport([WEEK_19]));
      expect(() => readReport({ kind: "events", report: sheet, run: false })).toThrow("kind:");
    });

    it("cannot continue a PR whose previous report is missing, unreadable or of another version", () => {
      const report = json("run.json", sheetRunReport(WEEK_19));
      const other = json("other.json", { ...sheetReport([WEEK_12]), version: 2 });
      const garbled = join(dir(), "garbled.json");
      writeFileSync(garbled, "{");
      for (const previous of [join(dir(), "none.json"), garbled, other]) {
        expect(() => readReport({ kind: "sheet", report, run: true, previous })).toThrow(RESEND);
      }
      expect(RESEND).toBe(
        "The PR's report is missing or from another version: close the PR and send the sheet or event again.",
      );
    });
  });

  describe("readFix", () => {
    it("reads a fix result, none without a file, and refuses a reply's marker", () => {
      expect(readFix(json("fix.json", fixResult("changed")))).toEqual(fixResult("changed"));
      expect(readFix(undefined)).toBeUndefined();
      const marked = json("marked.json", { ...fixResult("unchanged"), reply: "Done. <!-- content-fix: 12 -->" });
      expect(() => readFix(marked)).toThrow("reply");
    });
  });

  describe("summaryReport", () => {
    it("reads a full report, else a sheet run's on its own", () => {
      expect(summaryReport("sheet", json("report.json", sheetReport([WEEK_19])))).toEqual(sheetReport([WEEK_19]));
      expect(summaryReport("sheet", json("run.json", sheetRunReport(WEEK_19)))).toEqual(sheetReport([WEEK_19]));
    });

    it("gives none for a missing or invalid file, and for an events file that is no full report", () => {
      expect(summaryReport("sheet", join(dir(), "none.json"))).toBeUndefined();
      expect(summaryReport("sheet", json("other.json", { version: 2 }))).toBeUndefined();
      expect(summaryReport("events", json("run.json", sheetRunReport(WEEK_19)))).toBeUndefined();
    });
  });
});
