// Merges one mail run's sheet report into the content PR's sheet report, which covers every week the PR handled.
// The handled week replaces its previous entry (questions included, the agent re-writes them); weeks the sheet
// refused or could not read are dropped; the run's new questions are appended and its question updates resolve
// questions of the other weeks or of the report. The result is checked against the sheet report schema.

import { REPORT_VERSION, parseSheetReport } from "./report-schema";
import type { Question, SheetReport, SheetRunReport } from "./report-schema";

export function mergeSheetReport(previous: SheetReport | undefined, run: SheetRunReport): SheetReport {
  const base: SheetReport = previous ?? { version: REPORT_VERSION, kind: "sheet", weeks: [], questions: [] };
  const kept = base.weeks.filter(
    (week) =>
      week.validFrom !== run.week.validFrom &&
      week.outcome.kind !== "refused" &&
      week.outcome.kind !== "document-error",
  );

  const existingIds = new Set(
    [
      ...base.questions,
      ...base.weeks.filter((week) => week.validFrom !== run.week.validFrom).flatMap((w) => w.questions),
    ].map((question) => question.id),
  );
  for (const { id } of [...run.week.questions, ...run.questions]) {
    if (existingIds.has(id)) throw new Error(`question ${id} already exists in the previous report`);
  }

  const weeks = [...kept, run.week].sort((a, b) => a.validFrom.localeCompare(b.validFrom));
  const questions = [...base.questions, ...run.questions];

  const outside: Question[] = [...questions, ...weeks.filter((week) => week !== run.week).flatMap((w) => w.questions)];
  const byId = new Map(outside.map((question) => [question.id, question]));
  const updated = new Map<string, Question>();
  for (const update of run.questionUpdates) {
    const target = byId.get(update.id);
    if (!target) throw new Error(`question ${update.id} to update is not in the report`);
    const next = {
      ...target,
      status: update.status,
      ...(update.answer === undefined ? {} : { answer: update.answer }),
    };
    byId.set(update.id, next);
    updated.set(update.id, next);
  }
  const apply = (list: Question[]): Question[] => list.map((question) => updated.get(question.id) ?? question);

  return parseSheetReport({
    version: REPORT_VERSION,
    kind: "sheet",
    weeks: weeks.map((week) => (week === run.week ? week : { ...week, questions: apply(week.questions) })),
    questions: apply(questions),
  });
}
