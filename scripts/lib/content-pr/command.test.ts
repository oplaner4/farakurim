import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Artifact, GitHubReader } from "../content-release/sources";
import { freshTempDir, testGit, VENUE_LIST, venueRecord } from "../test-helpers";
import { commitlintAccepts, execute, parseCommand, type Command } from "./command";
import type { Question, WeekEntry } from "./report-schema";

describe("parseCommand", () => {
  it("parses each action", () => {
    expect(parseCommand(["check", "--kind", "events", "r.json"])).toEqual({
      action: "check",
      kind: "events",
      report: "r.json",
      run: false,
    });
    expect(parseCommand(["check", "--kind", "sheet", "--run", "--previous", "p.json", "r.json"])).toEqual({
      action: "check",
      kind: "sheet",
      report: "r.json",
      run: true,
      previous: "p.json",
    });
    expect(parseCommand(["check", "--kind", "sheet", "--fix", "f.json", "r.json"])).toEqual({
      action: "check",
      kind: "sheet",
      report: "r.json",
      run: false,
      fix: "f.json",
    });
    expect(parseCommand(["stored", "--pr", "12"])).toEqual({ action: "stored", pr: 12 });
    expect(
      parseCommand(["apply", "--kind", "sheet", "--base", "origin/main", "--out", "o", "--run", "r.json", "c.patch"]),
    ).toEqual({
      action: "apply",
      kind: "sheet",
      base: "origin/main",
      out: "o",
      report: "r.json",
      patch: "c.patch",
      run: true,
    });
    expect(parseCommand(["body", "--kind", "events", "--run-url", "u", "--calendar", "cal.txt", "r.json"])).toEqual({
      action: "body",
      kind: "events",
      report: "r.json",
      runUrl: "u",
      calendar: "cal.txt",
      fix: false,
    });
    expect(parseCommand(["body", "--kind", "sheet", "--fix", "--run-url", "u", "r.json"])).toMatchObject({ fix: true });
    expect(parseCommand(["summary", "--kind", "sheet", "r.json"])).toEqual({
      action: "summary",
      kind: "sheet",
      report: "r.json",
    });
  });

  it("refuses wrong arguments", () => {
    expect(() => parseCommand(["apply", "--base", "b", "--out", "o", "r.json", "c.patch"])).toThrow(
      "apply needs --kind",
    );
    expect(() => parseCommand(["check", "--kind", "albums", "r.json"])).toThrow("--kind is not sheet or events");
    expect(() => parseCommand(["apply", "--kind", "sheet", "--base", "b", "--out", "o", "r.json"])).toThrow(
      "apply takes the report and the patch",
    );
    expect(() => parseCommand(["apply", "--kind", "sheet", "--out", "o", "r.json", "c.patch"])).toThrow(
      "apply needs --base",
    );
    expect(() => parseCommand(["apply", "--kind", "sheet", "--base", "b", "r.json", "c.patch"])).toThrow(
      "apply needs --out",
    );
    expect(() => parseCommand(["check", "--kind", "events", "--run", "r.json"])).toThrow("--run takes --kind sheet");
    expect(() => parseCommand(["check", "--kind", "sheet", "--previous", "p.json", "r.json"])).toThrow(
      "--previous takes --run",
    );
    expect(() => parseCommand(["check", "--kind", "sheet", "--run", "--fix", "f.json", "r.json"])).toThrow(
      "--fix does not take --run",
    );
    expect(() => parseCommand(["stored"])).toThrow("stored needs --pr");
    expect(() => parseCommand(["stored", "--pr", "x"])).toThrow("--pr is not a PR number");
    expect(() => parseCommand(["body", "--kind", "sheet", "r.json"])).toThrow("body needs --run-url");
    expect(() => parseCommand(["summary", "--kind", "sheet", "--run", "r.json"])).toThrow("Usage:");
    expect(() => parseCommand(["patch", "--kind", "sheet", "c.patch"])).toThrow("Usage:");
  });
});

const question = (id: string, blocking: boolean, status: "open" | "resolved" = "open"): Question => ({
  id,
  blocking,
  status,
  where: "Po 19. 10.",
  text: "8:00 or 8:30?",
});

const week = (validFrom: string, validTo: string, outcome: WeekEntry["outcome"], questions: Question[] = []) => ({
  validFrom,
  validTo,
  outcome,
  summary: "Pořad bohoslužeb.",
  questions,
});

const WEEK_12 = week("2026-10-12", "2026-10-18", { kind: "created" });
const WEEK_19 = week("2026-10-19", "2026-10-25", { kind: "created" });

const sheetReport = (weeks: WeekEntry[], questions: Question[] = []) => ({
  version: 1,
  kind: "sheet",
  weeks,
  questions,
});
const runReport = (entry: WeekEntry, extra: object = {}) => ({
  version: 1,
  kind: "sheet",
  week: entry,
  questions: [],
  questionUpdates: [],
  ...extra,
});
const fixResult = (outcome: "changed" | "unchanged", fixMessage = "fix(content): move the Monday mass") => ({
  version: 1,
  outcome,
  fixMessage,
  reply: "Done.",
});

const sheets = (...weeks: { validFrom: string; validTo: string }[]) =>
  `${JSON.stringify({ sheets: weeks.map(({ validFrom, validTo }) => ({ validFrom, validTo, days: [] })) })}\n`;

describe("execute", () => {
  const dir = freshTempDir("content-pr");
  const repo = () => join(dir(), "repo");
  const out = () => join(dir(), "out");

  function run(
    command: Command,
    {
      lint = () => true,
      env = {},
      github,
    }: { lint?: (m: string) => boolean; env?: Record<string, string>; github?: GitHubReader } = {},
  ) {
    const lines: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    const io = {
      cwd: repo(),
      env,
      print: (l: string) => lines.push(l),
      warn: (l: string) => warnings.push(l),
      lint,
      fail: (m: string) => errors.push(m),
      github: () => {
        if (!github) throw new Error("no GitHub in this test");
        return github;
      },
    };
    return execute(command, io).then(() => ({ out: lines, warnings, errors }));
  }

  /**
   * A repo whose `main` holds the sheet list `main` and whose checked-out PR branch holds `pr`, and a patch changing
   * the PR branch's list to `patched` (no patch file without it).
   */
  function prRepo(main: string, pr: string, patched?: string): string {
    const file = join(repo(), "src/content/service-sheets.json");
    mkdirSync(join(repo(), "src/content"), { recursive: true });
    writeFileSync(file, main);
    testGit(repo(), "init", "-q", "-b", "main");
    testGit(repo(), "add", "-A");
    testGit(repo(), "commit", "-q", "-m", "main");
    testGit(repo(), "checkout", "-q", "-b", "pr");
    writeFileSync(file, pr);
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

  const written = () => JSON.parse(readFileSync(join(out(), "report.json"), "utf8")) as unknown;

  it("checks a run report against the previous one", async () => {
    const previous = json("previous.json", sheetReport([WEEK_12], [question("q1", true)]));
    const good = json("run.json", runReport(WEEK_19, { questionUpdates: [{ id: "q1", status: "resolved" }] }));
    const check = { action: "check", kind: "sheet", run: true, previous } as const;
    expect((await run({ ...check, report: good })).out).toEqual(["The report is valid."]);
    const unknown = json("bad.json", runReport(WEEK_19, { questionUpdates: [{ id: "q7", status: "resolved" }] }));
    await expect(run({ ...check, report: unknown })).rejects.toThrow("question q7 to update is not in the report");
    const broken = json("broken.json", { ...runReport(WEEK_19), week: { ...WEEK_19, validTo: "2026-13-01" } });
    await expect(run({ ...check, report: broken })).rejects.toThrow("week.validTo:");
    await expect(run({ action: "check", kind: "events", run: false, report: good })).rejects.toThrow("kind:");
  });

  it("applies a sheet run, merges it and names the commit", async () => {
    const patch = prRepo(sheets(), sheets(WEEK_12), sheets(WEEK_12, WEEK_19));
    const previous = json("previous.json", sheetReport([WEEK_12]));
    const report = json("run.json", runReport(WEEK_19));
    const command = { action: "apply", kind: "sheet", base: "main", out: out(), run: true, previous, report, patch };
    const { out: lines, warnings } = await run(command as Command);
    expect(JSON.parse(lines[0])).toEqual({
      changed: true,
      draft: false,
      message: "feat(content): publish the service sheets for 12.–18. 10. and 19.–25. 10. 2026",
    });
    expect(warnings).toEqual([]);
    expect(written()).toEqual(sheetReport([WEEK_12, WEEK_19]));
    expect(testGit(repo(), "status", "--porcelain")).toBe("M src/content/service-sheets.json");
  });

  it("makes a draft of an open blocking question", async () => {
    const patch = prRepo(sheets(), sheets(), sheets(WEEK_19));
    const report = json(
      "run.json",
      runReport(week("2026-10-19", "2026-10-25", { kind: "created" }, [question("q1", true)])),
    );
    const command = { action: "apply", kind: "sheet", base: "main", out: out(), run: true, report, patch } as const;
    expect(JSON.parse((await run(command)).out[0])).toEqual({
      changed: true,
      draft: true,
      message: "feat(content): publish the service sheet for 19.–25. 10. 2026",
    });
  });

  it('fails with "close and resend" on a previous report of another version', async () => {
    const patch = prRepo(sheets(), sheets(WEEK_12), sheets(WEEK_12, WEEK_19));
    const previous = json("previous.json", { ...sheetReport([WEEK_12]), version: 2 });
    const report = json("run.json", runReport(WEEK_19));
    const command = { action: "apply", kind: "sheet", base: "main", out: out(), run: true, previous, report, patch };
    await expect(run(command as Command)).rejects.toThrow(
      "The PR's report is missing or from another version: close the PR and send the sheet or event again.",
    );
    const missing = { ...command, previous: join(dir(), "none.json") };
    await expect(run(missing as Command)).rejects.toThrow("close the PR and send the sheet or event again");
    expect(testGit(repo(), "status", "--porcelain")).toBe("");
    expect(existsSync(join(out(), "report.json"))).toBe(false);
  });

  it("undoes a change the report does not give", async () => {
    const patch = prRepo(sheets(), sheets(), sheets(WEEK_19));
    const report = json("run.json", runReport(week("2026-10-12", "2026-10-18", { kind: "corrected" })));
    const command = { action: "apply", kind: "sheet", base: "main", out: out(), run: true, report, patch } as const;
    await expect(run(command)).rejects.toThrow(
      "the change holds the week 19.–25. 10. 2026, which the report does not give",
    );
    expect(testGit(repo(), "status", "--porcelain")).toBe("");
    expect(existsSync(join(out(), "report.json"))).toBe(false);
  });

  it("undoes a change when the report creates nothing", async () => {
    // An events PR whose patch only adds a venue, while every event is refused.
    const venues = join(repo(), "src/content/venues.json");
    mkdirSync(join(repo(), "src/content/news"), { recursive: true });
    writeFileSync(venues, `${JSON.stringify({ venues: VENUE_LIST })}\n`);
    testGit(repo(), "init", "-q", "-b", "main");
    testGit(repo(), "config", "core.autocrlf", "false");
    testGit(repo(), "add", "-A");
    testGit(repo(), "commit", "-q", "-m", "main");
    writeFileSync(
      venues,
      `${JSON.stringify({ venues: [...VENUE_LIST, venueRecord("ceska-sokolovna", "Sokolovna", "Česká")] })}\n`,
    );
    const patch = join(dir(), "content.patch");
    writeFileSync(patch, `${testGit(repo(), "diff", "--binary", "HEAD")}\n`);
    testGit(repo(), "checkout", "-q", "--", ".");
    const report = json("report.json", {
      version: 1,
      kind: "events",
      events: [{ title: "Koncert", outcome: { kind: "refused", reason: "past" }, venues: [], questions: [] }],
      questions: [],
      droppedAttachments: [],
    });
    const command = { action: "apply", kind: "events", base: "main", out: out(), run: false, report, patch } as const;
    await expect(run(command)).rejects.toThrow("The report creates nothing, but the change is not empty: not applied.");
    expect(testGit(repo(), "status", "--porcelain")).toBe("");
    expect(existsSync(join(out(), "report.json"))).toBe(false);
  });

  it("names no commit and warns nothing when nothing changed and there is no fix", async () => {
    const none = prRepo(sheets(), sheets());
    const refused = week("2026-10-19", "2026-10-25", { kind: "refused", reason: "overlaps" });
    const report = json("run.json", runReport(refused));
    const command = {
      action: "apply",
      kind: "sheet",
      base: "main",
      out: out(),
      run: true,
      report,
      patch: none,
    } as const;
    const { out: lines, warnings } = await run(command, { lint: () => false });
    expect(JSON.parse(lines[0])).toEqual({
      changed: false,
      draft: false,
      message: "feat(content): update the service sheets",
    });
    expect(warnings).toEqual([]);
    expect(existsSync(join(out(), "reply.md"))).toBe(false);
  });

  it("accepts a fix that only answers a question (no patch) and keeps the PR's facts", async () => {
    const none = prRepo(sheets(), sheets(WEEK_19));
    const answered = week("2026-10-19", "2026-10-25", { kind: "created" }, [question("q1", true, "resolved")]);
    const report = json("report.json", sheetReport([answered]));
    const fix = json("fix.json", fixResult("unchanged"));
    const command = { action: "apply", kind: "sheet", base: "main", out: out(), run: false, fix, report, patch: none };
    const { out: lines } = await run(command as Command);
    expect(JSON.parse(lines[0])).toEqual({
      changed: false,
      draft: false,
      message: "feat(content): publish the service sheet for 19.–25. 10. 2026",
    });
    expect(written()).toEqual(sheetReport([answered]));
    expect(readFileSync(join(out(), "reply.md"), "utf8")).toBe("Done.\n");
    // The same fix whose report drops the PR's week fails the fact check.
    const dropped = json("dropped.json", sheetReport([]));
    await expect(run({ ...command, report: dropped } as Command)).rejects.toThrow(
      "the change holds the week 19.–25. 10. 2026, which the report does not give",
    );
  });

  it("refuses a fix whose outcome disagrees with the patch", async () => {
    const none = prRepo(sheets(), sheets(WEEK_19));
    const report = json("report.json", sheetReport([WEEK_19]));
    const fix = json("fix.json", fixResult("changed"));
    const command = { action: "apply", kind: "sheet", base: "main", out: out(), run: false, fix, report, patch: none };
    await expect(run(command as Command)).rejects.toThrow("The fix result says changed, but the patch changes nothing");
    const patch = join(dir(), "some.patch");
    writeFileSync(patch, "diff\n");
    const unchanged = { ...command, fix: json("unchanged.json", fixResult("unchanged")), patch };
    await expect(run(unchanged as Command)).rejects.toThrow(
      "The fix result says unchanged, but the patch changes the content",
    );
  });

  it("falls back to the default messages when commitlint refuses", async () => {
    const changedWeek = { validFrom: "2026-10-19", validTo: "2026-10-25", days: [{ date: "2026-10-19" }] };
    const patch = prRepo(sheets(), sheets(WEEK_19), `${JSON.stringify({ sheets: [changedWeek] })}\n`);
    const report = json("report.json", sheetReport([WEEK_19]));
    const fix = json("fix.json", fixResult("changed", "fixed it"));
    const command = { action: "apply", kind: "sheet", base: "main", out: out(), run: false, fix, report, patch };
    const { out: lines, warnings } = await run(command as Command, { lint: () => false });
    expect(JSON.parse(lines[0])).toEqual({
      changed: true,
      draft: false,
      message: "feat(content): update the service sheets",
      fix: "fix(content): apply a comment correction",
    });
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.every((w) => w.startsWith("::warning::"))).toBe(true);
    // A refused fix message falls back to the one the fix's change names.
    testGit(repo(), "checkout", "-q", "--", ".");
    const named = await run(command as Command, { lint: (m) => m !== "fixed it" });
    expect(JSON.parse(named.out[0])).toEqual({
      changed: true,
      draft: false,
      message: "feat(content): publish the service sheet for 19.–25. 10. 2026",
      fix: "fix(content): correct the service sheet for 19.–25. 10. 2026",
    });
    expect(named.warnings).toHaveLength(1);
  });

  it("renders the body from report.json", async () => {
    const report = json("report.json", sheetReport([WEEK_19]));
    const { out: lines } = await run({ action: "body", kind: "sheet", report, runUrl: "u", fix: false });
    expect(lines[0]).toMatch(/^## 19\.–25\. 10\. 2026\nOutcome: created\n\nPořad bohoslužeb\.\n\n---\n/);
    expect(lines[0]).toMatch(/this run: u$/);
    const fixed = (await run({ action: "body", kind: "sheet", report, runUrl: "u", fix: true })).out[0];
    expect(fixed).toMatch(/last correction: u$/);
  });

  const SUMMARY_ENV = {
    FETCHED: "true",
    SUMMARY: '["2026-11-08 09:12: sheet (newest)"]',
    HANDLED: "/tmp/porad.docx",
    JOB_RESULT: "success",
    AGENT: "success",
    DOWNLOAD: "success",
    APPLY: "failure",
  };

  it("summarizes without a report", async () => {
    const { out: lines, errors } = await run(
      { action: "summary", kind: "sheet", report: join(dir(), "none.json") },
      { env: SUMMARY_ENV },
    );
    expect(lines[0]).toContain("The change or the report was not accepted (see the log)");
    expect(lines[0]).not.toContain("Weeks not published");
    expect(errors).toEqual([]);
    const quiet = await run({ action: "summary", kind: "sheet", report: json("bad.json", { version: 2 }) });
    expect(quiet.out[0]).toBe("## Service sheet\n\nThe mail could not be read.\n");
  });

  it("summarizes the agent's run report when apply failed", async () => {
    const refused = week("2026-10-19", "2026-10-25", { kind: "refused", reason: "overlaps" });
    const report = json("run.json", runReport(refused));
    const { out: lines } = await run({ action: "summary", kind: "sheet", report }, { env: SUMMARY_ENV });
    expect(lines[0]).toContain("Weeks not published:\n- 19.–25. 10. 2026: refused: overlaps");
  });

  it("prints the PR's stored report, or nothing", async () => {
    const artifacts: Artifact[] = [{ name: "content-report-b2", runId: 20, expired: false, trusted: true }];
    const github: GitHubReader = {
      pullsOfCommit: async () => [],
      commitsOfPull: async () => [
        { sha: "a1", bot: true },
        { sha: "b2", bot: true },
      ],
      artifactsNamed: async (name) => artifacts.filter((a) => a.name === name),
    };
    expect((await run({ action: "stored", pr: 7 }, { github })).out).toEqual(["20 content-report-b2"]);
    artifacts.length = 0;
    expect((await run({ action: "stored", pr: 7 }, { github })).out).toEqual([]);
  });
});

describe("commitlintAccepts", () => {
  it("checks a message with the repo's commitlint config", () => {
    expect(commitlintAccepts("feat(content): publish the service sheet for 19.–25. 10. 2026")).toBe(true);
    expect(commitlintAccepts("Published the sheet")).toBe(false);
  }, 30_000);
});
