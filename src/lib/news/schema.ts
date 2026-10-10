import * as z from "zod";
import type { NewsEvent } from "@/content/types/news";
import { eventMeetings } from "./events";
import { parseClock } from "./ics";

// The rules of one Aktuality record, in one place: src/content/news/index.ts checks every month file with them on
// import (a broken file fails the tests, the build and the scripts), and scripts/lib/news/add-aktualita.ts checks a new record
// before the farnost-create-aktualita skill stages its files. The rules across records (unique IDs, one pinned
// event, the month files' order) stay in news.test.ts.

const date = z.iso.date();
const CLOCK = /^([01]?\d|2[0-3]):[0-5]\d$/;
const clock = z.string().regex(CLOCK, "must be H:MM");
const text = z.string().trim().min(1);
/** A file uploaded to the server, linked root-relative (CLAUDE.md "Content and data"). */
const upload = z.string().regex(/^\/uploads\/\S+\.(pdf|png|jpe?g|webp|mp3)$/, "must be a /uploads/… file");
const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
const TIME_MESSAGE = 'must be "H:MM" or "H:MM–H:MM"';
/** A time text the calendar files can read: one valid clock time or a range that ends after it starts. */
const readableTime = (time: string) => {
  const span = parseClock(time);
  const times = span ? [span.from, span.to ?? span.from] : [];
  return !!span && times.every((t) => CLOCK.test(t)) && !(span.to && minutes(span.to) <= minutes(span.from));
};

/** A NewsEvent (src/content/types/news.ts); the month files keep its fields in this order. */
export const newsEventSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be ASCII kebab-case"),
    title: text,
    start: date,
    end: date.optional(),
    time: z.string().optional(),
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
    sessions: z
      .array(z.union([date, z.strictObject({ date, end: date.optional(), time: z.string().optional() })]))
      .min(2, "a series has at least two meetings")
      .optional(),
    longTerm: z.union([z.literal(true), z.strictObject({ weeklyAt: clock })]).optional(),
    tags: z
      .array(z.strictObject({ label: text, color: z.enum(["blue", "orange", "magenta", "grey"]).optional() }))
      .optional(),
    pinned: z.boolean().optional(),
    archiveHidden: z.boolean().optional(),
    published: date.optional(),
    poster: z.strictObject({ src: upload, alt: text }).optional(),
    attachments: z.array(z.strictObject({ label: text, file: upload, size: z.int().positive().optional() })).optional(),
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
      meetings.forEach((meeting, i) => {
        if (meeting.end < meeting.start) {
          ctx.addIssue({ code: "custom", path: ["sessions", i, "end"], message: "must be after date" });
        }
        if (i > 0 && meeting.start <= meetings[i - 1].end) {
          ctx.addIssue({ code: "custom", path: ["sessions", i], message: "must follow the previous meeting" });
        }
        const own = event.sessions?.[i];
        if (typeof own === "object" && own.time !== undefined && !readableTime(own.time)) {
          ctx.addIssue({ code: "custom", path: ["sessions", i, "time"], message: TIME_MESSAGE });
        }
      });
    }
    // An unreadable time ("18.00") makes the event all-day in the .ics file and the JSON-LD.
    if (event.time !== undefined && !readableTime(event.time)) {
      ctx.addIssue({ code: "custom", path: ["time"], message: TIME_MESSAGE });
    }
  }) satisfies z.ZodType<NewsEvent>;
