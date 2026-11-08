import { describe, expect, it } from "vitest";
import { runStateFromEnv, summarize, type RunState } from "./summary";

/** A run that handled a sheet or mail and opened its PR. */
const done = (overrides: Partial<RunState> = {}): RunState => ({
  fetched: true,
  mail: ["2026-11-08 09:12: sheet (newest)"],
  handled: true,
  job: "success",
  claude: "success",
  download: "success",
  apply: "success",
  changed: true,
  pr: "success",
  prAction: "opened",
  prUrl: "https://github.com/o/r/pull/7",
  ...overrides,
});

const report = (...outcomes: [string, string][]) =>
  [
    "blocking: no",
    "commit: x",
    "",
    ...outcomes.flatMap(([item, outcome]) => [`## ${item}`, `Outcome: ${outcome}`]),
  ].join("\n");

const text = (result: { lines: string[] }) => result.lines.join("\n");

describe("summarize", () => {
  it("lists the mail and the PR, without an error", () => {
    const result = summarize("sheet", done({ prAction: "updated" }), report(["A", "created"]));
    expect(result.lines).toEqual([
      "## Service sheet",
      "",
      "- 2026-11-08 09:12: sheet (newest)",
      "",
      "PR updated: https://github.com/o/r/pull/7",
    ]);
    expect(result.error).toBeUndefined();
  });

  it("says when the mail could not be read or there was none", () => {
    expect(text(summarize("sheet", done({ fetched: false, mail: [], handled: false }), ""))).toBe(
      "## Service sheet\n\nThe mail could not be read.\n",
    );
    expect(text(summarize("events", done({ mail: [], handled: false }), ""))).toBe("## Events\n\nNo new mail.\n");
  });

  it("names the first failed step, which leaves the sheet or mail unread", () => {
    const line = (kind: "sheet" | "events", state: Partial<RunState>) => summarize(kind, done(state), "").lines[4];
    expect(line("sheet", { claude: "failure" })).toBe(
      "Claude's run failed: the sheet stays unread and the next run retries it.",
    );
    expect(line("events", { job: "failure" })).toBe(
      "The event job failed after Claude's run (see the log): the mail stays unread for the next run.",
    );
    expect(line("sheet", { download: "failure" })).toMatch(/^The sheet job failed after Claude's run/);
    expect(line("sheet", { apply: "failure" })).toMatch(/^The change or the report was not accepted/);
    expect(line("sheet", { pr: "failure" })).toMatch(/^The commit or PR failed/);
    expect(summarize("sheet", done({ claude: "failure" }), "").error).toBeUndefined();
  });

  it("fails a sheet run with a week not published, and lists it", () => {
    const result = summarize("sheet", done({ changed: false }), report(["A", "refused: overlaps"], ["B", "corrected"]));
    expect(text(result)).toContain("Nothing changed: no PR.\n\nWeeks not published:\n- A: refused: overlaps");
    expect(text(result)).not.toContain("- B:");
    expect(result.error).toMatch(/^A week was refused/);
  });

  it("fails a sheet run for the parish's mail it could not handle", () => {
    for (const state of [{ noDocx: 1 }, { noWeek: 1 }, { unhandled: 2 }]) {
      expect(summarize("sheet", done({ handled: false, ...state }), "").error).toBeDefined();
    }
    expect(text(summarize("sheet", done({ handled: false, noDocx: 2 }), ""))).toContain(
      "2 message(s) from the parish had no DOCX or several",
    );
  });

  it("fails a sheet run that named an older week and changed nothing, but not one with a PR", () => {
    const quiet = summarize(
      "sheet",
      done({ changed: false, skipped: "2026-11-15 – 2026-11-22" }),
      report(["A", "corrected"]),
    );
    expect(text(quiet)).toContain("the DOCX's newest week (2026-11-15 – 2026-11-22) was not handled");
    expect(quiet.error).toBeDefined();
    const withPr = summarize("sheet", done({ skipped: "2026-11-15 – 2026-11-22" }), report(["A", "corrected"]));
    expect(withPr.error).toBeUndefined();
  });

  it("lists every event's outcome and fails a mail that added nothing", () => {
    const opened = summarize("events", done(), report(["Pouť", "created"], ["Koncert", "refused: a duplicate"]));
    expect(opened.lines.slice(4)).toEqual([
      "PR opened: https://github.com/o/r/pull/7",
      "",
      "- Pouť: created",
      "- Koncert: refused: a duplicate",
    ]);
    expect(opened.error).toBeUndefined();
    const refused = summarize("events", done({ changed: false }), report(["Koncert", "refused: a duplicate"]));
    expect(refused.lines[4]).toBe("Nothing new in the mail (every event refused, or no event in it): refused, no PR.");
    expect(refused.error).toMatch(/^A mail added nothing/);
  });

  it("fails an events run for incomplete mail or a known sender's failed DKIM", () => {
    expect(text(summarize("events", done({ handled: false, incomplete: 1 }), ""))).toContain(
      "1 mail(s) from an accepted sender had neither an attachment nor a subject and a text.",
    );
    const dkim = summarize("events", done({ handled: false, knownDkim: "kuřim.cz" }), "");
    expect(text(dkim)).toContain("Mail from kuřim.cz failed the DKIM check");
    expect(dkim.error).toBeDefined();
  });
});

describe("runStateFromEnv", () => {
  it("reads the step outputs, tolerating missing and broken values", () => {
    expect(
      runStateFromEnv({
        FETCHED: "true",
        SUMMARY: '["a","b"]',
        HANDLED: "42",
        JOB_RESULT: "success",
        CLAUDE: "failure",
        CHANGED: "false",
        PR_ACTION: "opened",
        NO_DOCX: "2",
        SKIPPED: "2026-11-15 – 2026-11-22",
      }),
    ).toEqual({
      fetched: true,
      mail: ["a", "b"],
      handled: true,
      job: "success",
      claude: "failure",
      download: "",
      apply: "",
      changed: false,
      pr: "",
      prAction: "opened",
      noDocx: 2,
      noWeek: 0,
      unhandled: 0,
      skipped: "2026-11-15 – 2026-11-22",
      incomplete: 0,
    });
    const empty = runStateFromEnv({ SUMMARY: "not json", CLAUDE: "weird", NO_WEEK: "x" });
    expect(empty.mail).toEqual([]);
    expect(empty.claude).toBe("");
    expect(empty.noWeek).toBe(0);
    expect(empty.changed).toBeUndefined();
  });
});
