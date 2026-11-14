// Checks the events an events report refuses as a correction or a duplicate against the events they name: a duplicate
// is of a known event (pnpm event-mail known: the upcoming events on main and those the open events PRs add) where the
// report says, a correction of a known event or of a record on the site. A mail holding a correction word (pnpm
// event-mail corrections) needs an answer: an event refused as a correction, or a report-level question saying why
// the mail corrects none. Each issue is `<path>: <message>`.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { newsIds } from "../content-files";
import type { CorrectionWord } from "../news/correction-words-schema";
import type { KnownEvent } from "../news/known-events-schema";
import { ReportError, type EventsReport } from "./report-schema";

/** A known event as the check needs it: its id and where it is, main or an open PR's number. */
type KnownId = Pick<KnownEvent, "id" | "where">;

const whereText = (where: KnownId["where"]) => (where === "main" ? "main" : `PR #${where}`);

/**
 * The issues of the refused events of `report` whose event is not where it says: a duplicate must be of a known event
 * in `known` with the same `where`; a correction of a known event or one of the ids `onSite` (the records on the site).
 */
export function refusalIssues(report: EventsReport, known: KnownId[], onSite: Set<string>): string[] {
  return report.events.flatMap(({ outcome }, index) => {
    const at = `events.${index}.outcome.of`;
    if (outcome.kind === "duplicate") {
      if (known.some((event) => event.id === outcome.of && event.where === outcome.where)) return [];
      const elsewhere = known.find((event) => event.id === outcome.of);
      const found = elsewhere ? `, it is in ${whereText(elsewhere.where)}` : "";
      return [`${at}: ${outcome.of} is no known event in ${whereText(outcome.where)}${found}`];
    }
    if (outcome.kind === "correction" && !known.some((event) => event.id === outcome.of) && !onSite.has(outcome.of)) {
      return [`${at}: ${outcome.of} is no known event and no event on the site`];
    }
    return [];
  });
}

/** The `where` of the report-level question that says why the mail's correction words correct no event. */
export const CORRECTION_WORDS = "correction words";

/** A correction word as an issue names it: "a word for a move in the subject". */
const wordText = ({ kind, where }: CorrectionWord) =>
  `a word for a ${kind} in ${where.startsWith("attachment") ? where : `the ${where}`}`;

/**
 * The issue of a mail whose correction `words` the report does not answer: it refuses no event as a correction and has
 * no report-level question whose `where` is CORRECTION_WORDS.
 */
export function correctionIssues(report: EventsReport, words: CorrectionWord[]): string[] {
  const answered =
    report.events.some(({ outcome }) => outcome.kind === "correction") ||
    report.questions.some(({ where }) => where === CORRECTION_WORDS);
  if (words.length === 0 || answered) return [];
  const found = words.map(wordText).join(", ");
  return [
    `events: the mail has ${found}: refuse the event it corrects (outcome correction), or say why it corrects none ` +
      `in a report-level question whose where is "${CORRECTION_WORDS}"`,
  ];
}

/**
 * Checks the refused events of `report` against the `known` events and the site in `cwd`, and that it answers the
 * mail's correction `words`.
 */
export function checkRefusals(
  report: EventsReport,
  { known, words }: { known: KnownId[]; words: CorrectionWord[] },
  cwd: string,
): void {
  const news = join(cwd, "src/content/news");
  const onSite = existsSync(news) ? newsIds(news) : new Set<string>();
  const issues = [...refusalIssues(report, known, onSite), ...correctionIssues(report, words)];
  if (issues.length > 0) throw new ReportError(issues);
}
