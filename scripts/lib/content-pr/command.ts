// Reads a content-pr command line and runs it: the checks between the agent's run and the commit of a content PR, on a
// fresh checkout in the working directory, all of them on the JSON report the agent writes.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCommandLine, readJsonRecord, requiredEnv } from "../command";
import { ROOT } from "../content-files";
import { KINDS, type Kind } from "../content-release/plan";
import { gitHubReader, type GitHubReader } from "../content-release/sources";
import { applyReport, type ApplyInput, type ApplyIo } from "./apply";
import { pullBody } from "./body";
import { renderReport } from "./render";
import { readFix, readReport, summaryReport, type ReportInput } from "./report-files";
import { parseReport } from "./report-schema";
import { storedReportOf } from "./stored";
import { runStateFromEnv, summarize, type Env } from "./summary";

const USAGE = `Usage: pnpm content-pr check --kind <sheet|events> [--run] [--previous <report.json>] [--fix <fix.json>] <report.json>
       pnpm content-pr stored --pr <n>
       pnpm content-pr apply --kind <sheet|events> --base <ref> --out <dir> [--run] [--previous <report.json>]
                             [--fix <fix.json>] <report.json> <content.patch>
       pnpm content-pr body --kind <sheet|events> --run-url <url> [--calendar <file>] [--fix] <report.json>
       pnpm content-pr summary --kind <sheet|events> <report.json>`;

export type Command =
  | ({ action: "check" } & ReportInput)
  | { action: "stored"; pr: number }
  | ({ action: "apply" } & ApplyInput)
  | { action: "body"; kind: Kind; report: string; runUrl: string; calendar?: string; fix: boolean }
  | { action: "summary"; kind: Kind; report: string };

const REPORT_OPTIONS = {
  kind: { type: "string" },
  run: { type: "boolean" },
  previous: { type: "string" },
  fix: { type: "string" },
} as const;

export function parseCommand(args: string[]): Command {
  const [action, ...rest] = args;
  const takes = (files: string[], ...names: string[]) => {
    if (files.length !== names.length) throw new Error(`${action} takes ${names.join(" and ")}\n${USAGE}`);
  };
  const kind = (value: string | undefined): Kind => {
    if (value === undefined) throw new Error(`${action} needs --kind\n${USAGE}`);
    if (!Object.hasOwn(KINDS, value)) throw new Error(`--kind is not ${Object.keys(KINDS).join(" or ")}\n${USAGE}`);
    return value as Kind;
  };
  const needs = (value: string | undefined, option: string): string => {
    if (!value) throw new Error(`${action} needs --${option}\n${USAGE}`);
    return value;
  };
  const reportInput = (
    values: { kind?: string; run?: boolean; previous?: string; fix?: string },
    report: string,
  ): ReportInput => {
    const input: ReportInput = { kind: kind(values.kind), report, run: values.run ?? false };
    if (input.run && input.kind !== "sheet") throw new Error(`--run takes --kind sheet\n${USAGE}`);
    if (values.previous !== undefined && !input.run) throw new Error(`--previous takes --run\n${USAGE}`);
    if (values.fix !== undefined && input.run) throw new Error(`--fix does not take --run\n${USAGE}`);
    return {
      ...input,
      ...(values.previous !== undefined && { previous: values.previous }),
      ...(values.fix !== undefined && { fix: values.fix }),
    };
  };
  switch (action) {
    case "check": {
      const { values, positionals } = parseCommandLine(rest, REPORT_OPTIONS, USAGE);
      takes(positionals, "the report");
      return { action, ...reportInput(values, positionals[0]) };
    }
    case "stored": {
      const { values, positionals } = parseCommandLine(rest, { pr: { type: "string" } }, USAGE);
      takes(positionals);
      const pr = needs(values.pr, "pr");
      if (!/^[1-9]\d*$/.test(pr)) throw new Error(`--pr is not a PR number\n${USAGE}`);
      return { action, pr: Number(pr) };
    }
    case "apply": {
      const options = { ...REPORT_OPTIONS, base: { type: "string" }, out: { type: "string" } } as const;
      const { values, positionals } = parseCommandLine(rest, options, USAGE);
      const input = reportInput(values, positionals[0]);
      takes(positionals, "the report", "the patch");
      const base = needs(values.base, "base");
      const out = needs(values.out, "out");
      return { action, base, out, ...input, patch: positionals[1] };
    }
    case "body": {
      const options = {
        kind: { type: "string" },
        "run-url": { type: "string" },
        calendar: { type: "string" },
        fix: { type: "boolean" },
      } as const;
      const { values, positionals } = parseCommandLine(rest, options, USAGE);
      takes(positionals, "the report");
      const runUrl = needs(values["run-url"], "run-url");
      const calendar = values.calendar ? { calendar: values.calendar } : {};
      return { action, kind: kind(values.kind), report: positionals[0], runUrl, ...calendar, fix: values.fix ?? false };
    }
    case "summary": {
      const { values, positionals } = parseCommandLine(rest, { kind: { type: "string" } }, USAGE);
      takes(positionals, "the report");
      return { action, kind: kind(values.kind), report: positionals[0] };
    }
    default:
      throw new Error(USAGE);
  }
}

/** Whether commitlint accepts `message`, with the repo's config. */
export function commitlintAccepts(message: string): boolean {
  const bin = join(ROOT, "node_modules", ".bin", "commitlint");
  return spawnSync(bin, { cwd: ROOT, input: `${message}\n`, stdio: ["pipe", "ignore", "ignore"] }).status === 0;
}

type Io = ApplyIo & {
  env: Env;
  /** Fails the command after its output, with an error annotation. */
  fail: (message: string) => void;
  /** The GitHub API of the repository the workflow runs for. */
  github: () => GitHubReader;
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
  github: () => gitHubReader(requiredEnv("GITHUB_REPOSITORY"), requiredEnv("GH_TOKEN")),
};

/**
 * Runs the command. `check` reads the report as `apply` does and says it is valid. `stored` prints the PR's newest
 * stored report artifact as `<runId> <name>` (nothing without one). `apply` reads the report (a sheet run's merged
 * into the previous one), checks a fix result's outcome against the patch, applies the patch (only content files of
 * the kind), checks the report's facts against the whole PR (`changesProblem` against the merge base with `base`,
 * undoing the patch on a mismatch), writes the final report to `<out>/report.json` (with `fix`, the checked reply to
 * `<out>/reply.md`) and prints
 * `{ changed, draft, message, fix? }` as JSON. `body` prints the PR body rendered from a final report (of a comment fix
 * with `fix`); `summary` prints the job summary from the step results in the environment (`runStateFromEnv`) and the
 * report, and fails when the maintainer must act without a PR.
 */
export async function execute(command: Command, io: Io = defaultIo): Promise<void> {
  switch (command.action) {
    case "check":
      readReport(command);
      readFix(command.fix);
      io.print("The report is valid.");
      return;
    case "stored": {
      const stored = await storedReportOf(command.pr, io.github());
      if (stored) io.print(`${stored.runId} ${stored.name}`);
      return;
    }
    case "apply":
      applyReport(command, io);
      return;
    case "body": {
      const report = renderReport(parseReport(command.kind, readJsonRecord(command.report)));
      const calendar =
        command.calendar && existsSync(command.calendar) ? readFileSync(command.calendar, "utf8") : undefined;
      const { kind, runUrl, fix } = command;
      io.print(pullBody({ kind, report, runUrl, calendar, fix }).trimEnd());
      return;
    }
    case "summary": {
      const report = summaryReport(command.kind, command.report);
      const { lines, error } = summarize(command.kind, runStateFromEnv(io.env), report);
      io.print(lines.join("\n"));
      if (error) io.fail(error);
    }
  }
}
