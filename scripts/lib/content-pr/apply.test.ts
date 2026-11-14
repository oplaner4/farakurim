import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { freshTempDir, testGit } from "../test-helpers/files";
import {
  fixResult,
  reportQuestion,
  reportWeek,
  sheetList,
  sheetRepo,
  sheetReport,
  sheetRunReport,
  stageResultOf,
} from "../test-helpers/reports";
import { VENUE_LIST, venueRecord } from "../test-helpers/venues";
import { applyReport, type ApplyInput } from "./apply";
import type { WeekEntry } from "./report-schema";

const WEEK_12 = reportWeek("2026-10-12", "2026-10-18", { kind: "created" });
const WEEK_19 = reportWeek("2026-10-19", "2026-10-25", { kind: "created" });

describe("applyReport", () => {
  const dir = freshTempDir("content-pr-apply");
  const repo = () => join(dir(), "repo");
  const out = () => join(dir(), "out");

  /** Applies `input` in the test repo; resolves with the printed lines and the warnings. */
  function apply(input: Omit<ApplyInput, "base" | "out">, lint: (message: string) => boolean = () => true) {
    const lines: string[] = [];
    const warnings: string[] = [];
    const io = { cwd: repo(), print: (l: string) => lines.push(l), warn: (l: string) => warnings.push(l), lint };
    applyReport({ base: "main", out: out(), ...input }, io);
    return { lines, warnings, result: JSON.parse(lines[0]) as unknown };
  }

  /**
   * A repo whose `main` holds the sheet list `main` and whose checked-out PR branch holds `pr`, and a patch changing
   * the PR branch's list to `patched` (no patch file without it).
   */
  function prRepo(main: string, pr: string, patched?: string): string {
    const file = sheetRepo(repo(), main, pr);
    testGit(repo(), "checkout", "-q", "-b", "pr");
    testGit(repo(), "commit", "-q", "--allow-empty", "-am", "pr");
    const patch = join(dir(), "content.patch");
    if (patched !== undefined) {
      writeFileSync(file, patched);
      writeFileSync(patch, `${testGit(repo(), "diff", "--binary", "HEAD")}\n`);
      testGit(repo(), "checkout", "-q", "--", ".");
    }
    return patch;
  }

  const json = (file: string, value: unknown) => {
    writeFileSync(join(dir(), file), JSON.stringify(value));
    return join(dir(), file);
  };

  /** A sheet run's files: the agent's report of `entry` and the result its last stage run wrote. */
  const sheetRun = (entry: WeekEntry) => ({
    report: json("run.json", sheetRunReport(entry)),
    stageResult: json("stage-result.json", stageResultOf(entry)),
  });

  const written = () => JSON.parse(readFileSync(join(out(), "report.json"), "utf8")) as unknown;

  /** The checkout is as it was and nothing was written. */
  const untouched = () => {
    expect(testGit(repo(), "status", "--porcelain")).toBe("");
    expect(existsSync(join(out(), "report.json"))).toBe(false);
  };

  it("applies a sheet run, merges it and names the commit", () => {
    const patch = prRepo(sheetList(), sheetList(WEEK_12), sheetList(WEEK_12, WEEK_19));
    const previous = json("previous.json", sheetReport([WEEK_12]));
    const { result, warnings } = apply({ kind: "sheet", run: true, previous, ...sheetRun(WEEK_19), patch });
    expect(result).toEqual({
      changed: true,
      draft: false,
      message: "feat(content): publish the service sheets for 12.–18. 10. and 19.–25. 10. 2026",
    });
    expect(warnings).toEqual([]);
    expect(written()).toEqual(sheetReport([WEEK_12, WEEK_19]));
    expect(testGit(repo(), "status", "--porcelain")).toBe("M src/content/service-sheets.json");
  });

  it("makes a draft of an open blocking question", () => {
    const patch = prRepo(sheetList(), sheetList(), sheetList(WEEK_19));
    const asking = reportWeek("2026-10-19", "2026-10-25", { kind: "created" }, [reportQuestion("q1", true)]);
    expect(apply({ kind: "sheet", run: true, ...sheetRun(asking), patch }).result).toEqual({
      changed: true,
      draft: true,
      message: "feat(content): publish the service sheet for 19.–25. 10. 2026",
    });
  });

  it('fails with "close and resend" on a missing previous report, and applies nothing', () => {
    const patch = prRepo(sheetList(), sheetList(WEEK_12), sheetList(WEEK_12, WEEK_19));
    const previous = join(dir(), "none.json");
    expect(() => apply({ kind: "sheet", run: true, previous, ...sheetRun(WEEK_19), patch })).toThrow(
      "close the PR and send the sheet or event again",
    );
    untouched();
  });

  it("undoes a change when the last stage run was refused", () => {
    const patch = prRepo(sheetList(), sheetList(), sheetList(WEEK_19));
    const refused = reportWeek("2026-10-19", "2026-10-25", { kind: "refused", reason: "overlaps" });
    expect(() => apply({ kind: "sheet", run: true, ...sheetRun(refused), patch })).toThrow(
      "week: the stage run ended refused, but the change holds 19.–25. 10. 2026",
    );
    untouched();
  });

  it("refuses a staged week when the change holds none", () => {
    const patch = prRepo(sheetList(), sheetList());
    expect(() => apply({ kind: "sheet", run: true, ...sheetRun(WEEK_19), patch })).toThrow(
      "week: the stage run staged the week 19.–25. 10. 2026, but the change holds no week",
    );
  });

  it("takes a published week's outcome from the change: corrected for a week the PR or main holds", () => {
    const changedWeek = { validFrom: "2026-10-19", validTo: "2026-10-25", days: [{ date: "2026-10-19" }] };
    const patch = prRepo(sheetList(), sheetList(WEEK_19), `${JSON.stringify({ sheets: [changedWeek] })}\n`);
    const previous = json("previous.json", sheetReport([WEEK_19]));
    apply({ kind: "sheet", run: true, previous, ...sheetRun(WEEK_19), patch });
    expect(written()).toEqual(sheetReport([reportWeek("2026-10-19", "2026-10-25", { kind: "corrected" })]));
  });

  it("undoes a change when the report creates nothing", () => {
    // An events PR whose patch only adds a venue, while every event is refused.
    const venues = join(repo(), "src/content/venues.json");
    mkdirSync(join(repo(), "src/content/news"), { recursive: true });
    writeFileSync(venues, `${JSON.stringify({ venues: VENUE_LIST })}\n`);
    testGit(repo(), "init", "-q", "-b", "main");
    testGit(repo(), "config", "core.autocrlf", "false");
    testGit(repo(), "add", "-A");
    testGit(repo(), "commit", "-q", "-m", "main");
    const added = [...VENUE_LIST, venueRecord("ceska-sokolovna", "Sokolovna", "Česká")];
    writeFileSync(venues, `${JSON.stringify({ venues: added })}\n`);
    const patch = join(dir(), "content.patch");
    writeFileSync(patch, `${testGit(repo(), "diff", "--binary", "HEAD")}\n`);
    testGit(repo(), "checkout", "-q", "--", ".");
    const report = json("report.json", {
      events: [{ title: "Koncert", outcome: { kind: "refused", reason: "past" }, questions: [] }],
      questions: [],
      droppedAttachments: [],
    });
    expect(() => apply({ kind: "events", run: true, report, patch })).toThrow(
      "The report creates nothing, but the change is not empty: not applied.",
    );
    untouched();
  });

  it("names no commit and warns nothing when nothing changed and there is no fix", () => {
    const patch = prRepo(sheetList(), sheetList());
    const refused = reportWeek("2026-10-19", "2026-10-25", { kind: "refused", reason: "overlaps" });
    const { result, warnings } = apply({ kind: "sheet", run: true, ...sheetRun(refused), patch }, () => false);
    expect(result).toEqual({ changed: false, draft: false, message: "feat(content): update the service sheets" });
    expect(warnings).toEqual([]);
    expect(existsSync(join(out(), "reply.md"))).toBe(false);
  });

  it("accepts a fix that only answers a question (no patch) and keeps the PR's facts", () => {
    const patch = prRepo(sheetList(), sheetList(WEEK_19));
    const answered = reportWeek("2026-10-19", "2026-10-25", { kind: "created" }, [
      reportQuestion("q1", true, "resolved"),
    ]);
    const report = json("report.json", sheetReport([answered]));
    const fix = json("fix.json", fixResult("unchanged"));
    expect(apply({ kind: "sheet", run: false, fix, report, patch }).result).toEqual({
      changed: false,
      draft: false,
      message: "feat(content): publish the service sheet for 19.–25. 10. 2026",
    });
    expect(written()).toEqual(sheetReport([answered]));
    expect(readFileSync(join(out(), "reply.md"), "utf8")).toBe("Done.\n");
    // The same fix whose report drops the PR's week fails the fact check.
    const dropped = json("dropped.json", sheetReport([]));
    expect(() => apply({ kind: "sheet", run: false, fix, report: dropped, patch })).toThrow(
      "the change holds the week 19.–25. 10. 2026, which the report does not give",
    );
  });

  it("undoes a fix whose report changes what a fix may not", () => {
    const changedWeek = { validFrom: "2026-10-19", validTo: "2026-10-25", days: [{ date: "2026-10-19" }] };
    const patch = prRepo(sheetList(), sheetList(WEEK_19), `${JSON.stringify({ sheets: [changedWeek] })}\n`);
    const asking = reportWeek("2026-10-19", "2026-10-25", { kind: "created" }, [reportQuestion("q1", true)]);
    const original = json("original.json", sheetReport([asking]));
    const fix = json("fix.json", fixResult("changed"));
    const quieted = reportWeek("2026-10-19", "2026-10-25", { kind: "created" }, [reportQuestion("q1", false)]);
    const report = json("report.json", sheetReport([quieted]));
    expect(() => apply({ kind: "sheet", run: false, fix, original, report, patch })).toThrow(
      "The fix changes the report where it may not: not applied.\nweeks.0.questions.0.blocking: may not change",
    );
    untouched();
    // The same fix that leaves the question as it was is applied, still a draft.
    const kept = json("kept.json", sheetReport([asking]));
    expect(apply({ kind: "sheet", run: false, fix, original, report: kept, patch }).result).toMatchObject({
      changed: true,
      draft: true,
    });
  });

  it("refuses a fix whose outcome disagrees with the patch", () => {
    const none = prRepo(sheetList(), sheetList(WEEK_19));
    const report = json("report.json", sheetReport([WEEK_19]));
    const changed = json("fix.json", fixResult("changed"));
    expect(() => apply({ kind: "sheet", run: false, fix: changed, report, patch: none })).toThrow(
      "The fix result says changed, but the patch changes nothing",
    );
    const patch = join(dir(), "some.patch");
    writeFileSync(patch, "diff\n");
    const unchanged = json("unchanged.json", fixResult("unchanged"));
    expect(() => apply({ kind: "sheet", run: false, fix: unchanged, report, patch })).toThrow(
      "The fix result says unchanged, but the patch changes the content",
    );
  });

  it("falls back to the default messages when commitlint refuses, warning for each", () => {
    const changedWeek = { validFrom: "2026-10-19", validTo: "2026-10-25", days: [{ date: "2026-10-19" }] };
    const patch = prRepo(sheetList(), sheetList(WEEK_19), `${JSON.stringify({ sheets: [changedWeek] })}\n`);
    const report = json("report.json", sheetReport([WEEK_19]));
    const fix = json("fix.json", fixResult("changed", "fixed it"));
    const refused = apply({ kind: "sheet", run: false, fix, report, patch }, () => false);
    expect(refused.result).toEqual({
      changed: true,
      draft: false,
      message: "feat(content): update the service sheets",
      fix: "fix(content): apply a comment correction",
    });
    expect(refused.warnings).toEqual([
      '::warning::commitlint refuses the commit message "feat(content): publish the service sheet for 19.–25. 10. 2026".',
      '::warning::No valid commit message: using the default "feat(content): update the service sheets".',
      '::warning::commitlint refuses the fix message "fixed it".',
      '::warning::commitlint refuses the fix message "fix(content): correct the service sheet for 19.–25. 10. 2026".',
      '::warning::No valid fix message: using the default "fix(content): apply a comment correction".',
    ]);
    // A refused fix message falls back to the one the fix's change names.
    testGit(repo(), "checkout", "-q", "--", ".");
    const named = apply({ kind: "sheet", run: false, fix, report, patch }, (m) => m !== "fixed it");
    expect(named.result).toEqual({
      changed: true,
      draft: false,
      message: "feat(content): publish the service sheet for 19.–25. 10. 2026",
      fix: "fix(content): correct the service sheet for 19.–25. 10. 2026",
    });
    expect(named.warnings).toEqual(['::warning::commitlint refuses the fix message "fixed it".']);
  });
});
