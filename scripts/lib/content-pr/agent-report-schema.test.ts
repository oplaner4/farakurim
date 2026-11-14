import { describe, expect, it } from "vitest";
import { issuesOf, newQuestion, reportQuestion } from "../test-helpers/reports";
import { parseAgentReport } from "./agent-report-schema";

const DATES_19 = { validFrom: "2026-10-19", validTo: "2026-10-25" };

describe("the agent's events report", () => {
  const report = (fields: object) => ({ events: [], questions: [], droppedAttachments: [], ...fields });

  it("takes a published event's id and a refused one's title and outcome", () => {
    const value = report({
      events: [
        { id: "koncert-2026", origin: "From the poster.", questions: [newQuestion(reportQuestion("q1", true))] },
        { title: "Zájezd", outcome: { kind: "correction", of: "zajezd-2026" }, questions: [] },
      ],
    });
    expect(parseAgentReport("events", value)).toEqual({ kind: "events", report: value });
  });

  it("refuses what the script sets, and an event that is neither published nor refused", () => {
    const created = { kind: "created", id: "koncert-2026" };
    const refused = { kind: "refused", reason: "past" };
    const value = report({
      events: [
        { outcome: created, questions: [] },
        { id: "koncert-2026", title: "Koncert", questions: [] },
        { questions: [] },
        { id: "x", outcome: refused, origin: "Poster.", questions: [] },
      ],
      questions: [reportQuestion("q1", false)],
    });
    expect(issuesOf(() => parseAgentReport("events", { ...value, kind: "events" }))).toEqual([
      "kind: set by the script: leave it out",
      "events.0.outcome: a published event has no outcome: give only its record's id",
      "events.1.title: a published event takes its title from its record",
      "events.2.id: a published event needs its record's id, one not published its outcome",
      "events.3.id: an event that is not published has no record: leave it out",
      "events.3.title: an event that is not published needs its title",
      "events.3.origin: only a published event has an origin",
      "questions.0.id: set by the script for a new question: leave it out",
      "questions.0.status: a new question is open: leave it out",
    ]);
  });
});

describe("the agent's sheet run report", () => {
  const run = (week: object, fields: object = {}) => ({ week, questions: [], questionUpdates: [], ...fields });
  const sheetIssues = (value: object) => issuesOf(() => parseAgentReport("sheet", value));

  it("takes a published week without dates or outcome, and one not published with both", () => {
    const published = run({ questions: [newQuestion(reportQuestion("q1", true))] });
    expect(parseAgentReport("sheet", published)).toEqual({ kind: "sheet", run: published });
    const refused = run({ ...DATES_19, outcome: { kind: "refused", reason: "overlaps" }, questions: [] });
    expect(parseAgentReport("sheet", refused)).toEqual({ kind: "sheet", run: refused });
  });

  it("refuses an outcome or dates the change gives, and a week not published without its dates", () => {
    expect(sheetIssues(run({ ...DATES_19, outcome: { kind: "created" }, questions: [] }))).toEqual([
      "week.outcome: a published week has no outcome: the script takes it from the change",
    ]);
    expect(sheetIssues(run({ ...DATES_19, questions: [] }))).toEqual([
      "week.validFrom: a published week takes its dates from the change: leave it out",
      "week.validTo: a published week takes its dates from the change: leave it out",
    ]);
    expect(sheetIssues(run({ outcome: { kind: "refused", reason: "overlaps" }, questions: [] }))).toEqual([
      "week.validFrom: a week that is not published needs its dates",
      "week.validTo: a week that is not published needs its dates",
    ]);
  });

  it("refuses a new question's status, the report-level questions' ids and the kind", () => {
    const opened = { ...newQuestion(reportQuestion("q1", true)), status: "open" };
    expect(sheetIssues({ ...run({ questions: [opened] }), kind: "sheet" })).toEqual([
      "kind: set by the script: leave it out",
      "week.questions.0.status: a new question is open: leave it out",
    ]);
    expect(sheetIssues(run({ questions: [] }, { questions: [reportQuestion("q2", false)] }))).toEqual([
      "questions.0.id: set by the script for a new question: leave it out",
      "questions.0.status: a new question is open: leave it out",
    ]);
  });
});
