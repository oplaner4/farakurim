import { describe, expect, it } from "vitest";
import {
  issuesOf,
  newQuestion,
  reportQuestion,
  reportWeek,
  sheetReport,
  sheetRunReport,
} from "../test-helpers/reports";
import { completeAgentReport } from "./agent-report";
import { parseAgentReport } from "./agent-report-schema";
import type { ContentChanges } from "./changes";

const WEEK_12 = reportWeek("2026-10-12", "2026-10-18", { kind: "created" });
const WEEK_19 = reportWeek("2026-10-19", "2026-10-25", { kind: "created" });
const DATES_19 = { validFrom: "2026-10-19", validTo: "2026-10-25" };
const REFUSED_19 = reportWeek("2026-10-19", "2026-10-25", { kind: "refused", reason: "overlaps" });

const sheetChanges = (added: (typeof DATES_19)[], changed: (typeof DATES_19)[] = []): ContentChanges => ({
  kind: "sheet",
  added,
  changed,
});

describe("the agent's events report", () => {
  const events = (value: object) => completeAgentReport(parseAgentReport("events", value));
  const report = (fields: object) => ({ events: [], questions: [], droppedAttachments: [], ...fields });

  it("makes an event with an id created, and numbers the questions from q1, the events' first", () => {
    const asking = newQuestion(reportQuestion("q9", true));
    expect(
      events(
        report({
          events: [
            { id: "koncert-2026", origin: "From the poster.", questions: [asking] },
            { title: "Zájezd", outcome: { kind: "correction", of: "zajezd-2026" }, questions: [asking] },
          ],
          questions: [asking],
          droppedAttachments: ["attachment 2, a logo"],
        }),
      ),
    ).toEqual({
      kind: "events",
      events: [
        {
          outcome: { kind: "created", id: "koncert-2026" },
          origin: "From the poster.",
          questions: [reportQuestion("q1", true)],
        },
        {
          title: "Zájezd",
          outcome: { kind: "correction", of: "zajezd-2026" },
          questions: [reportQuestion("q2", true)],
        },
      ],
      questions: [reportQuestion("q3", true)],
      droppedAttachments: ["attachment 2, a logo"],
    });
  });
});

describe("the agent's sheet run report", () => {
  const sheet = (value: object, changes?: ContentChanges, previous?: ReturnType<typeof sheetReport>) =>
    completeAgentReport(parseAgentReport("sheet", value), changes, previous as never);

  it("takes a published week's dates and outcome from the change: created when it adds the week, else corrected", () => {
    expect(sheet(sheetRunReport(WEEK_19), sheetChanges([DATES_19]))).toEqual(sheetReport([WEEK_19]));
    expect(sheet(sheetRunReport(WEEK_19), sheetChanges([], [DATES_19]))).toEqual(
      sheetReport([reportWeek("2026-10-19", "2026-10-25", { kind: "corrected" })]),
    );
  });

  it("keeps a week that is not published as the agent gives it", () => {
    expect(sheet(sheetRunReport(REFUSED_19), sheetChanges([]))).toEqual(sheetReport([REFUSED_19]));
  });

  it("numbers new questions after the highest id of the previous report and the earlier ones written again", () => {
    const previous = sheetReport(
      [WEEK_12, reportWeek("2026-10-19", "2026-10-25", { kind: "created" }, [reportQuestion("q4", true)])],
      [reportQuestion("q2", false)],
    );
    const again = { ...newQuestion(reportQuestion("q4", true)), id: "q4", status: "resolved" };
    const run = {
      week: { questions: [again, newQuestion(reportQuestion("q0", true))] },
      questions: [newQuestion(reportQuestion("q0", false))],
      questionUpdates: [],
    };
    expect(sheet(run, sheetChanges([], [DATES_19]), previous)).toEqual(
      sheetReport(
        [
          WEEK_12,
          reportWeek("2026-10-19", "2026-10-25", { kind: "corrected" }, [
            reportQuestion("q4", true, "resolved"),
            reportQuestion("q5", true),
          ]),
        ],
        [reportQuestion("q2", false), reportQuestion("q6", false)],
      ),
    );
  });

  it("refuses an id that is no earlier question of this week", () => {
    const previous = sheetReport([WEEK_12], [reportQuestion("q1", false)]);
    const borrowed = { ...newQuestion(reportQuestion("q1", true)), id: "q1" };
    const run = { week: { questions: [borrowed] }, questions: [], questionUpdates: [] };
    expect(issuesOf(() => sheet(run, sheetChanges([DATES_19]), previous))).toEqual([
      "week.questions.0.id: q1 is no earlier question of this week: leave out a new question's id",
    ]);
  });

  it("refuses a week the change does not fit", () => {
    expect(issuesOf(() => sheet(sheetRunReport(REFUSED_19), sheetChanges([DATES_19])))).toEqual([
      "week.outcome: the change holds the week 19.–25. 10. 2026, so it is published: leave out the outcome and dates",
    ]);
    const published = sheetRunReport(WEEK_19);
    const holds = (what: string) =>
      `week: a published week takes its dates from the change, which holds ${what} (a week not published needs its outcome)`;
    expect(issuesOf(() => sheet(published, sheetChanges([])))).toEqual([holds("no week")]);
    expect(issuesOf(() => sheet(published))).toEqual([holds("no week")]);
    const two = sheetChanges([{ validFrom: "2026-10-12", validTo: "2026-10-18" }, DATES_19]);
    expect(issuesOf(() => sheet(published, two))).toEqual([holds("the weeks 12.–18. 10. and 19.–25. 10. 2026")]);
  });
});
