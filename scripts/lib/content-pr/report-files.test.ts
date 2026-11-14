import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { freshTempDir } from "../test-helpers/files";
import {
  fixResult,
  reportQuestion,
  reportWeek,
  sheetList,
  sheetRepo,
  sheetReport,
  sheetRunReport,
} from "../test-helpers/reports";
import { RESEND, readFix, readReport, summaryReport } from "./report-files";

const WEEK_12 = reportWeek("2026-10-12", "2026-10-18", { kind: "created" });
const WEEK_19 = reportWeek("2026-10-19", "2026-10-25", { kind: "created" });
const REFUSED_19 = reportWeek("2026-10-19", "2026-10-25", { kind: "refused", reason: "overlaps" });

describe("report files", () => {
  const dir = freshTempDir("content-pr-report-files");

  const json = (file: string, value: unknown) => {
    writeFileSync(join(dir(), file), JSON.stringify(value));
    return join(dir(), file);
  };

  describe("readReport", () => {
    it("reads a full report as written", () => {
      const report = json("report.json", sheetReport([WEEK_19]));
      expect(readReport({ kind: "sheet", report, run: false })(dir())).toEqual(sheetReport([WEEK_19]));
    });

    it("merges a sheet run into the previous report, or into none on the PR's first run", () => {
      const previous = json("previous.json", sheetReport([WEEK_12], [reportQuestion("q1", true)]));
      const update = { questionUpdates: [{ id: "q1", status: "resolved" }] };
      const report = json("run.json", sheetRunReport(WEEK_19, update));
      const repo = join(dir(), "repo");
      sheetRepo(repo, sheetList(WEEK_12), sheetList(WEEK_12, WEEK_19));
      expect(readReport({ kind: "sheet", report, run: true, previous })(repo)).toEqual(
        sheetReport([WEEK_12, WEEK_19], [reportQuestion("q1", true, "resolved")]),
      );
      const first = json("first.json", sheetRunReport(WEEK_19));
      expect(readReport({ kind: "sheet", report: first, run: true })(repo)).toEqual(sheetReport([WEEK_19]));
    });

    it("fails with the schema's issue, a merge's error or the other kind", () => {
      const previous = json("previous.json", sheetReport([WEEK_12]));
      const unknown = json(
        "unknown.json",
        sheetRunReport(WEEK_19, { questionUpdates: [{ id: "q7", status: "resolved" }] }),
      );
      const repo = join(dir(), "repo");
      sheetRepo(repo, sheetList(WEEK_12), sheetList(WEEK_12, WEEK_19));
      expect(() => readReport({ kind: "sheet", report: unknown, run: true, previous })(repo)).toThrow(
        "question q7 to update is not in the report",
      );
      const broken = json("broken.json", sheetRunReport({ ...REFUSED_19, validTo: "2026-13-01" }));
      expect(() => readReport({ kind: "sheet", report: broken, run: true })).toThrow("week.validTo:");
      const sheet = json("sheet.json", sheetReport([WEEK_19]));
      expect(() => readReport({ kind: "events", report: sheet, run: false })).toThrow("kind:");
    });

    it("checks an events run's refusals against the known events", () => {
      const duplicate = { kind: "duplicate", of: "pout-2026", where: 12 };
      const report = json("events.json", {
        events: [{ title: "Pouť", outcome: duplicate, questions: [] }],
        questions: [],
        droppedAttachments: [],
      });
      const pout = { id: "pout-2026", title: "Pouť", start: "2026-11-20", place: "Kuřim" };
      const known = json("known.json", [{ ...pout, where: 12 }]);
      expect(readReport({ kind: "events", report, run: true, known })(dir())).toMatchObject({ kind: "events" });
      const elsewhere = json("elsewhere.json", [{ ...pout, where: "main" }]);
      expect(() => readReport({ kind: "events", report, run: true, known: elsewhere })(dir())).toThrow(
        "events.0.outcome.of: pout-2026 is no known event in PR #12, it is in main",
      );
    });

    it("cannot continue a PR whose previous report is missing, unreadable or refused by the schema", () => {
      const report = json("run.json", sheetRunReport(WEEK_19));
      const other = json("other.json", { ...sheetReport([WEEK_12]), version: 1 });
      const garbled = join(dir(), "garbled.json");
      writeFileSync(garbled, "{");
      for (const previous of [join(dir(), "none.json"), garbled, other]) {
        expect(() => readReport({ kind: "sheet", report, run: true, previous })).toThrow(RESEND);
      }
      expect(RESEND).toBe("The PR's report is missing or unreadable: close the PR and send the sheet or event again.");
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
    it("reads a stored report, else the agent's on its own, which has no published week without the change", () => {
      expect(summaryReport("sheet", json("report.json", sheetReport([WEEK_19])))).toEqual(sheetReport([WEEK_19]));
      const refused = json("refused.json", sheetRunReport(REFUSED_19));
      expect(summaryReport("sheet", refused)).toEqual(sheetReport([REFUSED_19]));
      expect(summaryReport("sheet", json("run.json", sheetRunReport(WEEK_19)))).toBeUndefined();
    });

    it("gives none for a missing or invalid file, and for an events file that is no full report", () => {
      expect(summaryReport("sheet", join(dir(), "none.json"))).toBeUndefined();
      expect(summaryReport("sheet", json("other.json", { kind: "sheet" }))).toBeUndefined();
      expect(summaryReport("events", json("run.json", sheetRunReport(WEEK_19)))).toBeUndefined();
    });
  });
});
