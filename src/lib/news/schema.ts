import * as z from "zod";
import type { NewsEvent } from "@/content/types/news";
import { eventClock } from "./ics";

// The rules of one Aktuality record, in one place: news.test.ts checks every record in src/content/news/ with
// them, and scripts/add-aktualita.ts checks a new record before the farnost-create-aktualita skill stages its files.
// The rules across records (unique IDs, one pinned event, the month files' order) stay in news.test.ts.

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

/** A NewsEvent (src/content/types/news.ts); its fields are listed in the order the month files write them. */
export const newsEventSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be ASCII kebab-case"),
    slug: z.string().optional(),
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
    sessions: z.int().positive().optional(),
    longTerm: z.union([z.literal(true), z.strictObject({ weeklyAt: clock })]).optional(),
    label: text.optional(),
    pinned: z.boolean().optional(),
    archiveHidden: z.boolean().optional(),
    published: date.optional(),
    calendarEventId: text.optional(),
    poster: z.strictObject({ src: upload, alt: text }).optional(),
    attachments: z.array(z.strictObject({ label: text, file: upload, size: z.int().positive().optional() })).optional(),
    links: z
      .array(
        z.strictObject({ label: text, href: z.string().regex(/^(https:\/\/|mailto:)/, "must be https: or mailto:") }),
      )
      .optional(),
  })
  .superRefine((event, ctx) => {
    if (event.end !== undefined && event.end <= event.start) {
      ctx.addIssue({ code: "custom", path: ["end"], message: "must be after start (omit it for one day)" });
    }
    if (event.sessions !== undefined && event.end === undefined) {
      ctx.addIssue({ code: "custom", path: ["end"], message: "a series of sessions needs an end" });
    }
    // An unreadable time ("18.00") makes the event all-day in the .ics file and the JSON-LD.
    if (event.time !== undefined) {
      const span = eventClock({ ...event, longTerm: undefined });
      const times = span ? [span.from, span.to ?? span.from] : [];
      if (!span || !times.every((t) => CLOCK.test(t)) || (span.to && minutes(span.to) <= minutes(span.from))) {
        ctx.addIssue({ code: "custom", path: ["time"], message: 'must be "H:MM" or "H:MM–H:MM"' });
      }
    }
  }) satisfies z.ZodType<NewsEvent>;

/** The record's fields in the order the month files write them. */
export const NEWS_EVENT_FIELDS = Object.keys(newsEventSchema.shape);
