// Content PR report fixtures for the script tests: questions, weeks, sheet and run reports, fix results.

import type { Question, WeekEntry } from "../content-pr/report-schema";

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
): WeekEntry => ({ validFrom, validTo, outcome, summary: "Pořad bohoslužeb.", questions });

/** A full sheet report of `weeks`, with report-level `questions`. */
export const sheetReport = (weeks: WeekEntry[], questions: Question[] = []) => ({
  version: 1,
  kind: "sheet",
  weeks,
  questions,
});

/** A sheet mail run's report of the one week `entry`, with `extra` fields (questions, question updates). */
export const sheetRunReport = (entry: WeekEntry, extra: object = {}) => ({
  version: 1,
  kind: "sheet",
  week: entry,
  questions: [],
  questionUpdates: [],
  ...extra,
});

/** A comment fix's result. */
export const fixResult = (outcome: "changed" | "unchanged", fixMessage = "fix(content): move the Monday mass") => ({
  outcome,
  fixMessage,
  reply: "Done.",
});

/** The text of service-sheets.json holding `weeks`, each with no days. */
export const sheetList = (...weeks: { validFrom: string; validTo: string }[]) =>
  `${JSON.stringify({ sheets: weeks.map(({ validFrom, validTo }) => ({ validFrom, validTo, days: [] })) })}\n`;
