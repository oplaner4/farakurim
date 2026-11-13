import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { freshTempDir, testGit } from "../test-helpers";
import { commitlintAccepts, execute, parseCommand, type Command } from "./command";

describe("parseCommand", () => {
  it("reads each action", () => {
    expect(parseCommand(["apply", "--kind", "sheet", "r.md", "c.patch"])).toEqual({
      action: "apply",
      kind: "sheet",
      report: "r.md",
      patch: "c.patch",
    });
    expect(parseCommand(["patch", "--kind", "events", "c.patch"])).toEqual({
      action: "patch",
      kind: "events",
      patch: "c.patch",
    });
    expect(parseCommand(["body", "--kind", "events", "--run-url", "u", "--calendar", "cal.txt", "r.md"])).toEqual({
      action: "body",
      kind: "events",
      report: "r.md",
      runUrl: "u",
      calendar: "cal.txt",
      fix: false,
    });
    expect(parseCommand(["summary", "--kind", "sheet", "r.md"])).toEqual({
      action: "summary",
      kind: "sheet",
      report: "r.md",
    });
  });

  it("refuses a missing or unknown kind, a missing file and an unknown action", () => {
    expect(() => parseCommand(["apply", "r.md", "c.patch"])).toThrow("apply needs --kind");
    expect(() => parseCommand(["apply", "--kind", "albums", "r.md", "c.patch"])).toThrow(
      "--kind is not sheet or events",
    );
    expect(() => parseCommand(["apply", "--kind", "sheet", "r.md"])).toThrow("apply takes the report and the patch");
    expect(() => parseCommand(["body", "--kind", "sheet", "r.md"])).toThrow("body needs --run-url");
    expect(() => parseCommand(["publish"])).toThrow("Usage:");
  });
});

describe("execute", () => {
  const dir = freshTempDir("content-pr");

  function run(command: Command, lint = () => true, env: Record<string, string> = {}) {
    const out: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    const io = {
      cwd: join(dir(), "repo"),
      env,
      print: (l: string) => out.push(l),
      warn: (l: string) => warnings.push(l),
      lint,
      fail: (m: string) => errors.push(m),
    };
    return execute(command, io).then(() => ({ out, warnings, errors }));
  }

  /** A repo whose HEAD holds the sheet list `before`, and a patch changing it to `after`. */
  function repoWithPatch(before = "{}\n", after = '{"sheets":[]}\n'): string {
    const repo = join(dir(), "repo");
    mkdirSync(join(repo, "src/content"), { recursive: true });
    writeFileSync(join(repo, "src/content/service-sheets.json"), before);
    testGit(repo, "init", "-q");
    testGit(repo, "add", "-A");
    testGit(repo, "commit", "-q", "-m", "x");
    writeFileSync(join(repo, "src/content/service-sheets.json"), after);
    const patch = join(dir(), "content.patch");
    writeFileSync(patch, `${testGit(repo, "diff", "--binary", "HEAD")}\n`);
    testGit(repo, "checkout", "-q", "--", ".");
    return patch;
  }

  const report = (file: string, text: string) => {
    writeFileSync(join(dir(), file), text);
    return join(dir(), file);
  };

  it("applies a change and prints it with the report's commit message and draft state", async () => {
    const patch = repoWithPatch();
    const r = report("r.md", "blocking: yes\ncommit: feat(content): publish it\n\n## A\nOutcome: created\n");
    const { out, warnings } = await run({ action: "apply", kind: "sheet", report: r, patch });
    expect(JSON.parse(out[0])).toEqual({ changed: true, draft: true, message: "feat(content): publish it" });
    expect(warnings).toEqual([]);
    expect(testGit(join(dir(), "repo"), "status", "--porcelain")).toBe("M src/content/service-sheets.json");
  });

  /** A patch adding the week 19.–25. 10. 2026 to an empty sheet list. */
  function patchAddingWeek(): string {
    const week = { validFrom: "2026-10-19", validTo: "2026-10-25", days: [] };
    return repoWithPatch('{"sheets":[]}\n', `${JSON.stringify({ sheets: [week] })}\n`);
  }

  it("names the commit after the change, and makes a draft of an open blocking question with a warning", async () => {
    const patch = patchAddingWeek();
    const text = [
      "blocking: no",
      "commit: feat(content): publish a sheet",
      "",
      "## 19. – 25. 10. 2026",
      "Outcome: created",
      "",
      "### Questions",
      "- **q1** (blocking) Po 19. 10.: 8:00 or 8:30?",
    ].join("\n");
    const { out, warnings } = await run({ action: "apply", kind: "sheet", report: report("r.md", text), patch });
    expect(JSON.parse(out[0])).toEqual({
      changed: true,
      draft: true,
      message: "feat(content): publish the service sheet for 19.–25. 10. 2026",
    });
    expect(warnings).toEqual([
      "::warning::The report says `blocking: no`, but q1 is an open blocking question: a draft.",
    ]);
  });

  it("refuses and undoes a change the report does not give", async () => {
    const patch = patchAddingWeek();
    const r = report("r.md", "blocking: no\n\n## 12.–18. 10. 2026\nOutcome: corrected\n");
    await expect(run({ action: "apply", kind: "sheet", report: r, patch })).rejects.toThrow(
      "the change adds the week 19.–25. 10. 2026",
    );
    expect(testGit(join(dir(), "repo"), "status", "--porcelain")).toBe("");
  });

  it("falls back to the kind's default message when commitlint refuses the report's", async () => {
    const patch = repoWithPatch();
    const r = report("r.md", "blocking: no\ncommit: published it\n\n## A\nOutcome: corrected\n");
    const { out, warnings } = await run({ action: "apply", kind: "sheet", report: r, patch }, () => false);
    expect(JSON.parse(out[0])).toEqual({
      changed: true,
      draft: false,
      message: "feat(content): update the service sheets",
    });
    expect(warnings[0]).toMatch(/^::warning::/);
  });

  it("prints no change for a refused week without a patch, and refuses a missing report", async () => {
    const r = report("r.md", "blocking: no\ncommit: x\n\n## A\nOutcome: refused: overlaps\n");
    const none = join(dir(), "none.patch");
    const { out } = await run({ action: "apply", kind: "sheet", report: r, patch: none });
    expect(JSON.parse(out[0])).toEqual({ changed: false, draft: false });
    await expect(run({ action: "apply", kind: "sheet", report: join(dir(), "x.md"), patch: none })).rejects.toThrow(
      "lacks its first line",
    );
  });

  it("prints the body without the header lines, or a comment fix's body", async () => {
    const r = report("r.md", "blocking: no\ncommit: x\n\n## A\nOutcome: document error: a date\n");
    const { out } = await run({ action: "body", kind: "sheet", report: r, runUrl: "u", fix: false });
    expect(out[0]).toMatch(/^## A\nOutcome: document error: a date\n\n<!-- report-end -->/);
    const fixBody = report("body.md", "## A\n\nOutcome: corrected\n");
    const fixed = (await run({ action: "body", kind: "sheet", report: fixBody, runUrl: "u", fix: true })).out[0];
    expect(fixed).toMatch(/^## A\n\nOutcome: corrected\n\n<!-- report-end -->/);
    expect(fixed).toMatch(/; last correction: u$/);
  });

  it("prints the summary from the environment and fails when the maintainer must act", async () => {
    const r = report("r.md", "blocking: no\ncommit: x\n\n## A\nOutcome: document error: a date\n");
    const env = {
      FETCHED: "true",
      SUMMARY: '["2026-11-08 09:12: sheet (newest)"]',
      HANDLED: "/tmp/porad.docx",
      JOB_RESULT: "success",
      AGENT: "success",
      DOWNLOAD: "success",
      APPLY: "success",
      CHANGED: "false",
    };
    const { out, errors } = await run({ action: "summary", kind: "sheet", report: r }, undefined, env);
    expect(out[0]).toContain("- 2026-11-08 09:12: sheet (newest)\n\nNothing changed: no PR.");
    expect(out[0]).toContain("Weeks not published:\n- A: document error: a date");
    expect(errors).toHaveLength(1);
    const quiet = await run({ action: "summary", kind: "sheet", report: join(dir(), "x.md") }, undefined, {});
    expect(quiet.out[0]).toBe("## Service sheet\n\nThe mail could not be read.\n");
    expect(quiet.errors).toEqual([]);
  });
});

describe("commitlintAccepts", () => {
  it("checks a message with the repo's commitlint config", () => {
    expect(commitlintAccepts("feat(content): publish the service sheet for 19.–25. 10. 2026")).toBe(true);
    expect(commitlintAccepts("Published the sheet")).toBe(false);
  }, 30_000);
});
