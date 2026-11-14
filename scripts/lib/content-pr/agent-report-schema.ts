// The schema of the report the agent of a mail run writes (a service sheet's week, an event mail): only what reading
// the mail gives. What the change shows (the report's kind, a published item's outcome, a published week's dates, the
// ids and status of new questions) is the scripts' (agent-report.ts), so a value the agent writes anyway is an issue
// and the two never disagree.

import { z } from "zod";
import type { Kind } from "../content-release/plan";
import {
  eventId,
  eventOutcomeSchema,
  isoDate,
  parseWith,
  questionSchema,
  questionUpdateSchema,
  text,
  weekOutcomeSchema,
} from "./report-schema";

type Issue = (path: (string | number)[], message: string) => void;

const issueOn =
  (ctx: z.RefinementCtx, input: unknown): Issue =>
  (path, message) =>
    ctx.addIssue({ code: "custom", message, path, input });

/** The report's kind: the workflow knows it. */
const noKind = z.never("set by the script: leave it out").optional();

/** A question as the agent writes it: with an id and status only when it is an earlier one written again. */
const agentQuestionSchema = questionSchema.partial({ id: true, status: true });
export type AgentQuestion = z.infer<typeof agentQuestionSchema>;

/** A new question: the scripts number it and open it. */
const newQuestionSchema = questionSchema.extend({
  id: z.never("set by the script for a new question: leave it out").optional(),
  status: z.never("a new question is open: leave it out").optional(),
});

const publishedKind = (kind: string) => kind === "created" || kind === "corrected";

const agentWeekSchema = z
  .strictObject({
    validFrom: isoDate.optional(),
    validTo: isoDate.optional(),
    outcome: weekOutcomeSchema.optional(),
    senderNote: z.array(text).optional(),
    questions: z.array(agentQuestionSchema),
  })
  .superRefine((week, ctx) => {
    const issue = issueOn(ctx, week);
    if (week.outcome && publishedKind(week.outcome.kind)) {
      issue(["outcome"], "a published week has no outcome: the script takes it from the change");
    } else if (!week.outcome) {
      for (const field of ["validFrom", "validTo"] as const) {
        if (week[field] !== undefined) issue([field], "a published week takes its dates from the change: leave it out");
      }
    } else {
      for (const field of ["validFrom", "validTo"] as const) {
        if (week[field] === undefined) issue([field], "a week that is not published needs its dates");
      }
      if (week.validFrom && week.validTo && week.validFrom > week.validTo)
        issue(["validTo"], "validFrom is after validTo");
    }
    // An id names an earlier question of this week, written again; only such a one keeps its status.
    week.questions.forEach((question, index) => {
      if (question.id === undefined && question.status !== undefined) {
        issue(["questions", index, "status"], "a new question is open: leave it out");
      }
    });
  });
export type AgentWeek = z.infer<typeof agentWeekSchema>;

const agentSheetRunSchema = z.strictObject({
  kind: noKind,
  week: agentWeekSchema,
  questions: z.array(newQuestionSchema),
  questionUpdates: z.array(questionUpdateSchema),
});
export type AgentSheetRun = z.infer<typeof agentSheetRunSchema>;

const agentEventSchema = z
  .strictObject({
    id: eventId.optional(),
    title: text.optional(),
    outcome: eventOutcomeSchema.optional(),
    origin: text.optional(),
    questions: z.array(newQuestionSchema),
  })
  .superRefine((event, ctx) => {
    const issue = issueOn(ctx, event);
    if (event.outcome?.kind === "created") {
      issue(["outcome"], "a published event has no outcome: give only its record's id");
    } else if (!event.outcome) {
      if (event.id === undefined)
        issue(["id"], "a published event needs its record's id, one not published its outcome");
      if (event.title !== undefined) issue(["title"], "a published event takes its title from its record");
    } else {
      if (event.id !== undefined) issue(["id"], "an event that is not published has no record: leave it out");
      if (event.title === undefined) issue(["title"], "an event that is not published needs its title");
      if (event.origin !== undefined) issue(["origin"], "only a published event has an origin");
    }
  });
export type AgentEvent = z.infer<typeof agentEventSchema>;

const agentEventsSchema = z.strictObject({
  kind: noKind,
  events: z.array(agentEventSchema),
  questions: z.array(newQuestionSchema),
  droppedAttachments: z.array(text),
});
export type AgentEvents = z.infer<typeof agentEventsSchema>;

/** The agent's report of a mail run, checked against its schema. */
export type AgentReport = { kind: "sheet"; run: AgentSheetRun } | { kind: "events"; report: AgentEvents };

/** Checks the agent's report `value` of `kind`; throws a ReportError listing each issue. */
export const parseAgentReport = (kind: Kind, value: unknown): AgentReport =>
  kind === "sheet"
    ? { kind, run: parseWith(agentSheetRunSchema, value) }
    : { kind, report: parseWith(agentEventsSchema, value) };
