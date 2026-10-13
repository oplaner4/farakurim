// Matches an aktualita's meetings with the events of the Události Google Calendar: the calendar links an event to the
// detail page when the event's description holds the page's URL, so each meeting is linked (an event that day holds
// the URL), not linked (an event that day has a matching title) or missing. Writes the aktualita's .ics for a
// missing one, and reads the calendar with NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY from .env.local.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
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
import { eventHref } from "@/lib/news/events";
import { meetingsOf, type Meeting } from "@/lib/news/timing";
import { fold } from "@/lib/shared/czech";
import { errorMessage, parseCommandLine } from "../command";
import { ROOT } from "../content-files";

/** A title for comparing: lower case, without diacritics and repeated spaces. */
const comparable = (title: string) => fold(title).replace(/\s+/g, " ").trim();

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
  const path = join(outDir, `${event.id}.ics`);
  writeFileSync(path, eventCalendar(event, `${SITE_URL}${eventHref(event)}`));
  return path;
}

const IMPORT =
  'import it into "Události" at https://calendar.google.com/calendar/u/0/r/settings/export, not into a personal calendar';
/** Closes a report that asks the user to act. */
const WHEN = "This can be done before or after the release: the Kalendář links the event once both are in place.";

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
    WHEN,
  ];
  if (!apiKey) return unchecked("no NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY in .env.local");
  const meetings = meetingsOf(event);
  const range = { from: meetings[0].start, to: meetings.reduce((last, m) => (m.end > last ? m.end : last), "") };
  let calendar: GoogleEvent[];
  try {
    calendar = await fetchGoogleCalendar(parishCalendars.events.googleId, apiKey, range, refererInit(SITE_URL));
  } catch (error) {
    return unchecked(errorMessage(error));
  }
  const matches = matchMeetings(event, calendar);
  if (matches.every((m) => m.status === "missing")) {
    const days = meetings.map((m) => m.start).join(", ");
    return [`Události: no event on ${days}.`, `Wrote ${writeIcs(event, outDir)}: ${IMPORT}.`, WHEN];
  }
  if (matches.every((m) => m.status === "linked")) {
    const all = matches.length > 1 ? `, all ${matches.length} meetings` : ` on ${matches[0].found!.date}`;
    return [`Události: linked ("${matches[0].found!.title}"${all}): nothing to do.`];
  }
  const lines = matches.map(({ meeting, status, found }) => {
    const day = `Události, ${meeting.start}`;
    if (status === "linked") return `${day}: linked ("${found!.title}").`;
    if (status === "unlinked") return `${day}: "${found!.title}" has no link: add ${url} to its description.`;
    return `${day}: no event: add one with ${url} in its description.`;
  });
  return [...lines, WHEN];
}

/** Loads .env.local and prints the check; never throws, so it cannot fail the command that added the record. */
export async function reportCalendar(event: NewsEvent, outDir = join(homedir(), "Downloads")) {
  try {
    const env = join(ROOT, ".env.local");
    if (existsSync(env)) process.loadEnvFile(env);
    console.log(
      (await checkCalendar(event, { apiKey: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY, outDir })).join("\n"),
    );
  } catch (error) {
    console.error(`aktualita-calendar: ${errorMessage(error)}`);
  }
}

const USAGE = "Usage: pnpm aktualita-calendar <id> [--out <dir>]";

/** Reads the command line `args`: the aktualita of the id and --out; throws with the usage or for an unknown id. */
export async function parseCommand(args: string[]): Promise<{ event: NewsEvent; out?: string }> {
  const { values, positionals } = parseCommandLine(args, { out: { type: "string" } }, USAGE);
  if (positionals.length !== 1) throw new Error(USAGE);
  // Imported here, so the commands that import this module do not load every aktualita.
  const { events } = await import("@/content/news");
  const event = events.find((e) => e.id === positionals[0]);
  if (!event) throw new Error(`no aktualita with the id ${positionals[0]}`);
  return { event, out: values.out };
}

/** Checks the aktualita in the calendar and prints the result, writing its .ics to `out` when needed. */
export const execute = ({ event, out }: { event: NewsEvent; out?: string }) => reportCalendar(event, out);
