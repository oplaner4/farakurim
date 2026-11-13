// The schema of the JSON reports the content PR agents write: the service sheet report (a whole one and a single run's),
// the events report and a comment fix's result. Every parse function checks a value against its schema and throws a
// ReportError listing each issue as `<dotted path>: <message>`.

import { z } from "zod";
import type { Kind } from "../content-release/plan";

export const REPORT_VERSION = 1;

export class ReportError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join("\n"));
    this.name = "ReportError";
    this.issues = issues;
  }
}

const isoDate = z.iso.date();
const text = z.string();

const questionSchema = z.strictObject({
  id: z.string().regex(/^q[1-9]\d*$/),
  blocking: z.boolean(),
  status: z.enum(["open", "resolved"]),
  where: text,
  text,
  proposal: text.optional(),
  answer: text.optional(),
});

const weekOutcomeSchema = z.discriminatedUnion("kind", [
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
    summary: text,
    notOnTheNewest: text.optional(),
    senderNote: z.array(text).optional(),
    questions: z.array(questionSchema),
  })
  .superRefine((week, ctx) => {
    if (week.validFrom > week.validTo) {
      ctx.addIssue({ code: "custom", message: "validFrom is after validTo", path: ["validTo"], input: week });
    }
  });

const venueSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("new"), id: text, name: text, address: text, pin: text }),
  z.strictObject({ kind: z.literal("alias"), id: text, text }),
]);

const eventOutcomeSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("created"), id: text }),
  z.strictObject({ kind: z.literal("refused"), reason: text }),
]);

const eventEntrySchema = z.strictObject({
  title: text,
  outcome: eventOutcomeSchema,
  origin: text.optional(),
  venues: z.array(venueSchema),
  questions: z.array(questionSchema),
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
    version: z.literal(REPORT_VERSION),
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

const sheetRunReportSchema = z
  .strictObject({
    version: z.literal(REPORT_VERSION),
    kind: z.literal("sheet"),
    week: weekEntrySchema,
    questions: z.array(questionSchema),
    questionUpdates: z.array(
      z.strictObject({
        id: z.string().regex(/^q[1-9]\d*$/),
        status: z.enum(["open", "resolved"]),
        answer: text.optional(),
      }),
    ),
  })
  .superRefine((report, ctx) => checkUniqueQuestionIds(report, [report.week], ctx));

const eventsReportSchema = z
  .strictObject({
    version: z.literal(REPORT_VERSION),
    kind: z.literal("events"),
    events: z.array(eventEntrySchema),
    questions: z.array(questionSchema),
    droppedAttachments: z.array(text),
  })
  .superRefine((report, ctx) => checkUniqueQuestionIds(report, report.events, ctx));

const fixResultSchema = z.strictObject({
  version: z.literal(REPORT_VERSION),
  outcome: z.enum(["changed", "unchanged"]),
  fixMessage: text,
  reply: text,
});

export type Question = z.infer<typeof questionSchema>;
export type WeekOutcome = z.infer<typeof weekOutcomeSchema>;
export type WeekEntry = z.infer<typeof weekEntrySchema>;
export type SheetReport = z.infer<typeof sheetReportSchema>;
export type SheetRunReport = z.infer<typeof sheetRunReportSchema>;
export type EventOutcome = z.infer<typeof eventOutcomeSchema>;
export type EventEntry = z.infer<typeof eventEntrySchema>;
export type EventsReport = z.infer<typeof eventsReportSchema>;
export type Report = SheetReport | EventsReport;
export type FixResult = z.infer<typeof fixResultSchema>;

function parseWith<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new ReportError(result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`));
}

export const parseSheetReport = (value: unknown): SheetReport => parseWith(sheetReportSchema, value);
export const parseSheetRunReport = (value: unknown): SheetRunReport => parseWith(sheetRunReportSchema, value);
export const parseEventsReport = (value: unknown): EventsReport => parseWith(eventsReportSchema, value);
export const parseFixResult = (value: unknown): FixResult => parseWith(fixResultSchema, value);

export function parseReport(kind: Kind, value: unknown): Report {
  return kind === "sheet" ? parseSheetReport(value) : parseEventsReport(value);
}
