import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Artifact, GitHubReader } from "../content-release/sources";
import { freshTempDir, testGit } from "../test-helpers/files";
import { fixResult, reportQuestion, reportWeek, sheetList, sheetReport, sheetRunReport } from "../test-helpers/reports";
import { commitlintAccepts, execute, parseCommand, type Command } from "./command";

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
    expect(parseCommand(["check", "--kind", "sheet", "--fix", "f.json", "--original", "o.json", "r.json"])).toEqual({
      action: "check",
      kind: "sheet",
      report: "r.json",
      run: false,
      fix: "f.json",
      original: "o.json",
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
    expect(() => parseCommand(["check", "--kind", "sheet", "--fix", "f.json", "r.json"])).toThrow(
      "--fix and --original go together",
    );
    expect(() => parseCommand(["check", "--kind", "sheet", "--original", "o.json", "r.json"])).toThrow(
      "--fix and --original go together",
    );
    expect(() => parseCommand(["stored"])).toThrow("stored needs --pr");
    expect(() => parseCommand(["stored", "--pr", "x"])).toThrow("--pr is not a PR number");
    expect(() => parseCommand(["body", "--kind", "sheet", "r.json"])).toThrow("body needs --run-url");
    expect(() => parseCommand(["summary", "--kind", "sheet", "--run", "r.json"])).toThrow("Usage:");
    expect(() => parseCommand(["patch", "--kind", "sheet", "c.patch"])).toThrow("Usage:");
  });
});

const WEEK_19 = reportWeek("2026-10-19", "2026-10-25", { kind: "created" });

// The actions' own logic is tested beside its module (apply.test.ts, report-files.test.ts, render.test.ts,
// summary.test.ts, stored.test.ts); these check that each action is wired to it.
describe("execute", () => {
  const dir = freshTempDir("content-pr");
  const repo = () => join(dir(), "repo");

  function run(command: Command, { env = {}, github }: { env?: Record<string, string>; github?: GitHubReader } = {}) {
    const lines: string[] = [];
    const errors: string[] = [];
    const io = {
      cwd: repo(),
      env,
      print: (l: string) => lines.push(l),
      warn: () => {},
      lint: () => true,
      fail: (m: string) => errors.push(m),
      github: () => {
        if (!github) throw new Error("no GitHub in this test");
        return github;
      },
    };
    return execute(command, io).then(() => ({ out: lines, errors }));
  }

  const json = (file: string, value: unknown) => {
    writeFileSync(join(dir(), file), JSON.stringify(value));
    return join(dir(), file);
  };

  it("checks a report and says it is valid, or fails with its issue", async () => {
    const good = json("run.json", sheetRunReport(WEEK_19));
    const check = { action: "check", kind: "sheet", run: true } as const;
    expect((await run({ ...check, report: good })).out).toEqual(["The report is valid."]);
    const broken = json("broken.json", { ...sheetRunReport(WEEK_19), week: { ...WEEK_19, validTo: "2026-13-01" } });
    await expect(run({ ...check, report: broken })).rejects.toThrow("week.validTo:");
  });

  it("checks a fix's report against the original one", async () => {
    mkdirSync(repo(), { recursive: true });
    writeFileSync(join(repo(), "README.md"), "x");
    testGit(repo(), "init", "-q", "-b", "main");
    testGit(repo(), "add", "-A");
    testGit(repo(), "commit", "-q", "-m", "main");
    const asking = reportWeek("2026-10-19", "2026-10-25", { kind: "created" }, [reportQuestion("q1", true)]);
    const original = json("original.json", sheetReport([asking]));
    const fix = json("fix.json", fixResult("unchanged"));
    const check = { action: "check", kind: "sheet", run: false, fix, original } as const;
    expect((await run({ ...check, report: original })).out).toEqual(["The report is valid."]);
    const quieted = reportWeek("2026-10-19", "2026-10-25", { kind: "created" }, [reportQuestion("q1", false)]);
    const report = json("report.json", sheetReport([quieted]));
    await expect(run({ ...check, report })).rejects.toThrow("weeks.0.questions.0.blocking: may not change");
  });

  it("applies a run and prints its result", async () => {
    const file = join(repo(), "src/content/service-sheets.json");
    mkdirSync(join(repo(), "src/content"), { recursive: true });
    writeFileSync(file, sheetList());
    testGit(repo(), "init", "-q", "-b", "main");
    testGit(repo(), "add", "-A");
    testGit(repo(), "commit", "-q", "-m", "main");
    writeFileSync(file, sheetList(WEEK_19));
    const patch = join(dir(), "content.patch");
    writeFileSync(patch, `${testGit(repo(), "diff", "--binary", "HEAD")}\n`);
    testGit(repo(), "checkout", "-q", "--", ".");
    const report = json("run.json", sheetRunReport(WEEK_19));
    const out = join(dir(), "out");
    const command = { action: "apply", kind: "sheet", base: "main", out, run: true, report, patch } as const;
    expect(JSON.parse((await run(command)).out[0])).toEqual({
      changed: true,
      draft: false,
      message: "feat(content): publish the service sheet for 19.–25. 10. 2026",
    });
  });

  it("renders the body from report.json", async () => {
    const report = json("report.json", sheetReport([WEEK_19]));
    const { out: lines } = await run({ action: "body", kind: "sheet", report, runUrl: "u", fix: false });
    expect(lines[0]).toMatch(/^## 19\.–25\. 10\. 2026\nOutcome: created\n\nPořad bohoslužeb\.\n\n---\n/);
    expect(lines[0]).toMatch(/this run: u$/);
    const fixed = (await run({ action: "body", kind: "sheet", report, runUrl: "u", fix: true })).out[0];
    expect(fixed).toMatch(/last correction: u$/);
  });

  it("summarizes from the environment and the report, without failing on a missing one", async () => {
    const env = {
      FETCHED: "true",
      SUMMARY: '["2026-11-08 09:12: sheet (newest)"]',
      HANDLED: "/tmp/porad.docx",
      JOB_RESULT: "success",
      AGENT: "success",
      DOWNLOAD: "success",
      APPLY: "failure",
    };
    const refused = reportWeek("2026-10-19", "2026-10-25", { kind: "refused", reason: "overlaps" });
    const report = json("run.json", sheetRunReport(refused));
    const { out: lines } = await run({ action: "summary", kind: "sheet", report }, { env });
    expect(lines[0]).toContain("Weeks not published:\n- 19.–25. 10. 2026: refused: overlaps");
    const missing = await run({ action: "summary", kind: "sheet", report: join(dir(), "none.json") }, { env });
    expect(missing.out[0]).toContain("The change or the report was not accepted (see the log)");
    expect(missing.errors).toEqual([]);
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
