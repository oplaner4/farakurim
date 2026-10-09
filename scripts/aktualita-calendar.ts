// Checks that an aktualita is in the Události Google Calendar, linked to its detail page (farnost-create-aktualita
// skill). The calendar links an event to the page when the event's description holds the page's URL, so for each
// meeting of the aktualita it reports one of:
//   linked     an event that day already links the page: nothing to do;
//   no link    an event that day has a matching title but not the URL: paste the URL into its description;
//   missing    no such event: when no meeting is in the calendar, it writes the aktualita's .ics (the file of
//              "Přidat do kalendáře", whose description holds the URL) to import into Události.
// It reads the calendar with NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY from .env.local; without the key, or when Google
// does not answer, it writes the .ics and says the calendar was not checked. `pnpm stage aktualita … --record` and
// `pnpm add-aktualita` run it after adding a record.
//
// Usage: pnpm aktualita-calendar <id> [--out <dir>]   (the .ics goes to ~/Downloads/ by default)

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import type { NewsEvent } from "@/content/types/news";
import { parishCalendars, SITE_URL } from "@/content/site";
import {
  aktualitaPaths,
  eventDays,
  fetchGoogleCalendar,
  type GoogleEvent,
  refererInit,
} from "@/lib/calendar/google-calendar";
import { eventCalendar } from "@/lib/news/ics";
import { eventEnd, eventHref, eventMeetings, eventSlug, type Meeting } from "@/lib/news/events";

const root = fileURLToPath(new URL("..", import.meta.url));

/** The days the aktualita takes place: each meeting of a series, the first day of a weekly one, else its span. */
export function meetingsOf(event: NewsEvent): Meeting[] {
  if (event.sessions) return eventMeetings(event);
  if (event.longTerm && event.longTerm !== true) {
    return [{ start: event.start, end: event.start, time: event.longTerm.weeklyAt }];
  }
  return [{ start: event.start, end: eventEnd(event), time: event.time }];
}

/** A title for comparing: lower case, without diacritics and repeated spaces. */
const comparable = (title: string) =>
  title
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Whether a calendar event's title names the aktualita: one title contains the other. */
const sameTitle = (a: string, b: string) => {
  const [x, y] = [comparable(a), comparable(b)];
  return x !== "" && y !== "" && (x.includes(y) || y.includes(x));
};

export type MeetingMatch = {
  meeting: Meeting;
  status: "linked" | "unlinked" | "missing";
  /** The calendar event found that day. */
  found?: { title: string; date: string };
};

/** How each meeting of `event` stands in the Události `calendar`. */
export function matchMeetings(event: NewsEvent, calendar: GoogleEvent[]): MeetingMatch[] {
  const href = eventHref(event);
  return meetingsOf(event).map((meeting): MeetingMatch => {
    const sameDay = calendar.flatMap((e) => {
      const days = e.status === "cancelled" ? undefined : eventDays(e);
      return days && days.date <= meeting.end && (days.end ?? days.date) >= meeting.start ? [{ e, days }] : [];
    });
    const found = ({ e, days }: (typeof sameDay)[number]) => ({ title: e.summary?.trim() ?? "", date: days.date });
    const linked = sameDay.find(({ e }) => aktualitaPaths(e.description).includes(href));
    if (linked) return { meeting, status: "linked", found: found(linked) };
    const titled = sameDay.find(({ e }) => sameTitle(e.summary ?? "", event.title));
    if (titled) return { meeting, status: "unlinked", found: found(titled) };
    return { meeting, status: "missing" };
  });
}

/** Writes the aktualita's .ics (as "Přidat do kalendáře" serves it) to `outDir`; returns its path. */
export function writeIcs(event: NewsEvent, outDir: string): string {
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, `${eventSlug(event)}.ics`);
  writeFileSync(path, eventCalendar(event, `${SITE_URL}${eventHref(event)}`));
  return path;
}

const IMPORT = 'import it into "Události" (Google Calendar → Settings → Import and export → Import)';

export interface CheckOptions {
  /** NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY; without it the calendar is not read. */
  apiKey?: string;
  /** Where the .ics goes. */
  outDir: string;
}

/** Checks the aktualita in the Události calendar (writing its .ics when needed); returns the lines to print. */
export async function checkCalendar(event: NewsEvent, { apiKey, outDir }: CheckOptions): Promise<string[]> {
  const url = `${SITE_URL}${eventHref(event)}`;
  const unchecked = (reason: string) => [
    `Události: not checked (${reason}).`,
    `Wrote ${writeIcs(event, outDir)}: ${IMPORT}, unless the event is there already; then add ${url} to its description.`,
  ];
  if (!apiKey) return unchecked("no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY in .env.local");
  const meetings = meetingsOf(event);
  const range = { from: meetings[0].start, to: meetings.reduce((last, m) => (m.end > last ? m.end : last), "") };
  let calendar: GoogleEvent[];
  try {
    calendar = await fetchGoogleCalendar(parishCalendars.events.googleId, apiKey, range, refererInit(SITE_URL));
  } catch (error) {
    return unchecked(error instanceof Error ? error.message : String(error));
  }
  const matches = matchMeetings(event, calendar);
  if (matches.every((m) => m.status === "missing")) {
    const days = meetings.map((m) => m.start).join(", ");
    return [`Události: no event on ${days}.`, `Wrote ${writeIcs(event, outDir)}: ${IMPORT}.`];
  }
  if (matches.every((m) => m.status === "linked")) {
    const all = matches.length > 1 ? `, all ${matches.length} meetings` : ` on ${matches[0].found!.date}`;
    return [`Události: linked ("${matches[0].found!.title}"${all}).`];
  }
  return matches.map(({ meeting, status, found }) => {
    const day = `Události, ${meeting.start}`;
    if (status === "linked") return `${day}: linked ("${found!.title}").`;
    if (status === "unlinked") return `${day}: "${found!.title}" has no link: add ${url} to its description.`;
    return `${day}: no event: add one with ${url} in its description.`;
  });
}

/** Loads .env.local and prints the check; never throws, so it cannot fail the command that added the record. */
export async function reportCalendar(event: NewsEvent, outDir = join(homedir(), "Downloads")) {
  try {
    const env = join(root, ".env.local");
    if (existsSync(env)) process.loadEnvFile(env);
    console.log(
      (await checkCalendar(event, { apiKey: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY, outDir })).join("\n"),
    );
  } catch (error) {
    console.error(`aktualita-calendar: ${error instanceof Error ? error.message : error}`);
  }
}

// No top-level await: tsx runs the scripts as CommonJS (package.json has no "type": "module").
async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: "string" } } });
  // Imported here, so the commands that import this module do not load every aktualita.
  const { events } = await import("@/content/news");
  const event = events.find((e) => e.id === positionals[0]);
  if (positionals.length !== 1 || !event) {
    console.error(
      positionals.length === 1
        ? `aktualita-calendar: no aktualita with the id ${positionals[0]}`
        : "Usage: pnpm aktualita-calendar <id> [--out <dir>]",
    );
    process.exit(2);
  }
  await reportCalendar(event, values.out);
}

// Run as a command, not imported by the tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) void main();
