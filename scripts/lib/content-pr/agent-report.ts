// How the report the agent of a mail run writes (agent-report-schema.ts) becomes the stored report: the scripts add
// what the change shows, the report's kind, a published item's outcome, a published week's dates, and the ids and
// status of new questions.

import type { Week } from "../services/sheet-week";
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

/**
 * The week's dates and outcome: a week that is not published as the agent gives them; a published one from the one
 * week the run's `changes` hold (created when it adds the week, else corrected).
 */
function weekOf(
  week: AgentWeek,
  changes: ContentChanges | undefined,
): Pick<WeekEntry, "validFrom" | "validTo" | "outcome"> {
  const held: Week[] = changes?.kind === "sheet" ? [...changes.added, ...changes.changed] : [];
  if (week.outcome) {
    if (held.length > 0) {
      const message = `the change holds the week ${formatWeeks(held)}, so it is published: leave out the outcome and dates`;
      throw new ReportError([`week.outcome: ${message}`]);
    }
    return { validFrom: week.validFrom!, validTo: week.validTo!, outcome: week.outcome };
  }
  if (changes?.kind !== "sheet" || held.length !== 1) {
    const holds = held.length > 0 ? `the weeks ${formatWeeks(held)}` : "no week";
    throw new ReportError([
      `week: a published week takes its dates from the change, which holds ${holds} (a week not published needs its outcome)`,
    ]);
  }
  const { validFrom, validTo } = held[0]!;
  return { validFrom, validTo, outcome: { kind: changes.added.length > 0 ? "created" : "corrected" } };
}

/**
 * The sheet run's report: the week's dates and outcome from `changes` (weekOf), the ids of its new questions after the
 * highest of `previous` and of the earlier questions of this week it writes again, which must be in `previous`.
 */
function completeSheetRun(
  run: AgentSheetRun,
  changes: ContentChanges | undefined,
  previous?: SheetReport,
): SheetRunReport {
  const dated = weekOf(run.week, changes);
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

/**
 * The stored report the agent's report makes: an events report on its own, a sheet run's merged into `previous` (the
 * PR's report, none for a new PR). `changes` is what the run changed (the working tree against HEAD); a sheet run's
 * published week needs it. Throws a ReportError when the report does not fit the change.
 */
export function completeAgentReport(agent: AgentReport, changes?: ContentChanges, previous?: SheetReport): Report {
  if (agent.kind === "events") return completeEvents(agent.report);
  return mergeSheetReport(previous, completeSheetRun(agent.run, changes, previous));
}
