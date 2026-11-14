import { describe, expect, it } from "vitest";
import type { EventsReport, Question, SheetReport } from "./report-schema";
import { allQuestions, isDraft, itemLabel, openBlockingIds, outcomeLines, outcomeText } from "./report";

const question = (id: string, overrides: Partial<Question> = {}): Question => ({
  id,
  blocking: false,
  status: "open",
  where: "somewhere",
  text: "What?",
  ...overrides,
});

const sheet = (overrides: Partial<SheetReport> = {}): SheetReport => ({
  kind: "sheet",
  weeks: [
    {
      validFrom: "2026-10-19",
      validTo: "2026-10-25",
      outcome: { kind: "created" },
      questions: [question("q2", { blocking: true })],
    },
    {
      validFrom: "2026-10-26",
      validTo: "2026-11-01",
      outcome: { kind: "refused", reason: "overlaps" },
      questions: [question("q3")],
    },
  ],
  questions: [question("q1")],
  ...overrides,
});

const events = (): EventsReport => ({
  kind: "events",
  events: [
    { outcome: { kind: "created", id: "pout" }, questions: [question("q2")] },
    { title: "Koncert", outcome: { kind: "duplicate", of: "koncert-2026", where: 12 }, questions: [] },
  ],
  questions: [question("q1", { blocking: true })],
  droppedAttachments: [],
});

describe("allQuestions", () => {
  it("counts report-level, week and event questions", () => {
    expect(allQuestions(sheet()).map((q) => q.id)).toEqual(["q1", "q2", "q3"]);
    expect(allQuestions(events()).map((q) => q.id)).toEqual(["q1", "q2"]);
  });
});

describe("isDraft", () => {
  it("is a draft only with an open blocking question", () => {
    expect(openBlockingIds(sheet())).toEqual(["q2"]);
    expect(isDraft(sheet())).toBe(true);
    const resolved = sheet({ questions: [question("q1", { blocking: true, status: "resolved" })], weeks: [] });
    expect(isDraft(resolved)).toBe(false);
    const note = sheet({ questions: [question("q1")], weeks: [] });
    expect(isDraft(note)).toBe(false);
    expect(openBlockingIds(events())).toEqual(["q1"]);
  });
});

describe("itemLabel", () => {
  it("labels weeks with formatWeeks, a created event with its record's title (else its id), a refused one with its own", () => {
    expect(itemLabel(sheet(), 0)).toBe("19.–25. 10. 2026");
    expect(itemLabel(sheet(), 1)).toBe("26. 10.–1. 11. 2026");
    expect(itemLabel(events(), 0, (id) => (id === "pout" ? "Pouť" : undefined))).toBe("Pouť");
    expect(itemLabel(events(), 0)).toBe("pout");
    expect(itemLabel(events(), 1)).toBe("Koncert");
  });
});

describe("outcomeText", () => {
  it("names each outcome", () => {
    expect(outcomeText({ kind: "created" })).toBe("created");
    expect(outcomeText({ kind: "created", id: "pout" })).toBe("created");
    expect(outcomeText({ kind: "corrected" })).toBe("corrected");
    expect(outcomeText({ kind: "refused", reason: "overlaps" })).toBe("refused: overlaps");
    expect(outcomeText({ kind: "document-error", reason: "no table" })).toBe("document error: no table");
    expect(outcomeText({ kind: "correction", of: "zajezd-2026" })).toBe(
      "refused: a correction of zajezd-2026; make it with parish-correct-event",
    );
    expect(outcomeText({ kind: "duplicate", of: "hody-2026", where: "main" })).toBe(
      "refused: already in main as hody-2026",
    );
    expect(outcomeText({ kind: "duplicate", of: "hody-2026", where: 12 })).toBe(
      "refused: already in PR #12 as hody-2026",
    );
  });
});

describe("outcomeLines", () => {
  it("lists outcome lines, or only the failed ones", () => {
    expect(outcomeLines(sheet())).toEqual(["19.–25. 10. 2026: created", "26. 10.–1. 11. 2026: refused: overlaps"]);
    expect(outcomeLines(sheet(), { failed: true })).toEqual(["26. 10.–1. 11. 2026: refused: overlaps"]);
    const title = () => "Pouť";
    expect(outcomeLines(events(), { eventTitle: title })).toEqual([
      "Pouť: created",
      "Koncert: refused: already in PR #12 as koncert-2026",
    ]);
    expect(outcomeLines(events(), { failed: true })).toEqual(["Koncert: refused: already in PR #12 as koncert-2026"]);
    expect(outcomeLines(undefined)).toEqual([]);
  });
});
