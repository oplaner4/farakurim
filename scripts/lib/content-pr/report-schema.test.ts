import { describe, expect, it } from "vitest";
import { issuesOf } from "../test-helpers/reports";
import { ReportError, parseEventsReport, parseFixResult, parseReport, parseSheetReport } from "./report-schema";

const question = { id: "q1", blocking: false, status: "open", where: "week 1", text: "Why?" };
const week = {
  validFrom: "2026-11-09",
  validTo: "2026-11-15",
  outcome: { kind: "created" },
  questions: [],
};
const sheet = { kind: "sheet", weeks: [week], questions: [] };
const events = {
  kind: "events",
  events: [
    {
      outcome: { kind: "created", id: "concert" },
      origin: "From the poster.",
      questions: [],
    },
    { title: "Trip", outcome: { kind: "correction", of: "trip-2026" }, questions: [] },
    { title: "Fair", outcome: { kind: "duplicate", of: "fair-2026", where: 12 }, questions: [] },
  ],
  questions: [],
  droppedAttachments: [],
};

describe("report schema", () => {
  it("parses a sheet report and an events report", () => {
    expect(parseSheetReport(sheet)).toEqual(sheet);
    expect(parseEventsReport(events)).toEqual(events);
    expect(parseReport("sheet", sheet)).toEqual(sheet);
    expect(parseReport("events", events)).toEqual(events);
  });

  it("rejects an unknown field, such as a report from before the schema changed", () => {
    const issues = issuesOf(() => parseSheetReport({ ...sheet, version: 1 }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/^: Unrecognized key/);
    // The content's part of the body is no longer in the report.
    expect(issuesOf(() => parseSheetReport({ ...sheet, weeks: [{ ...week, summary: "s" }] }))[0]).toMatch(
      /^weeks\.0: Unrecognized key/,
    );
    const withVenues = { ...events, events: [{ ...events.events[0], venues: [] }] };
    expect(issuesOf(() => parseEventsReport(withVenues))[0]).toMatch(/^events\.0: Unrecognized key/);
  });

  it("names a created event by its record and a refused one by its own title", () => {
    const [created, correction] = events.events;
    const issuesOfEvent = (event: object) => issuesOf(() => parseEventsReport({ ...events, events: [event] }));
    expect(issuesOfEvent({ ...created, title: "Concert" })).toEqual([
      "events.0.title: a created event takes its title from its record",
    ]);
    const { title: _, ...untitled } = correction;
    expect(issuesOfEvent(untitled)).toEqual(["events.0.title: a refused event needs its title"]);
    expect(issuesOfEvent({ ...correction, origin: "x" })).toEqual([
      "events.0.origin: only a created event has an origin",
    ]);
    expect(issuesOfEvent({ ...created, outcome: { kind: "created", id: "Koncert 2026" } })[0]).toMatch(
      /^events\.0\.outcome\.id:/,
    );
    expect(
      issuesOfEvent({ ...correction, outcome: { kind: "duplicate", of: "fair-2026", where: "PR 12" } }),
    ).toHaveLength(1);
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
