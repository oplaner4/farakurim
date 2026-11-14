import { describe, expect, it } from "vitest";
import type { Question, SheetReport, SheetRunReport, WeekEntry } from "./report-schema";
import { mergeSheetReport } from "./merge";

function question(id: string, overrides: Partial<Question> = {}): Question {
  return { id, blocking: false, status: "open", where: "Neděle", text: `Otázka ${id}`, ...overrides };
}

function week(validFrom: string, overrides: Partial<WeekEntry> = {}): WeekEntry {
  return {
    validFrom,
    validTo: validFrom,
    outcome: { kind: "created" },
    questions: [],
    ...overrides,
  };
}

function report(weeks: WeekEntry[], questions: Question[] = []): SheetReport {
  return { kind: "sheet", weeks, questions };
}

function run(handled: WeekEntry, overrides: Partial<SheetRunReport> = {}): SheetRunReport {
  return { kind: "sheet", week: handled, questions: [], questionUpdates: [], ...overrides };
}

describe("mergeSheetReport", () => {
  it("starts a report from the first run", () => {
    const handled = week("2026-11-09", { questions: [question("q1")] });
    const merged = mergeSheetReport(undefined, run(handled, { questions: [question("q2")] }));
    expect(merged).toEqual(report([handled], [question("q2")]));
  });

  it("replaces the handled week and keeps the others in date order", () => {
    const previous = report([
      week("2026-11-02", { senderNote: ["old"] }),
      week("2026-11-16", { questions: [question("q1")] }),
    ]);
    const handled = week("2026-11-09");
    const replaced = week("2026-11-16", { senderNote: ["new"], questions: [question("q1", { text: "Přepsáno" })] });
    const merged = mergeSheetReport(previous, run(handled));
    expect(merged.weeks.map((entry) => entry.validFrom)).toEqual(["2026-11-02", "2026-11-09", "2026-11-16"]);

    const again = mergeSheetReport(merged, run(replaced));
    expect(again.weeks).toHaveLength(3);
    expect(again.weeks[2]).toEqual(replaced);
  });

  it("drops previous refused and document-error weeks", () => {
    const previous = report([
      week("2026-11-02", { outcome: { kind: "refused", reason: "x" } }),
      week("2026-11-09", { outcome: { kind: "document-error", reason: "y" } }),
      week("2026-11-16", { outcome: { kind: "corrected" } }),
    ]);
    const merged = mergeSheetReport(previous, run(week("2026-11-23")));
    expect(merged.weeks.map((entry) => entry.validFrom)).toEqual(["2026-11-16", "2026-11-23"]);
  });

  it("resolves a question of another week by id", () => {
    const previous = report(
      [week("2026-11-02", { questions: [question("q1")] })],
      [question("q2", { blocking: true })],
    );
    const merged = mergeSheetReport(
      previous,
      run(week("2026-11-09"), {
        questionUpdates: [
          { id: "q1", status: "resolved", answer: "Ano" },
          { id: "q2", status: "resolved" },
        ],
      }),
    );
    expect(merged.weeks[0].questions[0]).toEqual(question("q1", { status: "resolved", answer: "Ano" }));
    expect(merged.questions[0]).toEqual(question("q2", { blocking: true, status: "resolved" }));
  });

  it("fails on an update of an unknown id", () => {
    const previous = report([week("2026-11-02", { questions: [question("q1")] })]);
    expect(() =>
      mergeSheetReport(previous, run(week("2026-11-09"), { questionUpdates: [{ id: "q9", status: "resolved" }] })),
    ).toThrow(/q9/);
  });

  it("fails on an update of a question that existed only in the replaced week", () => {
    const previous = report([week("2026-11-02", { questions: [question("q1")] })]);
    expect(() =>
      mergeSheetReport(previous, run(week("2026-11-02"), { questionUpdates: [{ id: "q1", status: "resolved" }] })),
    ).toThrow(/q1/);
  });

  it("fails when a new question reuses an id of the previous report", () => {
    const previous = report([week("2026-11-02", { questions: [question("q1")] })], [question("q2")]);
    expect(() => mergeSheetReport(previous, run(week("2026-11-09"), { questions: [question("q1")] }))).toThrow(/q1/);
    expect(() => mergeSheetReport(previous, run(week("2026-11-09", { questions: [question("q2")] })))).toThrow(/q2/);
  });
});
