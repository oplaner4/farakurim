import { describe, expect, it } from "vitest";
import {
  ReportError,
  parseEventsReport,
  parseFixResult,
  parseReport,
  parseSheetReport,
  parseSheetRunReport,
} from "./report-schema";

const question = { id: "q1", blocking: false, status: "open", where: "week 1", text: "Why?" };
const week = {
  validFrom: "2026-11-09",
  validTo: "2026-11-15",
  outcome: { kind: "created" },
  summary: "Created.",
  questions: [],
};
const sheet = { version: 1, kind: "sheet", weeks: [week], questions: [] };
const events = {
  version: 1,
  kind: "events",
  events: [
    {
      title: "Concert",
      outcome: { kind: "created", id: "concert" },
      venues: [{ kind: "alias", id: "kostel", text: "Kostel" }],
      questions: [],
    },
  ],
  questions: [],
  droppedAttachments: [],
};

function issuesOf(fn: () => unknown): string[] {
  try {
    fn();
  } catch (error) {
    if (error instanceof ReportError) return error.issues;
    throw error;
  }
  throw new Error("did not throw");
}

describe("report schema", () => {
  it("parses a sheet report and an events report", () => {
    expect(parseSheetReport(sheet)).toEqual(sheet);
    expect(parseEventsReport(events)).toEqual(events);
    expect(parseReport("sheet", sheet)).toEqual(sheet);
    expect(parseReport("events", events)).toEqual(events);
  });

  it("rejects another version", () => {
    const issues = issuesOf(() => parseSheetReport({ ...sheet, version: 2 }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/^version:/);
  });

  it("names the path of each issue", () => {
    const issues = issuesOf(() => parseSheetReport({ ...sheet, weeks: [{ ...week, validTo: "2026-13-01" }] }));
    expect(issues.some((issue) => issue.startsWith("weeks.0.validTo:"))).toBe(true);
  });

  it("rejects a backwards week, a repeated week and a repeated question id", () => {
    const backwards = issuesOf(() => parseSheetReport({ ...sheet, weeks: [{ ...week, validFrom: "2026-11-16" }] }));
    expect(backwards).toHaveLength(1);
    const repeated = issuesOf(() => parseSheetReport({ ...sheet, weeks: [week, week] }));
    expect(repeated).toHaveLength(1);
    const ids = issuesOf(() =>
      parseSheetReport({
        ...sheet,
        weeks: [{ ...week, questions: [question] }],
        questions: [question],
      }),
    );
    expect(ids).toHaveLength(1);
  });

  it("rejects unknown keys", () => {
    const issues = issuesOf(() => parseSheetReport({ ...sheet, weeks: [{ ...week, Outcome: "created" }] }));
    expect(issues.join("\n")).toContain("Outcome");
  });

  it("parses a run report with question updates", () => {
    const run = {
      version: 1,
      kind: "sheet",
      week,
      questions: [question],
      questionUpdates: [{ id: "q2", status: "resolved", answer: "Yes" }],
    };
    expect(parseSheetRunReport(run)).toEqual(run);
    const issues = issuesOf(() => parseSheetRunReport({ ...run, questionUpdates: [{ id: "q2", status: "done" }] }));
    expect(issues[0]).toMatch(/^questionUpdates\.0\.status:/);
  });

  it("parses a fix result", () => {
    const fix = { outcome: "changed", fixMessage: "fix: x", reply: "Done" };
    expect(parseFixResult(fix)).toEqual(fix);
    expect(() => parseFixResult({ ...fix, outcome: "maybe" })).toThrow(ReportError);
  });

  it("rejects a fix reply holding a reply's marker", () => {
    const fix = { outcome: "unchanged", fixMessage: "fix: x", reply: "Done.\n<!-- content-fix: 12 -->" };
    const issues = issuesOf(() => parseFixResult(fix));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/^reply:/);
  });
});
