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

  it("takes a week without an outcome, and with dates for when the stage run read none", () => {
    const week = run({ senderNote: ["The time agrees."], questions: [newQuestion(reportQuestion("q1", true))] });
    expect(parseAgentReport("sheet", week)).toEqual({ kind: "sheet", run: week });
    const dated = run({ ...DATES_19, questions: [] });
    expect(parseAgentReport("sheet", dated)).toEqual({ kind: "sheet", run: dated });
  });

  it("refuses an outcome, one date without the other and dates in the wrong order", () => {
    expect(sheetIssues(run({ outcome: { kind: "refused", reason: "overlaps" }, questions: [] }))).toEqual([
      "week.outcome: set by the script from the stage run: leave it out",
    ]);
    expect(sheetIssues(run({ validFrom: DATES_19.validFrom, questions: [] }))).toEqual([
      "week.validTo: validFrom and validTo go together",
    ]);
    expect(sheetIssues(run({ validFrom: DATES_19.validTo, validTo: DATES_19.validFrom, questions: [] }))).toEqual([
      "week.validTo: validFrom is after validTo",
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
