import * as z from "zod";
import type { EventTimes, NewsEvent } from "@/content/types/news";
import { CLOCK, clockMinutes } from "@/lib/shared/clock";
import { clockSchema, kebabIdSchema, uploadSchema } from "@/lib/shared/schema";
import { slug } from "@/lib/shared/slug";
import { eventMeetings } from "./timing";

// The rules of one event record, in one place: src/content/news/index.ts checks every month file with them on
// import (a broken file fails the tests, the build and the scripts), and scripts/lib/news/add-event.ts checks a new record
// before the parish-create-event skill stages its files. The rules across records (unique IDs, one pinned
// event, the month files' order) stay in news.test.ts.

const date = z.iso.date();
const text = z.string().trim().min(1);

/**
 * An end time needs a start time and comes after it, on the same day (a time that is not H:MM has its own issue).
 * `keys` name the two fields where `at` (the record, a meeting or the move) has them.
 */
function checkTimes(
  start: string | undefined,
  end: string | undefined,
  ctx: z.RefinementCtx,
  at: PropertyKey[] = [],
  [startKey, endKey] = ["startTime", "endTime"],
) {
  if (end === undefined || !CLOCK.test(end) || (start !== undefined && !CLOCK.test(start))) return;
  const message =
    start === undefined ? `needs ${startKey}` : clockMinutes(end) <= clockMinutes(start) && `must be after ${startKey}`;
  if (message) ctx.addIssue({ code: "custom", path: [...at, endKey], message });
}

/** A meeting's own times, checked in `sessionsSchema`: as a union member, `clockSchema` would hide its message. */
const meetingTimes = { startTime: z.string().optional(), endTime: z.string().optional() } satisfies Record<
  keyof EventTimes,
  z.ZodType
>;

/** The meetings of a series, each after the one before; checked against start and end with the whole record. */
const sessionsSchema = z
  .array(z.union([date, z.strictObject({ date, end: date.optional(), ...meetingTimes })]))
  .min(2, "a series has at least two meetings")
  .superRefine((sessions, ctx) => {
    const meetings = eventMeetings({ sessions });
    meetings.forEach((meeting, i) => {
      if (meeting.end < meeting.start) {
        ctx.addIssue({ code: "custom", path: [i, "end"], message: "must be after date" });
      }
      if (i > 0 && meeting.start <= meetings[i - 1].end) {
        ctx.addIssue({ code: "custom", path: [i], message: "must follow the previous meeting" });
      }
      const own = sessions[i];
      if (typeof own === "object") {
        for (const key of ["startTime", "endTime"] as const) {
          const time = own[key];
          if (time !== undefined && !CLOCK.test(time)) {
            ctx.addIssue({ code: "custom", path: [i, key], message: "must be H:MM" });
          }
        }
        checkTimes(own.startTime, own.endTime, ctx, [i]);
      }
    });
  });

/**
 * The files of an event. The tools find an attachment by its label, and its file is named after it
 * (`<id>-<slug of the label>.<ext>`), so two labels must differ in more than accents, case or punctuation ("Plakát"
 * and "Plakat" would share a file name and a poster).
 */
const attachmentsSchema = z
  .array(z.strictObject({ label: text, file: uploadSchema, size: z.int().positive().optional() }))
  .superRefine((attachments, ctx) => {
    attachments.forEach((attachment, i) => {
      const twin = attachments.findIndex((a) => slug(a.label) === slug(attachment.label));
      if (twin < i) {
        ctx.addIssue({
          code: "custom",
          path: [i, "label"],
          message: `must differ from "${attachments[twin].label}" in more than accents, case or punctuation`,
        });
      }
    });
  });

/** A postponed event's first date differs from the new one; a series' dropped meetings are its meetings. */
function checkChange(event: NewsEvent, ctx: z.RefinementCtx) {
  if (event.change?.status === "moved" && event.change.previousStart === event.start) {
    ctx.addIssue({
      code: "custom",
      path: ["change", "previousStart"],
      message: "must differ from start (the new date)",
    });
  }
  if (event.cancelledMeetings) {
    const starts = new Set(eventMeetings(event).map((m) => m.start));
    event.cancelledMeetings.dates.forEach((day, i) => {
      if (!starts.has(day)) {
        ctx.addIssue({
          code: "custom",
          path: ["cancelledMeetings", "dates", i],
          message: "must be a meeting's date",
        });
      }
    });
    if (event.change?.status === "cancelled") {
      ctx.addIssue({ code: "custom", path: ["cancelledMeetings"], message: "a cancelled event drops every meeting" });
    }
  }
}

/** A NewsEvent (src/content/types/news.ts); the month files keep its fields in this order. */
export const newsEventSchema = z
  .strictObject({
    id: kebabIdSchema,
    title: text,
    start: date,
    end: date.optional(),
    startTime: clockSchema.optional(),
    endTime: clockSchema.optional(),
    place: text.optional(),
    mapQuery: text.optional(),
    text,
    lead: text.optional(),
    body: text.optional(),
    program: z.array(z.strictObject({ time: z.string(), title: text, note: text.optional() })).optional(),
    highlights: z
      .strictObject({ title: text, items: z.array(z.strictObject({ value: text, label: text })).max(3) })
      .optional(),
    price: text.optional(),
    registrationDeadline: date.optional(),
    sessions: sessionsSchema.optional(),
    longTerm: z.union([z.literal(true), z.strictObject({ weeklyAt: clockSchema })]).optional(),
    tags: z
      .array(z.strictObject({ label: text, color: z.enum(["blue", "orange", "magenta", "grey"]).optional() }))
      .optional(),
    change: z
      .discriminatedUnion("status", [
        z.strictObject({ status: z.literal("cancelled"), announced: date.optional(), note: text.optional() }),
        z.strictObject({
          status: z.literal("moved"),
          previousStart: date,
          previousStartTime: clockSchema.optional(),
          previousEndTime: clockSchema.optional(),
          announced: date.optional(),
          note: text.optional(),
        }),
      ])
      .optional(),
    cancelledMeetings: z.strictObject({ dates: z.array(date).min(1), note: text.optional() }).optional(),
    pinned: z.boolean().optional(),
    archiveHidden: z.boolean().optional(),
    published: date.optional(),
    poster: z.strictObject({ src: uploadSchema, alt: text }).optional(),
    attachments: attachmentsSchema.optional(),
    links: z
      .array(
        z.strictObject({ label: text, href: z.string().regex(/^(https:\/\/|mailto:)/, "must be https: or mailto:") }),
      )
      .optional(),
  })
  .superRefine((event, ctx) => {
    // The ID is the detail URL: the start year keeps a title that repeats every year ("Farní den") on its own page.
    if (!event.id.split("-").includes(event.start.slice(0, 4))) {
      ctx.addIssue({
        code: "custom",
        path: ["id"],
        message: `must contain the start year (${event.start.slice(0, 4)})`,
      });
    }
    if (event.end !== undefined && event.end <= event.start) {
      ctx.addIssue({ code: "custom", path: ["end"], message: "must be after start (omit it for one day)" });
    }
    if (event.sessions) {
      const meetings = eventMeetings(event);
      if (meetings[0]?.start !== event.start) {
        ctx.addIssue({ code: "custom", path: ["sessions", 0], message: "the first meeting must be on start" });
      }
      if (meetings.at(-1)?.end !== event.end) {
        ctx.addIssue({ code: "custom", path: ["end"], message: "must be the last meeting's last day" });
      }
    }
    checkChange(event, ctx);
    checkTimes(event.startTime, event.endTime, ctx);
    if (event.change?.status === "moved") {
      const { previousStartTime, previousEndTime } = event.change;
      checkTimes(previousStartTime, previousEndTime, ctx, ["change"], ["previousStartTime", "previousEndTime"]);
    }
  }) satisfies z.ZodType<NewsEvent>;
