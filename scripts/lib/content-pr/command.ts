// Reads a content-pr command line and runs it: the checks between Claude's run and the commit of a content PR, on a
// fresh checkout in the working directory.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCommandLine } from "../command";
import { ROOT } from "../content-files";
import { KINDS, type Kind } from "../content-release/plan";
import { pullBody } from "./body";
import { applyContentPatch, hasChange } from "./patch";
import { checkReport, outcomeLines, parseMailReport, REPORT_RULES } from "./report";

const USAGE = `Usage: pnpm content-pr apply --kind <sheet|events> <report.md> <content.patch>
       pnpm content-pr patch --kind <sheet|events> <content.patch>
       pnpm content-pr body --kind <sheet|events> --run-url <url> [--calendar <file>] [--fix] <report.md>
       pnpm content-pr outcomes --kind <sheet|events> [--failed] <report.md>`;

export type Command =
  | { action: "apply"; kind: Kind; report: string; patch: string }
  | { action: "patch"; kind: Kind; patch: string }
  | { action: "body"; kind: Kind; report: string; runUrl: string; calendar?: string; fix: boolean }
  | { action: "outcomes"; kind: Kind; report: string; failed: boolean };

export function parseCommand(args: string[]): Command {
  const { values, positionals } = parseCommandLine(
    args,
    {
      kind: { type: "string" },
      "run-url": { type: "string" },
      calendar: { type: "string" },
      failed: { type: "boolean" },
      fix: { type: "boolean" },
    },
    USAGE,
  );
  const [action, ...files] = positionals;
  const takes = (...names: string[]) => {
    if (files.length !== names.length) throw new Error(`${action} takes ${names.join(" and ")}\n${USAGE}`);
  };
  const kind = (): Kind => {
    const value = values.kind;
    if (value === undefined) throw new Error(`${action} needs --kind\n${USAGE}`);
    if (!Object.hasOwn(KINDS, value)) throw new Error(`--kind is not ${Object.keys(KINDS).join(" or ")}\n${USAGE}`);
    return value as Kind;
  };
  switch (action) {
    case "apply":
      takes("the report", "the patch");
      return { action, kind: kind(), report: files[0], patch: files[1] };
    case "patch":
      takes("the patch");
      return { action, kind: kind(), patch: files[0] };
    case "body": {
      takes("the report");
      const runUrl = values["run-url"];
      if (!runUrl) throw new Error(`body needs --run-url\n${USAGE}`);
      const calendar = values.calendar ? { calendar: values.calendar } : {};
      return { action, kind: kind(), report: files[0], runUrl, ...calendar, fix: values.fix ?? false };
    }
    case "outcomes":
      takes("the report");
      return { action, kind: kind(), report: files[0], failed: values.failed ?? false };
    default:
      throw new Error(USAGE);
  }
}

/** The text of `file`, empty when it is missing (Claude's run may not have written the report). */
const readOrEmpty = (file: string) => (existsSync(file) ? readFileSync(file, "utf8") : "");

/** Whether commitlint accepts `message`, with the repo's config. */
export function commitlintAccepts(message: string): boolean {
  const bin = join(ROOT, "node_modules", ".bin", "commitlint");
  return spawnSync(bin, { cwd: ROOT, input: `${message}\n`, stdio: ["pipe", "ignore", "ignore"] }).status === 0;
}

type Io = { cwd: string; print: (line: string) => void; warn: (line: string) => void; lint: (m: string) => boolean };

const defaultIo: Io = {
  cwd: process.cwd(),
  print: (line) => console.log(line),
  warn: (line) => console.error(line),
  lint: commitlintAccepts,
};

/**
 * Runs the command. `apply` checks the report against the patch and applies it (only content files of the kind), and
 * prints `{ changed, draft, message }` as JSON; `patch` only applies; `body` prints the PR body (of a comment fix with `fix`); `outcomes` prints the
 * report's `- <item>: <outcome>` lines (with `--failed`, only the items not published).
 */
export async function execute(command: Command, io: Io = defaultIo): Promise<void> {
  switch (command.action) {
    case "apply": {
      const changed = hasChange(command.patch);
      const verdict = checkReport(command.kind, readOrEmpty(command.report), changed);
      if (changed) applyContentPatch(io.cwd, command.kind, command.patch);
      let message = verdict.commit;
      if (changed && (!message || !io.lint(message))) {
        io.warn("::warning::The report has no valid commit message: using the default.");
        message = REPORT_RULES[command.kind].defaultMessage;
      }
      io.print(JSON.stringify({ changed, draft: verdict.draft, ...(changed && { message }) }));
      return;
    }
    case "patch":
      applyContentPatch(io.cwd, command.kind, command.patch);
      return;
    case "body": {
      // A comment fix's report comes from `pnpm content-fix report` without its header lines.
      const text = readFileSync(command.report, "utf8");
      const report = command.fix ? text : parseMailReport(command.kind, text).body;
      const calendar = command.calendar ? readOrEmpty(command.calendar) : undefined;
      const { kind, runUrl, fix } = command;
      io.print(pullBody({ kind, report, runUrl, calendar, fix }).trimEnd());
      return;
    }
    case "outcomes":
      for (const line of outcomeLines(command.kind, readOrEmpty(command.report), { failed: command.failed })) {
        io.print(`- ${line}`);
      }
  }
}
