// Reads a content-pr command line and runs it: the checks between the agent's run and the commit of a content PR, on a
// fresh checkout in the working directory, all of them on the JSON report the agent writes.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseCommandLine, readJsonRecord, requiredEnv } from "../command";
import { ROOT } from "../content-files";
import { KINDS, type Kind } from "../content-release/plan";
import { gitHubReader, type GitHubReader } from "../content-release/sources";
import { git } from "../git";
import { pullBody } from "./body";
import {
  changesProblem,
  commitMessage,
  contentChanges,
  fixCommitMessage,
  mergeBase,
  type ContentChanges,
} from "./changes";
import { mergeSheetReport } from "./merge";
import { applyContentPatch, hasChange } from "./patch";
import { renderReport } from "./render";
import { isDraft } from "./report";
import {
  parseFixResult,
  parseReport,
  parseSheetReport,
  parseSheetRunReport,
  type FixResult,
  type Report,
  type SheetReport,
} from "./report-schema";
import { storedReportOf } from "./stored";
import { runStateFromEnv, summarize, type Env } from "./summary";

const USAGE = `Usage: pnpm content-pr check --kind <sheet|events> [--run] [--previous <report.json>] [--fix <fix.json>] <report.json>
       pnpm content-pr stored --pr <n>
       pnpm content-pr apply --kind <sheet|events> --base <ref> --out <dir> [--run] [--previous <report.json>]
                             [--fix <fix.json>] <report.json> <content.patch>
       pnpm content-pr body --kind <sheet|events> --run-url <url> [--calendar <file>] [--fix] <report.json>
       pnpm content-pr summary --kind <sheet|events> <report.json>`;

/** The message of a PR whose report or previous report cannot be read: it cannot be continued. */
const RESEND = "The PR's report is missing or from another version: close the PR and send the sheet or event again.";

/** The commit messages when neither the change nor the agent gives one commitlint accepts. */
const DEFAULT_MESSAGES = {
  sheet: "feat(content): update the service sheets",
  events: "feat(content): add events",
} as const satisfies Record<Kind, string>;
const DEFAULT_FIX_MESSAGE = "fix(content): apply a comment correction";

/** Where the report comes from: a full report, or (`run`) a sheet mail run's merged into `previous`; `fix` a fix result. */
type ReportInput = { kind: Kind; report: string; run: boolean; previous?: string; fix?: string };

export type Command =
  | ({ action: "check" } & ReportInput)
  | { action: "stored"; pr: number }
  | ({ action: "apply"; base: string; out: string; patch: string } & ReportInput)
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

type Io = {
  cwd: string;
  env: Env;
  print: (line: string) => void;
  warn: (line: string) => void;
  lint: (message: string) => boolean;
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

/** The PR's previous sheet report; one that is missing, unreadable or of another version cannot be continued. */
function readPrevious(file: string): SheetReport {
  try {
    return parseSheetReport(JSON.parse(readFileSync(file, "utf8")));
  } catch {
    throw new Error(RESEND);
  }
}

/** The full report the input gives: a sheet run's merged into the previous report, or the report as written. */
function readReport({ kind, report, run, previous }: ReportInput): Report {
  const value = readJsonRecord(report);
  if (!run) return parseReport(kind, value);
  const before = previous === undefined ? undefined : readPrevious(previous);
  return mergeSheetReport(before, parseSheetRunReport(value));
}

const readFix = (file: string | undefined): FixResult | undefined =>
  file === undefined ? undefined : parseFixResult(readJsonRecord(file));

/** The report for the job summary: a full one, else a sheet run's on its own, else none. */
function summaryReport(kind: Kind, file: string): Report | undefined {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return undefined;
  }
  try {
    return parseReport(kind, value);
  } catch {
    if (kind !== "sheet") return undefined;
  }
  try {
    return mergeSheetReport(undefined, parseSheetRunReport(value));
  } catch {
    return undefined;
  }
}

/** The first of `candidates` commitlint accepts, else `fallback`; warns for each one given and refused, and the default. */
function acceptedMessage(io: Io, what: string, candidates: (string | undefined)[], fallback: string): string {
  for (const message of candidates) {
    if (message === undefined) continue;
    if (io.lint(message)) return message;
    io.warn(`::warning::commitlint refuses the ${what} message "${message}".`);
  }
  io.warn(`::warning::No valid ${what} message: using the default "${fallback}".`);
  return fallback;
}

/**
 * Applies the patch after checking a fix result's outcome against it, checks the final report against the whole PR
 * (undoing the patch on a mismatch, or when it changes something and the report publishes nothing), writes
 * `<out>/report.json` (and a fix result's reply to `<out>/reply.md`) and prints `{ changed, draft, message, fix? }`.
 */
function applyReport(command: Extract<Command, { action: "apply" }>, io: Io): void {
  const { kind, patch } = command;
  const final = readReport(command);
  const fix = readFix(command.fix);
  const changed = hasChange(patch);
  if (fix && (fix.outcome === "changed") !== changed) {
    const what = changed ? "the patch changes the content" : "the patch changes nothing";
    throw new Error(`The fix result says ${fix.outcome}, but ${what}: not applied.`);
  }
  let fixChanges: ContentChanges | undefined;
  if (changed) {
    applyContentPatch(io.cwd, kind, patch);
    // What the fix alone changed: the working tree against the PR's head.
    if (fix) fixChanges = contentChanges(io.cwd, kind, "HEAD");
  }
  const changes = contentChanges(io.cwd, kind, mergeBase(io.cwd, command.base));
  const problem = changesProblem(final, changes, changed);
  if (problem) {
    if (changed) git(io.cwd, "apply", "--reverse", patch);
    throw new Error(problem);
  }
  mkdirSync(command.out, { recursive: true });
  writeFileSync(join(command.out, "report.json"), `${JSON.stringify(final, null, 2)}\n`);
  // The reply as the schema checked it (no reply's marker): the only text of the agent's that is posted.
  if (fix) writeFileSync(join(command.out, "reply.md"), `${fix.reply.trimEnd()}\n`);
  // Nothing to commit and no PR to title: the default, without a warning.
  const message =
    changed || fix
      ? acceptedMessage(io, "commit", [commitMessage(final, changes)], DEFAULT_MESSAGES[kind])
      : DEFAULT_MESSAGES[kind];
  const fixMessage =
    fix && fixChanges
      ? acceptedMessage(io, "fix", [fix.fixMessage, fixCommitMessage(fixChanges)], DEFAULT_FIX_MESSAGE)
      : undefined;
  io.print(JSON.stringify({ changed, draft: isDraft(final), message, ...(fixMessage && { fix: fixMessage }) }));
}

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
