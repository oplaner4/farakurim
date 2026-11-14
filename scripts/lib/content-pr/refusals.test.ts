import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { newsEvent } from "@/test/fixtures";
import { freshTempDir } from "../test-helpers/files";
import { issuesOf } from "../test-helpers/reports";
import { checkRefusals, readKnown, refusalIssues, type KnownId } from "./refusals";
import type { EventOutcome, EventsReport } from "./report-schema";

const KNOWN: KnownId[] = [
  { id: "pout-2026", where: "main" },
  { id: "koncert-2026", where: 12 },
];

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

describe("readKnown and checkRefusals", () => {
  const dir = freshTempDir("content-pr-refusals");

  it("reads the known events and checks against them and the site's records", () => {
    const file = join(dir(), "known.json");
    writeFileSync(file, JSON.stringify([{ ...KNOWN[0], title: "Pouť", start: "2026-11-20", place: "Kuřim" }]));
    expect(readKnown(file)).toEqual([KNOWN[0]]);
    writeFileSync(file, JSON.stringify([{ id: "pout-2026" }]));
    expect(() => readKnown(file)).toThrow(`${file} is not a list of known events`);

    const correction = refusing({ kind: "correction", of: "hody-2025" });
    expect(issuesOf(() => checkRefusals(correction, KNOWN, dir()))).toHaveLength(1);
    mkdirSync(join(dir(), "src/content/news/2025"), { recursive: true });
    writeFileSync(
      join(dir(), "src/content/news/2025/10.json"),
      JSON.stringify([newsEvent({ id: "hody-2025", start: "2025-10-18" })]),
    );
    expect(() => checkRefusals(correction, KNOWN, dir())).not.toThrow();
  });
});
