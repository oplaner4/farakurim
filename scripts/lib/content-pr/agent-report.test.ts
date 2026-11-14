import { describe, expect, it } from "vitest";
import {
  issuesOf,
  newQuestion,
  reportQuestion,
  reportWeek,
  sheetReport,
  sheetRunReport,
  stageResultOf,
} from "../test-helpers/reports";
import { completeAgentReport, type SheetRunFacts } from "./agent-report";
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
  const STAGED_19 = stageResultOf(WEEK_19);
  const sheet = (value: object, facts: SheetRunFacts) => completeAgentReport(parseAgentReport("sheet", value), facts);

  it("takes a staged week's dates from the stage run, and its outcome from the change: created or corrected", () => {
    const run = sheetRunReport(WEEK_19);
    expect(sheet(run, { result: STAGED_19, changes: sheetChanges([DATES_19]) })).toEqual(sheetReport([WEEK_19]));
    expect(sheet(run, { result: STAGED_19, changes: sheetChanges([], [DATES_19]) })).toEqual(
      sheetReport([reportWeek("2026-10-19", "2026-10-25", { kind: "corrected" })]),
    );
  });

  it("takes a refused week or a document error from the stage run, with the agent's dates only when it read none", () => {
    const run = sheetRunReport(REFUSED_19);
    expect(sheet(run, { result: stageResultOf(REFUSED_19), changes: sheetChanges([]) })).toEqual(
      sheetReport([REFUSED_19]),
    );
    const headless = { result: "document-error", reason: "no heading" } as const;
    const dated = { ...run, week: { ...DATES_19, questions: [] } };
    expect(sheet(dated, { result: headless, changes: sheetChanges([]) })).toEqual(
      sheetReport([reportWeek("2026-10-19", "2026-10-25", { kind: "document-error", reason: "no heading" })]),
    );
    expect(issuesOf(() => sheet(run, { result: headless, changes: sheetChanges([]) }))).toEqual([
      "week.validFrom: the stage run read no week: give its dates",
    ]);
    expect(issuesOf(() => sheet(dated, { result: stageResultOf(REFUSED_19) }))).toEqual([
      "week.validFrom: the stage run gives the week's dates: leave them out",
    ]);
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
    expect(sheet(run, { result: STAGED_19, changes: sheetChanges([], [DATES_19]), previous })).toEqual(
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
    expect(issuesOf(() => sheet(run, { result: STAGED_19, changes: sheetChanges([DATES_19]), previous }))).toEqual([
      "week.questions.0.id: q1 is no earlier question of this week: leave out a new question's id",
    ]);
  });

  it("refuses a stage run the change does not fit, a missing run and a week only drafted", () => {
    const run = sheetRunReport(WEEK_19);
    expect(
      issuesOf(() => sheet(run, { result: stageResultOf(REFUSED_19), changes: sheetChanges([DATES_19]) })),
    ).toEqual(["week: the stage run ended refused, but the change holds 19.–25. 10. 2026"]);
    const staged = (holds: string) =>
      `week: the stage run staged the week 19.–25. 10. 2026, but the change holds ${holds}`;
    expect(issuesOf(() => sheet(run, { result: STAGED_19, changes: sheetChanges([]) }))).toEqual([staged("no week")]);
    expect(issuesOf(() => sheet(run, { result: STAGED_19 }))).toEqual([staged("no week")]);
    const two = sheetChanges([{ validFrom: "2026-10-12", validTo: "2026-10-18" }, DATES_19]);
    expect(issuesOf(() => sheet(run, { result: STAGED_19, changes: two }))).toEqual([
      staged("the weeks 12.–18. 10. and 19.–25. 10. 2026"),
    ]);
    expect(issuesOf(() => sheet(run, { changes: sheetChanges([DATES_19]) }))).toEqual([
      "week: no stage run: draft and stage the week with `pnpm stage sheet`",
    ]);
    const drafted = { ...DATES_19, result: "drafted" } as const;
    expect(issuesOf(() => sheet(run, { result: drafted, changes: sheetChanges([]) }))).toEqual([
      "week: the week was drafted, but not staged with `--record`",
    ]);
  });
});
