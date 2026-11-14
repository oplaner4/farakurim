import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { newsEvent } from "@/test/fixtures";
import { freshTempDir } from "../test-helpers/files";
import { issuesOf } from "../test-helpers/reports";
import { checkRefusals, CORRECTION_WORDS, correctionIssues, refusalIssues } from "./refusals";
import type { CorrectionWord } from "../news/correction-words-schema";
import type { EventOutcome, EventsReport, Question } from "./report-schema";

const KNOWN = [
  { id: "pout-2026", where: "main" },
  { id: "koncert-2026", where: 12 },
] as const satisfies { id: string; where: "main" | number }[];

const refusing = (...outcomes: EventOutcome[]): EventsReport => ({
  kind: "events",
  events: outcomes.map((outcome) => ({ title: "Akce", outcome, questions: [] })),
  questions: [],
  droppedAttachments: [],
});

describe("refusalIssues", () => {
  it("accepts a duplicate where the known events have it and a correction of a known event or one on the site", () => {
    const report = refusing(
      { kind: "duplicate", of: "pout-2026", where: "main" },
      { kind: "duplicate", of: "koncert-2026", where: 12 },
      { kind: "correction", of: "koncert-2026" },
      { kind: "correction", of: "hody-2025" },
      { kind: "refused", reason: "past" },
    );
    expect(refusalIssues(report, KNOWN, new Set(["hody-2025"]))).toEqual([]);
  });

  it("names a duplicate in the wrong place or unknown, and a correction of no event", () => {
    const report = refusing(
      { kind: "duplicate", of: "koncert-2026", where: "main" },
      { kind: "duplicate", of: "jarmark-2026", where: 7 },
      { kind: "correction", of: "jarmark-2026" },
    );
    expect(refusalIssues(report, KNOWN, new Set())).toEqual([
      "events.0.outcome.of: koncert-2026 is no known event in main, it is in PR #12",
      "events.1.outcome.of: jarmark-2026 is no known event in PR #7",
      "events.2.outcome.of: jarmark-2026 is no known event and no event on the site",
    ]);
  });
});

describe("correctionIssues", () => {
  const words: CorrectionWord[] = [
    { where: "subject", kind: "move" },
    { where: "attachment 2", kind: "cancellation" },
  ];
  const created = refusing({ kind: "created", id: "koncert-2026" });
  const question: Question = { id: "q1", blocking: false, status: "open", where: CORRECTION_WORDS, text: "A repair." };

  it("asks for an answer to the mail's correction words: an event refused as a correction, or a question", () => {
    expect(correctionIssues(created, words)).toEqual([
      "events: the mail has a word for a move in the subject, a word for a cancellation in attachment 2: refuse the " +
        'event it corrects (outcome correction), or say why it corrects none in a report-level question whose where is "correction words"',
    ]);
    expect(correctionIssues(refusing({ kind: "correction", of: "koncert-2026" }), words)).toEqual([]);
    expect(correctionIssues({ ...created, questions: [question] }, words)).toEqual([]);
    expect(correctionIssues(created, [])).toEqual([]);
  });
});

describe("checkRefusals", () => {
  const dir = freshTempDir("content-pr-refusals");

  it("checks against the known events and the site's records", () => {
    const correction = refusing({ kind: "correction", of: "hody-2025" });
    expect(issuesOf(() => checkRefusals(correction, { known: KNOWN, words: [] }, dir()))).toHaveLength(1);
    mkdirSync(join(dir(), "src/content/news/2025"), { recursive: true });
    writeFileSync(
      join(dir(), "src/content/news/2025/10.json"),
      JSON.stringify([newsEvent({ id: "hody-2025", start: "2025-10-18" })]),
    );
    expect(() => checkRefusals(correction, { known: KNOWN, words: [] }, dir())).not.toThrow();
  });
});
