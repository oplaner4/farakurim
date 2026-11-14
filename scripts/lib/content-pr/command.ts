// Reads a content-pr command line and runs it: the checks between the agent's run and the commit of a content PR, on a
// fresh checkout in the working directory, all of them on the JSON report the agent writes.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCommandLine, readJsonRecord, requiredEnv, type Env } from "../command";
import { ROOT } from "../content-files";
import { KINDS, type Kind } from "../content-release/plan";
import { gitHubReader, type GitHubReader } from "../content-release/sources";
import { applyReport, type ApplyInput, type ApplyIo } from "./apply";
import { pullBody } from "./body";
import { mergeBase } from "./changes";
import { commentFromEnv, commentWriter, isStaged, type CommentWriter } from "./newer-week";
import { checkoutEventTitle, publishedContent } from "./published";
import { renderReport } from "./render";
import { checkFixReport } from "./fix-report";
import { readFix, readReport, summaryReport, type ReportInput } from "./report-files";
import { parseReport } from "./report-schema";
import { storedReportOf } from "./stored";
import { runStateFromEnv, summarize } from "./summary";

const USAGE = `Usage: pnpm content-pr check --kind <sheet|events>
                             [--run [--previous <report.json> | --known <known.json> --corrections <words.json>]]
                             [--fix <fix.json> --original <report.json>] <report.json>
       pnpm content-pr stored --pr <n>
       pnpm content-pr apply --kind <sheet|events> --base <ref> --out <dir>
                             [--run [--previous <report.json> | --known <known.json> --corrections <words.json>]]
                             [--fix <fix.json> --original <report.json>] <report.json> <content.patch>
       pnpm content-pr body --kind <sheet|events> --base <ref> --run-url <url> [--calendar <file>] [--fix] <report.json>
       pnpm content-pr summary --kind <sheet|events> <report.json>
       pnpm content-pr newer-week`;

export type Command =
  | ({ action: "check" } & ReportInput)
  | { action: "stored"; pr: number }
  | ({ action: "apply" } & ApplyInput)
  | { action: "body"; kind: Kind; base: string; report: string; runUrl: string; calendar?: string; fix: boolean }
  | { action: "summary"; kind: Kind; report: string }
  | { action: "newer-week" };

const REPORT_OPTIONS = {
  kind: { type: "string" },
  run: { type: "boolean" },
  previous: { type: "string" },
  known: { type: "string" },
  corrections: { type: "string" },
  fix: { type: "string" },
  original: { type: "string" },
} as const;

/** What is wrong with the options of a report `input`, if anything: each run option belongs to one kind of run. */
function reportOptionsProblem(
  { kind, run }: Pick<ReportInput, "kind" | "run">,
  values: { previous?: string; known?: string; corrections?: string; fix?: string; original?: string },
): string | undefined {
  if (values.previous !== undefined && !(run && kind === "sheet")) return "--previous takes --run and --kind sheet";
  const eventsRun = run && kind === "events";
  for (const option of ["known", "corrections"] as const) {
    if (eventsRun && values[option] === undefined) return `--run with --kind events needs --${option}`;
    if (!eventsRun && values[option] !== undefined) return `--${option} takes --run and --kind events`;
  }
  if (values.fix !== undefined && run) return "--fix does not take --run";
  if ((values.fix === undefined) !== (values.original === undefined)) return "--fix and --original go together";
  return undefined;
}

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
    values: {
      kind?: string;
      run?: boolean;
      previous?: string;
      known?: string;
      corrections?: string;
      fix?: string;
      original?: string;
    },
    report: string,
  ): ReportInput => {
    const input: ReportInput = { kind: kind(values.kind), report, run: values.run ?? false };
    const problem = reportOptionsProblem(input, values);
    if (problem) throw new Error(`${problem}\n${USAGE}`);
    return {
      ...input,
      ...(values.previous !== undefined && { previous: values.previous }),
      ...(values.known !== undefined && { known: values.known }),
      ...(values.corrections !== undefined && { corrections: values.corrections }),
      ...(values.fix !== undefined && { fix: values.fix, original: values.original }),
    };
  };
  switch (action) {
    case "check": {
      const { values, positionals } = parseCommandLine(rest, REPORT_OPTIONS, USAGE);
      takes(positionals, "the report");
      return { action, ...reportInput(values, positionals[0]) };
    }
    case "newer-week": {
      const { positionals } = parseCommandLine(rest, {}, USAGE);
      takes(positionals);
      return { action };
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
        base: { type: "string" },
        "run-url": { type: "string" },
        calendar: { type: "string" },
        fix: { type: "boolean" },
      } as const;
      const { values, positionals } = parseCommandLine(rest, options, USAGE);
      takes(positionals, "the report");
      const base = needs(values.base, "base");
      const runUrl = needs(values["run-url"], "run-url");
      const calendar = values.calendar ? { calendar: values.calendar } : {};
      const report = positionals[0];
      return { action, kind: kind(values.kind), base, report, runUrl, ...calendar, fix: values.fix ?? false };
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

/** A sheet run's report input with its stage runs' result file, STAGE_RESULT in `env`. */
function withStageResult<T extends ReportInput>(input: T, env: Env): T {
  const file = env.STAGE_RESULT;
  return input.run && input.kind === "sheet" && file ? { ...input, stageResult: file } : input;
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
  /** The PR comments of the repository the workflow runs for. */
  comments: () => CommentWriter;
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
  comments: () => commentWriter(requiredEnv("GITHUB_REPOSITORY"), requiredEnv("GH_TOKEN")),
};

/**
 * Runs the command. `check` reads the report as `apply` does (with `fix`, checked against the original report and the
 * working tree's change against HEAD) and says it is valid. `stored` prints the PR's newest
 * stored report artifact as `<runId> <name>` (nothing without one). `apply` reads the report (a sheet run's merged
 * into the previous one), checks a fix result's outcome against the patch, applies the patch (only content files of
 * the kind), checks the report's facts against the whole PR (`changesProblem` against the merge base with `base`,
 * undoing the patch on a mismatch), writes the final report to `<out>/report.json` (with `fix`, the checked reply to
 * `<out>/reply.md`) and prints
 * `{ changed, draft, message, fix? }` as JSON. `body` prints the PR body rendered from a final report (of a comment fix
 * with `fix`) and what the content in the working directory publishes against its merge base with `base`; `summary` prints the job summary from the step results in the environment (`runStateFromEnv`) and the
 * report, and fails when the maintainer must act without a PR. `newer-week` comments on the PR of PR_URL the DOCX's
 * newest week a sheet mail run left out (`newerWeekFromEnv`), unless the PR has that comment already.
 */
export async function execute(command: Command, io: Io = defaultIo): Promise<void> {
  switch (command.action) {
    case "check": {
      const report = readReport(withStageResult(command, io.env))(io.cwd);
      readFix(command.fix);
      if (command.original !== undefined) checkFixReport(io.cwd, report, command.original);
      io.print("The report is valid.");
      return;
    }
    case "stored": {
      const stored = await storedReportOf(command.pr, io.github());
      if (stored) io.print(`${stored.runId} ${stored.name}`);
      return;
    }
    case "apply":
      applyReport(withStageResult(command, io.env), io);
      return;
    case "body": {
      const published = publishedContent(io.cwd, mergeBase(io.cwd, command.base));
      const report = renderReport(parseReport(command.kind, readJsonRecord(command.report)), published);
      const calendar =
        command.calendar && existsSync(command.calendar) ? readFileSync(command.calendar, "utf8") : undefined;
      const { kind, runUrl, fix } = command;
      io.print(pullBody({ kind, report, runUrl, calendar, fix }).trimEnd());
      return;
    }
    case "summary": {
      const report = summaryReport(command.kind, command.report, io.env.STAGE_RESULT || undefined);
      const state = runStateFromEnv(io.env);
      const staged = state.newerWeek && isStaged(io.cwd, state.newerWeek.skipped);
      const eventTitle = checkoutEventTitle(io.cwd);
      const { lines, error } = summarize(command.kind, { ...state, newerWeekStaged: Boolean(staged) }, report, {
        eventTitle,
      });
      io.print(lines.join("\n"));
      if (error) io.fail(error);
      return;
    }
    case "newer-week":
      io.print(await commentFromEnv(io.comments(), io.env, io.cwd));
  }
}
