import { describe, expect, it } from "vitest";
import { reportQuestion, reportWeek } from "../test-helpers/reports";
import type { ContentChanges } from "./changes";
import { fixReportIssues } from "./fix-report";
import type { EventEntry, EventsReport, Question, SheetReport } from "./report-schema";

const WEEK = reportWeek("2026-10-19", "2026-10-25", { kind: "created" }, [reportQuestion("q1", true)]);
const OTHER_WEEK = reportWeek("2026-10-26", "2026-11-01", { kind: "corrected" });
const sheet = (weeks = [WEEK, OTHER_WEEK], questions: Question[] = []): SheetReport => ({
  kind: "sheet",
  weeks,
  questions,
});

const CONCERT: EventEntry = {
  title: "Koncert",
  outcome: { kind: "created", id: "2026-12-12-koncert" },
  origin: "The title is from the poster.",
  venues: [{ kind: "alias", id: "kostel", text: "v kostele" }],
  questions: [reportQuestion("q1", true)],
};
const TRIP: EventEntry = { title: "Zájezd", outcome: { kind: "refused", reason: "past" }, venues: [], questions: [] };
const events = (list = [CONCERT, TRIP], dropped = ["attachment 2, a logo"]): EventsReport => ({
  kind: "events",
  events: list,
  questions: [],
  droppedAttachments: dropped,
});

const NOTHING: ContentChanges = { kind: "sheet", added: [], changed: [] };
const WEEK_CHANGED: ContentChanges = {
  kind: "sheet",
  added: [],
  changed: [{ validFrom: WEEK.validFrom, validTo: WEEK.validTo }],
};
const NO_EVENT: ContentChanges = { kind: "events", added: [], changed: [] };
const CONCERT_CHANGED: ContentChanges = {
  kind: "events",
  added: [],
  changed: [{ id: "2026-12-12-koncert", title: "Koncert" }],
};

const resolved = (question: Question, answer?: string): Question => ({
  ...question,
  status: "resolved",
  ...(answer !== undefined && { answer }),
});

describe("fixReportIssues", () => {
  it("accepts an unchanged report", () => {
    expect(fixReportIssues(sheet(), sheet(), NOTHING)).toEqual([]);
    expect(fixReportIssues(events(), events(), NO_EVENT)).toEqual([]);
  });

  it("accepts an open question resolved with its answer, and refuses one without", () => {
    const answered = { ...WEEK, questions: [resolved(WEEK.questions[0]!, "8:00, the maintainer says.")] };
    expect(fixReportIssues(sheet(), sheet([answered, OTHER_WEEK]), NOTHING)).toEqual([]);
    const bare = { ...WEEK, questions: [resolved(WEEK.questions[0]!)] };
    expect(fixReportIssues(sheet(), sheet([bare, OTHER_WEEK]), NOTHING)).toEqual([
      "weeks.0.questions.0.answer: a question the fix resolves needs its answer",
    ]);
  });

  it("refuses a question that changes otherwise, reopens, or is added or dropped", () => {
    const before = sheet([WEEK, OTHER_WEEK], [resolved(reportQuestion("q2", false), "Yes.")]);
    const quieted = { ...WEEK, questions: [{ ...WEEK.questions[0]!, blocking: false, text: "Other." }] };
    const reopened = [{ ...before.questions[0]!, status: "open" as const }];
    expect(fixReportIssues(before, sheet([quieted, OTHER_WEEK], reopened), NOTHING)).toEqual([
      "questions.0.status: may not change",
      "weeks.0.questions.0.blocking: may not change",
      "weeks.0.questions.0.text: may not change",
    ]);
    const added = { ...WEEK, questions: [...WEEK.questions, reportQuestion("q3", false)] };
    expect(fixReportIssues(sheet(), sheet([added, OTHER_WEEK]), NOTHING)).toEqual([
      "weeks.0.questions: a fix may not add, drop or reorder questions",
    ]);
    expect(fixReportIssues(sheet(), sheet([{ ...WEEK, questions: [] }, OTHER_WEEK]), NOTHING)).toEqual([
      "weeks.0.questions: a fix may not add, drop or reorder questions",
    ]);
  });

  it("lets a week's summary change only with its sheet, and nothing else of it", () => {
    const summarized = sheet([{ ...WEEK, summary: "Mše v pondělí v 8:00." }, OTHER_WEEK]);
    expect(fixReportIssues(sheet(), summarized, WEEK_CHANGED)).toEqual([]);
    expect(fixReportIssues(sheet(), summarized, NOTHING)).toEqual([
      "weeks.0.summary: changes, but the fix did not change the week from 2026-10-19",
    ]);
    const other = sheet([WEEK, { ...OTHER_WEEK, outcome: { kind: "refused", reason: "x" }, senderNote: ["y"] }]);
    expect(fixReportIssues(sheet(), other, WEEK_CHANGED)).toEqual([
      "weeks.1.outcome: may not change",
      "weeks.1.senderNote: may not change",
    ]);
    expect(fixReportIssues(sheet(), sheet([WEEK]), WEEK_CHANGED)).toEqual(["weeks: a fix may not add or drop a week"]);
  });

  it("lets an event's title, origin and appended venues change only with its record", () => {
    const venue = { kind: "new", id: "sokolovna", name: "Sokolovna", address: "Kuřim", pin: "https://mapy.com/s/x" };
    const corrected = {
      ...CONCERT,
      title: "Koncert scholy",
      origin: "From the comment.",
      venues: [...CONCERT.venues, venue],
    };
    expect(fixReportIssues(events(), events([corrected as EventEntry, TRIP]), CONCERT_CHANGED)).toEqual([]);
    expect(fixReportIssues(events(), events([corrected as EventEntry, TRIP]), NO_EVENT)).toEqual([
      "events.0.title: changes, but the fix did not change the event 2026-12-12-koncert",
      "events.0.origin: changes, but the fix did not change the event 2026-12-12-koncert",
      "events.0.venues: changes, but the fix did not change the event 2026-12-12-koncert",
    ]);
    const replaced = { ...CONCERT, venues: [venue as EventEntry["venues"][number]] };
    expect(fixReportIssues(events(), events([replaced, TRIP]), CONCERT_CHANGED)).toEqual([
      "events.0.venues: a fix may only append venues",
    ]);
  });

  it("refuses a changed refused event, outcome, dropped attachment or event list", () => {
    const trip = { ...TRIP, title: "Výlet", outcome: { kind: "created" as const, id: "2026-12-05-vylet" } };
    expect(fixReportIssues(events(), events([CONCERT, trip], []), CONCERT_CHANGED)).toEqual([
      "droppedAttachments: may not change",
      "events.1.outcome: may not change",
      "events.1.title: changes, but the fix did not change a record of this refused event",
    ]);
    expect(fixReportIssues(events(), events([CONCERT]), CONCERT_CHANGED)).toEqual([
      "events: a fix may not add or drop an event",
    ]);
  });
});
