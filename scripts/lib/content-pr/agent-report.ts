// How the report the agent of a mail run writes (agent-report-schema.ts) becomes the stored report: the scripts add
// what the change shows, the report's kind, a published item's outcome, a published week's dates, and the ids and
// status of new questions.

import type { Week } from "../services/sheet-week";
import type { SheetResult } from "../stage/sheet-result-schema";
import type {
  AgentEvent,
  AgentEvents,
  AgentQuestion,
  AgentReport,
  AgentSheetRun,
  AgentWeek,
} from "./agent-report-schema";
import type { ContentChanges } from "./changes";
import { mergeSheetReport } from "./merge";
import {
  parseEventsReport,
  ReportError,
  type EventEntry,
  type EventsReport,
  type Question,
  type Report,
  type SheetReport,
  type SheetRunReport,
  type WeekEntry,
} from "./report-schema";
import { formatWeeks } from "./weeks";

const idNumber = (id: string) => Number(id.slice(1));

/** Gives out the question ids after `last`: `q<last + 1>`, … */
function idsAfter(last: number): () => string {
  let n = last;
  return () => `q${++n}`;
}

/** The questions with their ids (a new one's from `nextId`) and status (a new one is open). */
const completeQuestions = (questions: AgentQuestion[], nextId: () => string): Question[] =>
  questions.map(({ id, blocking, status, where, text, proposal, answer }) => ({
    id: id ?? nextId(),
    blocking,
    status: status ?? "open",
    where,
    text,
    ...(proposal !== undefined && { proposal }),
    ...(answer !== undefined && { answer }),
  }));

function completeEvent(event: AgentEvent, nextId: () => string): EventEntry {
  const questions = completeQuestions(event.questions, nextId);
  if (event.outcome) return { title: event.title, outcome: event.outcome, questions };
  const origin = event.origin === undefined ? {} : { origin: event.origin };
  return { outcome: { kind: "created", id: event.id! }, ...origin, questions };
}

/** The events report: an event with an id is created, and the questions are numbered from q1 in the body's order. */
function completeEvents(report: AgentEvents): EventsReport {
  const nextId = idsAfter(0);
  const events = report.events.map((event) => completeEvent(event, nextId));
  return parseEventsReport({
    kind: "events",
    events,
    questions: completeQuestions(report.questions, nextId),
    droppedAttachments: report.droppedAttachments,
  });
}

const sameWeek = (a: Week, b: Week) => a.validFrom === b.validFrom && a.validTo === b.validTo;

/** Throws the ReportError of the one issue `message`. */
function refuse(message: string): never {
  throw new ReportError([message]);
}

type DatedWeek = Pick<WeekEntry, "validFrom" | "validTo" | "outcome">;

/** A staged week: the one week the run's change holds, created when the change adds it, else corrected. */
function stagedWeek(staged: Week, changes: ContentChanges | undefined): DatedWeek {
  const added = changes?.kind === "sheet" ? changes.added : [];
  const held = changes?.kind === "sheet" ? [...added, ...changes.changed] : [];
  if (held.length !== 1 || !sameWeek(held[0]!, staged)) {
    const holds = held.length > 0 ? `the weeks ${formatWeeks(held)}` : "no week";
    refuse(`week: the stage run staged the week ${formatWeeks([staged])}, but the change holds ${holds}`);
  }
  const { validFrom, validTo } = staged;
  return { validFrom, validTo, outcome: { kind: added.length > 0 ? "created" : "corrected" } };
}

/**
 * The week's dates and outcome, from the stage run's `result` and the run's `changes`: a staged week from the change
 * (stagedWeek); a refused one or a document error the result's, with the agent's dates only when the run read no week.
 * Throws a ReportError when they do not fit.
 */
function weekOf(week: AgentWeek, changes: ContentChanges | undefined, result: SheetResult | undefined): DatedWeek {
  if (!result) refuse("week: no stage run: draft and stage the week with `pnpm stage sheet`");
  if (result.result === "drafted") refuse("week: the week was drafted, but not staged with `--record`");
  const agentDates = week.validFrom !== undefined && week.validTo !== undefined;
  const fromRun = result.validFrom !== undefined && result.validTo !== undefined;
  if (agentDates && fromRun) refuse("week.validFrom: the stage run gives the week's dates: leave them out");
  if (result.result === "staged") return stagedWeek(result, changes);
  const held = changes?.kind === "sheet" ? [...changes.added, ...changes.changed] : [];
  if (held.length > 0) refuse(`week: the stage run ended ${result.result}, but the change holds ${formatWeeks(held)}`);
  const dates = fromRun
    ? result
    : agentDates
      ? week
      : refuse("week.validFrom: the stage run read no week: give its dates");
  const outcome = { kind: result.result, reason: result.reason };
  return { validFrom: dates.validFrom!, validTo: dates.validTo!, outcome };
}

/**
 * The sheet run's report: the week's dates and outcome from the stage run's `result` and `changes` (weekOf), the ids
 * of its new questions after the highest of `previous` and of the earlier questions of this week it writes again,
 * which must be in `previous`.
 */
function completeSheetRun(
  run: AgentSheetRun,
  changes: ContentChanges | undefined,
  result: SheetResult | undefined,
  previous?: SheetReport,
): SheetRunReport {
  const dated = weekOf(run.week, changes, result);
  const before = previous?.weeks.find((week) => week.validFrom === dated.validFrom)?.questions ?? [];
  const issues: string[] = [];
  run.week.questions.forEach(({ id }, index) => {
    if (id !== undefined && !before.some((question) => question.id === id)) {
      issues.push(
        `week.questions.${index}.id: ${id} is no earlier question of this week: leave out a new question's id`,
      );
    }
  });
  if (issues.length > 0) throw new ReportError(issues);
  const all = [
    ...(previous ? [...previous.questions, ...previous.weeks.flatMap((week) => week.questions)] : []),
    ...run.week.questions,
  ];
  const nextId = idsAfter(Math.max(0, ...all.flatMap(({ id }) => (id === undefined ? [] : [idNumber(id)]))));
  const senderNote = run.week.senderNote === undefined ? {} : { senderNote: run.week.senderNote };
  return {
    week: { ...dated, ...senderNote, questions: completeQuestions(run.week.questions, nextId) },
    questions: completeQuestions(run.questions, nextId),
    questionUpdates: run.questionUpdates,
  };
}

/** What completes a sheet run's report: the run's change, the stage run's result and the PR's report. */
export type SheetRunFacts = {
  /** What the run changed (the working tree against HEAD); none where it is not known (the job summary). */
  changes?: ContentChanges;
  /** The last stage run's result (STAGE_RESULT); none when no run wrote one. */
  result?: SheetResult;
  /** The PR's report; none for a new PR. */
  previous?: SheetReport;
};

/**
 * The stored report the agent's report makes: an events report on its own, a sheet run's with its week from `facts`
 * (weekOf), merged into the PR's report. Throws a ReportError when the report does not fit them.
 */
export function completeAgentReport(agent: AgentReport, facts: SheetRunFacts = {}): Report {
  if (agent.kind === "events") return completeEvents(agent.report);
  const { changes, result, previous } = facts;
  return mergeSheetReport(previous, completeSheetRun(agent.run, changes, result, previous));
}
