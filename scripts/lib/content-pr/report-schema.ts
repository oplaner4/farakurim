// The schema of the stored JSON reports of the content PRs: the service sheet report and the events report (what
// the agent of a mail run writes is agent-report-schema.ts's, completed into these by agent-report.ts), and a comment
// fix's result. Every parse function checks a value against its schema and throws a ReportError listing each issue as
// `<dotted path>: <message>`.
//
// The reports carry no version: a report is stored with its PR and read back by the PR's next run, so merge or close
// every open content PR before changing this schema. A stored report the changed schema refuses fails that PR's next
// run with "close the PR and send the sheet or event again".

import { z } from "zod";
import { MARKER_START } from "../content-fix/comments";
import type { Kind } from "../content-release/plan";

export class ReportError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join("\n"));
    this.name = "ReportError";
    this.issues = issues;
  }
}

export const isoDate = z.iso.date();
export const text = z.string();

export const questionSchema = z.strictObject({
  id: z.string().regex(/^q[1-9]\d*$/),
  blocking: z.boolean(),
  status: z.enum(["open", "resolved"]),
  where: text,
  text,
  proposal: text.optional(),
  answer: text.optional(),
});

export const weekOutcomeSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("created") }),
  z.strictObject({ kind: z.literal("corrected") }),
  z.strictObject({ kind: z.literal("refused"), reason: text }),
  z.strictObject({ kind: z.literal("document-error"), reason: text }),
]);

const weekEntrySchema = z
  .strictObject({
    validFrom: isoDate,
    validTo: isoDate,
    outcome: weekOutcomeSchema,
    senderNote: z.array(text).optional(),
    questions: z.array(questionSchema),
  })
  .superRefine((week, ctx) => {
    if (week.validFrom > week.validTo) {
      ctx.addIssue({ code: "custom", message: "validFrom is after validTo", path: ["validTo"], input: week });
    }
  });

/** An event's id, as the news records have it. */
export const eventId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/**
 * What became of an event: created (its record's id), or refused, as a correction or a duplicate of a known event (its
 * id, and for a duplicate where it is: main or an open PR's number), or by a script (the refusal's first line).
 */
export const eventOutcomeSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("created"), id: eventId }),
  z.strictObject({ kind: z.literal("correction"), of: eventId }),
  z.strictObject({
    kind: z.literal("duplicate"),
    of: eventId,
    where: z.union([z.literal("main"), z.int().positive()]),
  }),
  z.strictObject({ kind: z.literal("refused"), reason: text }),
]);

/**
 * An event of the mail. A created one is named by its record (the PR body reads the title from it) and may say where
 * its fields came from (`origin`); a refused one has no record, so it carries its own `title`.
 */
const eventEntrySchema = z
  .strictObject({
    title: text.optional(),
    outcome: eventOutcomeSchema,
    origin: text.optional(),
    questions: z.array(questionSchema),
  })
  .superRefine((event, ctx) => {
    const created = event.outcome.kind === "created";
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", message, path: [path], input: event });
    if (created && event.title !== undefined) issue("title", "a created event takes its title from its record");
    if (!created && event.title === undefined) issue("title", "a refused event needs its title");
    if (!created && event.origin !== undefined) issue("origin", "only a created event has an origin");
  });

type Questioned = { questions: { id: string }[] };

/** Flags every question id that appears more than once among the report's own and its entries' questions. */
function checkUniqueQuestionIds(report: Questioned, entries: Questioned[], ctx: z.RefinementCtx): void {
  const seen = new Set<string>();
  for (const { id } of [...report.questions, ...entries.flatMap((entry) => entry.questions)]) {
    if (seen.has(id)) {
      ctx.addIssue({ code: "custom", message: `question id ${id} is used twice`, path: ["questions"], input: id });
    }
    seen.add(id);
  }
}

const sheetReportSchema = z
  .strictObject({
    kind: z.literal("sheet"),
    weeks: z.array(weekEntrySchema),
    questions: z.array(questionSchema),
  })
  .superRefine((report, ctx) => {
    const starts = new Set<string>();
    report.weeks.forEach((week, index) => {
      if (starts.has(week.validFrom)) {
        ctx.addIssue({
          code: "custom",
          message: `a second week starts on ${week.validFrom}`,
          path: ["weeks", index, "validFrom"],
          input: week,
        });
      }
      starts.add(week.validFrom);
    });
    checkUniqueQuestionIds(report, report.weeks, ctx);
  });

export const questionUpdateSchema = z.strictObject({
  id: z.string().regex(/^q[1-9]\d*$/),
  status: z.enum(["open", "resolved"]),
  answer: text.optional(),
});

const eventsReportSchema = z
  .strictObject({
    kind: z.literal("events"),
    events: z.array(eventEntrySchema),
    questions: z.array(questionSchema),
    droppedAttachments: z.array(text),
  })
  .superRefine((report, ctx) => checkUniqueQuestionIds(report, report.events, ctx));

const fixResultSchema = z.strictObject({
  outcome: z.enum(["changed", "unchanged"]),
  fixMessage: text,
  // A reply with a marker would mark another comment answered.
  reply: text.refine((reply) => !reply.includes(MARKER_START), `holds "${MARKER_START}", a reply's marker`),
});

export type Question = z.infer<typeof questionSchema>;
export type WeekOutcome = z.infer<typeof weekOutcomeSchema>;
export type WeekEntry = z.infer<typeof weekEntrySchema>;
export type SheetReport = z.infer<typeof sheetReportSchema>;
export type QuestionUpdate = z.infer<typeof questionUpdateSchema>;
/** One sheet mail run's week and questions, complete (agent-report.ts), to merge into the PR's report. */
export type SheetRunReport = { week: WeekEntry; questions: Question[]; questionUpdates: QuestionUpdate[] };
export type EventOutcome = z.infer<typeof eventOutcomeSchema>;
export type EventEntry = z.infer<typeof eventEntrySchema>;
export type EventsReport = z.infer<typeof eventsReportSchema>;
export type Report = SheetReport | EventsReport;
export type FixResult = z.infer<typeof fixResultSchema>;

export function parseWith<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new ReportError(result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`));
}

export const parseSheetReport = (value: unknown): SheetReport => parseWith(sheetReportSchema, value);
export const parseEventsReport = (value: unknown): EventsReport => parseWith(eventsReportSchema, value);
export const parseFixResult = (value: unknown): FixResult => parseWith(fixResultSchema, value);

export function parseReport(kind: Kind, value: unknown): Report {
  return kind === "sheet" ? parseSheetReport(value) : parseEventsReport(value);
}
