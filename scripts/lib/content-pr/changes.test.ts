import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { freshTempDir, testGit } from "../test-helpers/files";
import {
  changesProblem,
  commitMessage,
  contentChanges,
  fixCommitMessage,
  mergeBase,
  type ContentChanges,
} from "./changes";
import type { EventsReport, SheetReport, WeekEntry } from "./report-schema";

const sheet = (validFrom: string, validTo: string, note = "") => ({ validFrom, validTo, days: [], note });
const event = (id: string, title: string, text = "") => ({ id, title, start: "2026-12-19", text });

describe("contentChanges", () => {
  const dir = freshTempDir("content-pr-changes");

  /** A repo whose HEAD holds `before`, with `after` written over it. */
  function repo(before: Record<string, unknown>, after: Record<string, unknown>): string {
    const root = join(dir(), "repo");
    const write = (files: Record<string, unknown>) => {
      for (const [path, data] of Object.entries(files)) {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), `${JSON.stringify(data, null, 2)}\n`);
      }
    };
    mkdirSync(root, { recursive: true });
    write({ "README.md": "x", ...before });
    testGit(root, "init", "-q");
    testGit(root, "add", "-A");
    testGit(root, "commit", "-q", "-m", "x");
    write(after);
    return root;
  }

  it("lists the weeks the PR adds and changes against a base commit", () => {
    const old = sheet("2026-10-11", "2026-10-18");
    const cwd = repo(
      { "src/content/service-sheets.json": { sheets: [old, sheet("2026-10-18", "2026-10-25")] } },
      {
        "src/content/service-sheets.json": {
          sheets: [old, sheet("2026-10-18", "2026-10-25", "corrected"), sheet("2026-10-25", "2026-11-01")],
        },
      },
    );
    testGit(cwd, "commit", "-q", "-am", "later");
    const base = testGit(cwd, "rev-parse", "HEAD~1").trim();
    expect(contentChanges(cwd, "sheet", base)).toEqual({
      kind: "sheet",
      added: [{ validFrom: "2026-10-25", validTo: "2026-11-01" }],
      changed: [{ validFrom: "2026-10-18", validTo: "2026-10-25" }],
    });
    expect(contentChanges(cwd, "sheet", "HEAD")).toEqual({ kind: "sheet", added: [], changed: [] });
  });

  it("lists events added and changed against a base, in new month files too", () => {
    const cwd = repo(
      { "src/content/news/2026/12.json": [event("pout-2026", "Pouť")] },
      {
        "src/content/news/2026/12.json": [event("pout-2026", "Pouť", "changed"), event("hody-2026", "Hody")],
        "src/content/news/2027/01.json": [event("tri-kralove-2027", "Tři králové")],
        "src/content/venues.json": { venues: [] },
      },
    );
    expect(contentChanges(cwd, "events", "HEAD")).toEqual({
      kind: "events",
      added: [
        { id: "hody-2026", title: "Hody" },
        { id: "tri-kralove-2027", title: "Tři králové" },
      ],
      changed: [{ id: "pout-2026", title: "Pouť" }],
    });
  });

  it("lists committed events against an earlier base, an event moved to another month as changed", () => {
    const moved = event("pout-2026", "Pouť");
    const cwd = repo(
      { "src/content/news/2026/12.json": [moved] },
      { "src/content/news/2027/01.json": [{ ...moved, start: "2027-01-09" }] },
    );
    rmSync(join(cwd, "src/content/news/2026/12.json"));
    testGit(cwd, "add", "-A");
    testGit(cwd, "commit", "-q", "-m", "move");
    expect(contentChanges(cwd, "events", "HEAD~1")).toEqual({
      kind: "events",
      added: [],
      changed: [{ id: "pout-2026", title: "Pouť" }],
    });
  });

  it("finds the merge base of HEAD and a ref", () => {
    const cwd = repo({}, {});
    const first = testGit(cwd, "rev-parse", "HEAD").trim();
    testGit(cwd, "branch", "side");
    writeFileSync(join(cwd, "README.md"), "y");
    testGit(cwd, "commit", "-q", "-am", "y");
    expect(mergeBase(cwd, "side")).toBe(first);
  });
});

const week = (validFrom: string, validTo: string) => ({ validFrom, validTo });
const entry = (validFrom: string, validTo: string, kind: WeekEntry["outcome"]["kind"]): WeekEntry => ({
  validFrom,
  validTo,
  outcome: kind === "refused" || kind === "document-error" ? { kind, reason: "r" } : { kind },
  questions: [],
});
const sheetReport = (...weeks: WeekEntry[]): SheetReport => ({ kind: "sheet", weeks, questions: [] });
const eventsReport = (...events: [string, string | undefined][]): EventsReport => ({
  kind: "events",
  events: events.map(([title, id]) =>
    id
      ? { outcome: { kind: "created", id }, questions: [] }
      : { title, outcome: { kind: "refused", reason: "r" }, questions: [] },
  ),
  questions: [],
  droppedAttachments: [],
});
const sheetChanges = (added: ReturnType<typeof week>[], changed: ReturnType<typeof week>[] = []) =>
  ({ kind: "sheet", added, changed }) satisfies ContentChanges;

describe("changesProblem", () => {
  const w1 = week("2026-10-19", "2026-10-25");

  it("accepts a report whose created and corrected weeks are exactly the PR's", () => {
    const r = sheetReport(entry("2026-10-12", "2026-10-18", "corrected"), entry("2026-10-19", "2026-10-25", "created"));
    const changes = sheetChanges([w1], [week("2026-10-12", "2026-10-18")]);
    expect(changesProblem(r, changes)).toBeUndefined();
    const refused = sheetReport(entry("2026-11-02", "2026-11-08", "refused"));
    expect(changesProblem(refused, sheetChanges([], []))).toBeUndefined();
  });

  it("refuses a week the PR adds that the report gives as refused", () => {
    const r = sheetReport(entry("2026-10-19", "2026-10-25", "refused"));
    expect(changesProblem(r, sheetChanges([w1]))).toBe(
      "The report does not match the change (the change holds the week 19.–25. 10. 2026, which the report gives as refused): not applied.",
    );
    expect(changesProblem(sheetReport(), sheetChanges([w1]))).toContain("19.–25. 10. 2026");
  });

  it("refuses a created week the PR does not hold", () => {
    const r = sheetReport(entry("2026-10-19", "2026-10-25", "created"));
    expect(changesProblem(r, sheetChanges([]))).toBe(
      "The report does not match the change (the report gives the week 19.–25. 10. 2026 as created, but the change does not hold it): not applied.",
    );
  });

  it("refuses a week whose report dates differ from the PR's", () => {
    const r = sheetReport(entry("2026-10-19", "2026-10-26", "created"));
    expect(changesProblem(r, sheetChanges([w1]))).toContain("not applied");
  });

  it("matches the created events with the events the change adds by id", () => {
    const added = [{ id: "hody-2026", title: "Hody 2026" }];
    const ok = eventsReport(["Hody", "hody-2026"], ["Pouť", undefined]);
    expect(changesProblem(ok, { kind: "events", added, changed: [] })).toBeUndefined();
    const none = { kind: "events", added: [], changed: [] } satisfies ContentChanges;
    expect(changesProblem(eventsReport(["Hody 2026", "hody-2026"]), none)).toContain(
      "the report gives the event hody-2026 as created, but the change does not add it",
    );
    expect(changesProblem(eventsReport(), { kind: "events", added, changed: [] })).toContain(
      "the change adds the event hody-2026, which the report does not give as created",
    );
  });
});

describe("commitMessage", () => {
  it("names a feat for an added week and a fix for corrections only", () => {
    const r = sheetReport(
      entry("2026-10-26", "2026-11-01", "corrected"),
      entry("2026-10-19", "2026-10-25", "created"),
      entry("2026-11-02", "2026-11-08", "refused"),
    );
    const changes = sheetChanges([week("2026-10-19", "2026-10-25")], [week("2026-10-26", "2026-11-01")]);
    expect(commitMessage(r, changes)).toBe(
      "feat(content): publish the service sheets for 19.–25. 10. and 26. 10.–1. 11. 2026",
    );
    const fix = sheetReport(entry("2026-10-19", "2026-10-25", "corrected"));
    expect(commitMessage(fix, sheetChanges([], [week("2026-10-19", "2026-10-25")]))).toBe(
      "fix(content): correct the service sheet for 19.–25. 10. 2026",
    );
    const refused = sheetReport(entry("2026-10-19", "2026-10-25", "refused"));
    expect(commitMessage(refused, sheetChanges([]))).toBeUndefined();
  });

  it("names a week across New Year", () => {
    const r = sheetReport(entry("2026-12-28", "2027-01-03", "created"));
    expect(commitMessage(r, sheetChanges([week("2026-12-28", "2027-01-03")]))).toBe(
      "feat(content): publish the service sheet for 28. 12. 2026–3. 1. 2027",
    );
  });

  it("names the one event the PR adds, or their number", () => {
    const one = [{ id: "hody", title: "Hody" }];
    const r = eventsReport(["Hody", "hody"]);
    expect(commitMessage(r, { kind: "events", added: one, changed: [] })).toBe("feat(content): add the Hody event");
    const two = [...one, { id: "pout", title: "Pouť" }];
    expect(commitMessage(r, { kind: "events", added: two, changed: [] })).toBe("feat(content): add 2 events");
    expect(commitMessage(r, { kind: "events", added: [], changed: one })).toBeUndefined();
  });
});

describe("fixCommitMessage", () => {
  it("names a fix commit from the fix's own changes", () => {
    const both = sheetChanges([week("2026-10-19", "2026-10-25")], [week("2026-10-12", "2026-10-18")]);
    expect(fixCommitMessage(both)).toBe(
      "fix(content): correct the service sheets for 12.–18. 10. and 19.–25. 10. 2026",
    );
    expect(fixCommitMessage(sheetChanges([], [week("2026-10-19", "2026-10-25")]))).toBe(
      "fix(content): correct the service sheet for 19.–25. 10. 2026",
    );
    const one = { id: "hody", title: "Hody" };
    expect(fixCommitMessage({ kind: "events", added: [], changed: [one] })).toBe(
      "fix(content): correct the Hody event",
    );
    expect(fixCommitMessage({ kind: "events", added: [one], changed: [{ id: "p", title: "P" }] })).toBe(
      "fix(content): correct 2 events",
    );
    expect(fixCommitMessage(sheetChanges([]))).toBeUndefined();
    expect(fixCommitMessage({ kind: "events", added: [], changed: [] })).toBeUndefined();
  });
});
