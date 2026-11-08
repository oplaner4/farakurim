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
    });
    expect(parseCommand(["outcomes", "--kind", "sheet", "--failed", "r.md"])).toEqual({
      action: "outcomes",
      kind: "sheet",
      report: "r.md",
      failed: true,
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

  function run(command: Command, lint = () => true) {
    const out: string[] = [];
    const warnings: string[] = [];
    const io = {
      cwd: join(dir(), "repo"),
      print: (l: string) => out.push(l),
      warn: (l: string) => warnings.push(l),
      lint,
    };
    return execute(command, io).then(() => ({ out, warnings }));
  }

  function repoWithPatch(): string {
    const repo = join(dir(), "repo");
    mkdirSync(join(repo, "src/content"), { recursive: true });
    writeFileSync(join(repo, "src/content/service-sheets.json"), "{}\n");
    testGit(repo, "init", "-q");
    testGit(repo, "add", "-A");
    testGit(repo, "commit", "-q", "-m", "x");
    writeFileSync(join(repo, "src/content/service-sheets.json"), '{"sheets":[]}\n');
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

  it("prints the body without the header lines, and the outcomes, nothing for a missing report", async () => {
    const r = report("r.md", "blocking: no\ncommit: x\n\n## A\nOutcome: document error: a date\n");
    const { out } = await run({ action: "body", kind: "sheet", report: r, runUrl: "u" });
    expect(out[0]).toMatch(/^## A\nOutcome: document error: a date\n\n<!-- report-end -->/);
    expect((await run({ action: "outcomes", kind: "sheet", report: r, failed: true })).out).toEqual([
      "- A: document error: a date",
    ]);
    expect((await run({ action: "outcomes", kind: "sheet", report: join(dir(), "x.md"), failed: false })).out).toEqual(
      [],
    );
  });
});

describe("commitlintAccepts", () => {
  it("checks a message with the repo's commitlint config", () => {
    expect(commitlintAccepts("feat(content): publish the service sheet for 19.–25. 10. 2026")).toBe(true);
    expect(commitlintAccepts("Published the sheet")).toBe(false);
  }, 30_000);
});
