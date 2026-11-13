// Queries on the JSON report the agent writes in a mail workflow (service sheet, events): its questions, whether it is
// a draft, the label of each item (a week, an event) and what became of each.

import type { EventOutcome, Question, Report, WeekOutcome } from "./report-schema";
import { formatWeeks } from "./weeks";

/** The report's questions: its own, then each item's, in order. */
export function allQuestions(report: Report): Question[] {
  const items = report.kind === "sheet" ? report.weeks : report.events;
  return [...report.questions, ...items.flatMap((item) => item.questions)];
}

/** The ids of the open questions that block publishing. */
export function openBlockingIds(report: Report): string[] {
  return allQuestions(report)
    .filter((question) => question.blocking && question.status === "open")
    .map((question) => question.id);
}

/** Whether the report is a draft: an open blocking question holds the change back. */
export const isDraft = (report: Report): boolean => openBlockingIds(report).length > 0;

/** The item's name: the week's dates (`19.–25. 10. 2026`) or the event's title. */
export function itemLabel(report: Report, index: number): string {
  if (report.kind === "events") return report.events[index].title;
  const { validFrom, validTo } = report.weeks[index];
  return formatWeeks([{ validFrom, validTo }]);
}

/** What an outcome says: `created`, `corrected`, `refused: <reason>` or `document error: <reason>`. */
export function outcomeText(outcome: WeekOutcome | EventOutcome): string {
  if (outcome.kind === "refused") return `refused: ${outcome.reason}`;
  if (outcome.kind === "document-error") return `document error: ${outcome.reason}`;
  return outcome.kind;
}

/** `<item>: <outcome>` per item; with `failed`, only the refused and document-error ones. Empty without a report. */
export function outcomeLines(report: Report | undefined, { failed = false } = {}): string[] {
  if (!report) return [];
  const outcomes =
    report.kind === "sheet" ? report.weeks.map((week) => week.outcome) : report.events.map((e) => e.outcome);
  return outcomes.flatMap((outcome, index) =>
    failed && outcome.kind !== "refused" && outcome.kind !== "document-error"
      ? []
      : [`${itemLabel(report, index)}: ${outcomeText(outcome)}`],
  );
}
