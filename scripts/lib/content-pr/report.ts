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

/** The title of the created event `id`, from its record; none when there is no record to read. */
export type EventTitle = (id: string) => string | undefined;

/**
 * The item's name: the week's dates (`19.–25. 10. 2026`), a created event's title from its record (`eventTitle`; its
 * id without one) or a refused event's own title.
 */
export function itemLabel(report: Report, index: number, eventTitle: EventTitle = () => undefined): string {
  if (report.kind === "events") {
    const { title, outcome } = report.events[index];
    return outcome.kind === "created" ? (eventTitle(outcome.id) ?? outcome.id) : (title ?? "");
  }
  const { validFrom, validTo } = report.weeks[index];
  return formatWeeks([{ validFrom, validTo }]);
}

/**
 * What an outcome says: `created`, `corrected`, `document error: <reason>` or `refused: <reason>`, the reason of a
 * correction or a duplicate written out.
 */
export function outcomeText(outcome: WeekOutcome | EventOutcome): string {
  switch (outcome.kind) {
    case "refused":
      return `refused: ${outcome.reason}`;
    case "document-error":
      return `document error: ${outcome.reason}`;
    case "correction":
      return `refused: a correction of ${outcome.of}; make it with parish-correct-event`;
    case "duplicate":
      return `refused: already in ${outcome.where === "main" ? "main" : `PR #${outcome.where}`} as ${outcome.of}`;
    case "created":
    case "corrected":
      return outcome.kind;
  }
}

/** Whether the outcome publishes its item: a created or corrected one. */
export const isPublished = (outcome: WeekOutcome | EventOutcome) =>
  outcome.kind === "created" || outcome.kind === "corrected";

/**
 * `<item>: <outcome>` per item (a created event named by `eventTitle`); with `failed`, only those not published. Empty
 * without a report.
 */
export function outcomeLines(
  report: Report | undefined,
  { failed = false, eventTitle }: { failed?: boolean; eventTitle?: EventTitle } = {},
): string[] {
  if (!report) return [];
  const outcomes =
    report.kind === "sheet" ? report.weeks.map((week) => week.outcome) : report.events.map((e) => e.outcome);
  return outcomes.flatMap((outcome, index) =>
    failed && isPublished(outcome) ? [] : [`${itemLabel(report, index, eventTitle)}: ${outcomeText(outcome)}`],
  );
}
