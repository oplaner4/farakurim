// Content PR report fixtures for the script tests: questions, weeks, sheet reports and the agent's run reports, fix
// results.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ReportError, type Question, type WeekEntry } from "../content-pr/report-schema";
import { testGit } from "./files";

/** A content PR report's question, open unless `status` says otherwise. */
export const reportQuestion = (id: string, blocking: boolean, status: "open" | "resolved" = "open"): Question => ({
  id,
  blocking,
  status,
  where: "Po 19. 10.",
  text: "8:00 or 8:30?",
});

/** A sheet report's week from `validFrom` to `validTo` with its outcome and questions. */
export const reportWeek = (
  validFrom: string,
  validTo: string,
  outcome: WeekEntry["outcome"],
  questions: Question[] = [],
): WeekEntry => ({ validFrom, validTo, outcome, questions });

/** A full sheet report of `weeks`, with report-level `questions`. */
export const sheetReport = (weeks: WeekEntry[], questions: Question[] = []) => ({
  kind: "sheet",
  weeks,
  questions,
});

/** A question as the agent writes a new one: without its id and status, which the script sets. */
export const newQuestion = ({ id: _id, status: _status, ...question }: Question) => question;

/**
 * A sheet mail run's report as the agent writes it, of the one week `entry`: a published week without its dates and
 * outcome (the script takes them from the change), its questions new; with `extra` fields (questions, question updates).
 */
export function sheetRunReport({ validFrom, validTo, outcome, questions, ...rest }: WeekEntry, extra: object = {}) {
  const published = outcome.kind === "created" || outcome.kind === "corrected";
  const week = { ...(!published && { validFrom, validTo, outcome }), ...rest, questions: questions.map(newQuestion) };
  return { week, questions: [], questionUpdates: [], ...extra };
}

/** A comment fix's result. */
export const fixResult = (outcome: "changed" | "unchanged", fixMessage = "fix(content): move the Monday mass") => ({
  outcome,
  fixMessage,
  reply: "Done.",
});

/** The text of service-sheets.json holding `weeks`, each with no days. */
export const sheetList = (...weeks: { validFrom: string; validTo: string }[]) =>
  `${JSON.stringify({ sheets: weeks.map(({ validFrom, validTo }) => ({ validFrom, validTo, days: [] })) })}\n`;

/**
 * A git repo in `repo` whose `main` commits the sheet list `head` (a sheetList()) and whose working tree holds `tree`
 * (`head` without one); returns the list's path.
 */
export function sheetRepo(repo: string, head: string, tree = head): string {
  const file = join(repo, "src/content/service-sheets.json");
  mkdirSync(join(repo, "src/content"), { recursive: true });
  writeFileSync(file, head);
  testGit(repo, "init", "-q", "-b", "main");
  testGit(repo, "add", "-A");
  testGit(repo, "commit", "-q", "-m", "main");
  writeFileSync(file, tree);
  return file;
}

/** The issues of the ReportError `fn` throws, each `<path>: <message>`; fails when it throws none. */
export function issuesOf(fn: () => unknown): string[] {
  try {
    fn();
  } catch (error) {
    if (error instanceof ReportError) return error.issues;
    throw error;
  }
  throw new Error("did not throw");
}
