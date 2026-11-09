// Reads a content-pr command line and runs it: the checks between the agent's run and the commit of a content PR, on a
// fresh checkout in the working directory.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCommandLine } from "../command";
import { ROOT } from "../content-files";
import { KINDS, type Kind } from "../content-release/plan";
import { pullBody } from "./body";
import { applyContentPatch, hasChange } from "./patch";
import { checkReport, parseMailReport, REPORT_RULES } from "./report";
import { runStateFromEnv, summarize, type Env } from "./summary";

const USAGE = `Usage: pnpm content-pr apply --kind <sheet|events> <report.md> <content.patch>
       pnpm content-pr patch --kind <sheet|events> <content.patch>
       pnpm content-pr body --kind <sheet|events> --run-url <url> [--calendar <file>] [--fix] <report.md>
       pnpm content-pr summary --kind <sheet|events> <report.md>`;

export type Command =
  | { action: "apply"; kind: Kind; report: string; patch: string }
  | { action: "patch"; kind: Kind; patch: string }
  | { action: "body"; kind: Kind; report: string; runUrl: string; calendar?: string; fix: boolean }
  | { action: "summary"; kind: Kind; report: string };

export function parseCommand(args: string[]): Command {
  const { values, positionals } = parseCommandLine(
    args,
    {
      kind: { type: "string" },
      "run-url": { type: "string" },
      calendar: { type: "string" },
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
    case "summary":
      takes("the report");
      return { action, kind: kind(), report: files[0] };
    default:
      throw new Error(USAGE);
  }
}

/** The text of `file`, empty when it is missing (the agent's run may not have written the report). */
const readOrEmpty = (file: string) => (existsSync(file) ? readFileSync(file, "utf8") : "");

/** Whether commitlint accepts `message`, with the repo's config. */
export function commitlintAccepts(message: string): boolean {
  const bin = join(ROOT, "node_modules", ".bin", "commitlint");
  return spawnSync(bin, { cwd: ROOT, input: `${message}\n`, stdio: ["pipe", "ignore", "ignore"] }).status === 0;
}

type Io = {
  cwd: string;
  env: Env;
  print: (line: string) => void;
  warn: (line: string) => void;
  lint: (message: string) => boolean;
  /** Fails the command after its output, with an error annotation. */
  fail: (message: string) => void;
};

const defaultIo: Io = {
  cwd: process.cwd(),
  env: process.env,
  print: (line) => console.log(line),
  warn: (line) => console.error(line),
  lint: commitlintAccepts,
  fail: (message) => {
    console.error(`::error::${message}`);
    process.exitCode = 1;
  },
};

/**
 * Runs the command. `apply` checks the report against the patch and applies it (only content files of the kind), and
 * prints `{ changed, draft, message }` as JSON; `patch` only applies; `body` prints the PR body (of a comment fix with `fix`); `summary` prints the
 * job summary from the step results in the environment (`runStateFromEnv`) and the report, and fails when the
 * maintainer must act without a PR.
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
    case "summary": {
      const { lines, error } = summarize(command.kind, runStateFromEnv(io.env), readOrEmpty(command.report));
      io.print(lines.join("\n"));
      if (error) io.fail(error);
    }
  }
}
