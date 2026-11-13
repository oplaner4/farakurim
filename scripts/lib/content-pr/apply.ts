// Applies a content PR run's change: checks a comment fix's outcome against the patch, applies the patch (only the
// kind's content files), checks the final report's facts against the whole PR, writes the final report (and a fix's
// checked reply) and names the commit messages, each falling back to a default commitlint accepts.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Kind } from "../content-release/plan";
import { git } from "../git";
import {
  changesProblem,
  commitMessage,
  contentChanges,
  fixCommitMessage,
  mergeBase,
  type ContentChanges,
} from "./changes";
import { applyContentPatch, hasChange } from "./patch";
import { isDraft } from "./report";
import { readFix, readReport, type ReportInput } from "./report-files";

/** The commit messages when neither the change nor the agent gives one commitlint accepts. */
const DEFAULT_MESSAGES = {
  sheet: "feat(content): update the service sheets",
  events: "feat(content): add events",
} as const satisfies Record<Kind, string>;
const DEFAULT_FIX_MESSAGE = "fix(content): apply a comment correction";

/** What to apply: the report's input, the ref whose merge base the facts are checked against, the output folder. */
export type ApplyInput = ReportInput & { base: string; out: string; patch: string };

/** Where `applyReport` works and reports: the checkout, the printed result, the warnings and commitlint. */
export type ApplyIo = {
  cwd: string;
  print: (line: string) => void;
  warn: (line: string) => void;
  lint: (message: string) => boolean;
};

/** The first of `candidates` commitlint accepts, else `fallback`; warns for each one given and refused, and the default. */
function acceptedMessage(io: ApplyIo, what: string, candidates: (string | undefined)[], fallback: string): string {
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
export function applyReport(input: ApplyInput, io: ApplyIo): void {
  const { kind, patch } = input;
  const final = readReport(input);
  const fix = readFix(input.fix);
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
  const changes = contentChanges(io.cwd, kind, mergeBase(io.cwd, input.base));
  const problem = changesProblem(final, changes, changed);
  if (problem) {
    if (changed) git(io.cwd, "apply", "--reverse", patch);
    throw new Error(problem);
  }
  mkdirSync(input.out, { recursive: true });
  writeFileSync(join(input.out, "report.json"), `${JSON.stringify(final, null, 2)}\n`);
  // The reply as the schema checked it (no reply's marker): the only text of the agent's that is posted.
  if (fix) writeFileSync(join(input.out, "reply.md"), `${fix.reply.trimEnd()}\n`);
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
