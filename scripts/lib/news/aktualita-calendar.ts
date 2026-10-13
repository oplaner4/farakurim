// Matches an aktualita's meetings with the events of the Události Google Calendar: the calendar links an event to the
// detail page when the event's description holds the page's URL, so each meeting is linked (an event that day holds
// the URL), not linked (an event that day has a matching title) or missing. A found event's "Zrušeno: " title prefix
// must match the meeting's cancelled status, as the calendars take the status from the prefix alone. A moved
// aktualita's first meeting missing on its new date is looked for on the date before the move, to be moved there.
// Writes the aktualita's .ics for a missing one, and reads the calendar with NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY from
// .env.local.

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
  parseTitle,
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
  /** `moved`: missing on the meeting's day, but found on the day before the aktualita moved. */
  status: "linked" | "unlinked" | "missing" | "moved";
  /**
   * The calendar event found that day: `cancelled` when its title starts with "Zrušeno: ", `linked` when its
   * description links the page.
   */
  found?: { title: string; date: string; cancelled: boolean; linked: boolean };
};

/** The event of the aktualita in `calendar` on the days `from`–`to`: one linking `href`, else one with its title. */
function findEvent(calendar: GoogleEvent[], event: NewsEvent, href: string, from: string, to: string) {
  const sameDay = calendar.flatMap((e) => {
    const days = e.status === "cancelled" ? undefined : eventDays(e);
    return days && days.date <= to && (days.end ?? days.date) >= from ? [{ e, days }] : [];
  });
  const linked = sameDay.find(({ e }) => aktualitaPaths(e.description).includes(href));
  const match = linked ?? sameDay.find(({ e }) => sameTitle(parseTitle(e.summary).title, event.title));
  if (!match) return undefined;
  const { e, days } = match;
  const title = e.summary?.trim() ?? "";
  return { title, date: days.date, cancelled: parseTitle(e.summary).cancelled, linked: linked !== undefined };
}

/** How each meeting of `event` stands in the Události `calendar`. */
export function matchMeetings(event: NewsEvent, calendar: GoogleEvent[]): MeetingMatch[] {
  const href = eventHref(event);
  const { change } = event;
  return meetingsOf(event).map((meeting): MeetingMatch => {
    const found = findEvent(calendar, event, href, meeting.start, meeting.end);
    if (found) return { meeting, status: found.linked ? "linked" : "unlinked", found };
    if (change?.status === "moved" && meeting.start === event.start) {
      const before = findEvent(calendar, event, href, change.previousStart, change.previousStart);
      if (before) return { meeting, status: "moved", found: before };
    }
    return { meeting, status: "missing" };
  });
}

/** The days a calendar check reads: every meeting, and a moved aktualita's day before the move. */
function checkedRange(event: NewsEvent): { from: string; to: string } {
  const days = meetingsOf(event).flatMap((m) => [m.start, m.end]);
  if (event.change?.status === "moved") days.push(event.change.previousStart);
  days.sort();
  return { from: days[0], to: days.at(-1)! };
}

/** "13:00–18:00" or "13:00" after a date, or nothing for an all-day meeting. */
const timesText = ({ startTime, endTime }: Meeting) =>
  startTime ? ` ${startTime}${endTime ? `–${endTime}` : ""}` : "";

/** Writes the aktualita's .ics (as "Přidat do kalendáře" serves it) to `outDir`; returns its path. */
export function writeIcs(event: NewsEvent, outDir: string): string {
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, `${event.id}.ics`);
  writeFileSync(path, eventCalendar(event, `${SITE_URL}${eventHref(event)}`));
  return path;
}

const IMPORT =
  'import it into "Události" at https://calendar.google.com/calendar/u/0/r/settings/export, not into a personal calendar';
/** Closes a report that asks the user to add or link an event. */
const WHEN = "This can be done before or after the release: the Kalendář links the event once both are in place.";
/** Closes a report that asks the user to rename or move an event. */
const CHANGE_WHEN = "The Kalendář shows the change once Google has it, with or without a release.";

/** The title a found event should have, or undefined when its "Zrušeno: " prefix matches the meeting. */
function titleToSet({ meeting, found }: MeetingMatch): string | undefined {
  if (!found || found.cancelled === (meeting.cancelled ?? false)) return undefined;
  const { title } = parseTitle(found.title);
  return meeting.cancelled ? `Zrušeno: ${title}` : title;
}

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
  const range = checkedRange(event);
  let calendar: GoogleEvent[];
  try {
    calendar = await fetchGoogleCalendar(parishCalendars.events.googleId, apiKey, range, refererInit(SITE_URL));
  } catch (error) {
    return unchecked(errorMessage(error));
  }
  const matches = matchMeetings(event, calendar);
  if (matches.every((m) => m.status === "missing" && !m.meeting.cancelled)) {
    const days = meetings.map((m) => m.start).join(", ");
    return [`Události: no event on ${days}.`, `Wrote ${writeIcs(event, outDir)}: ${IMPORT}.`, WHEN];
  }
  const renames = matches.map(titleToSet);
  if (matches.every((m, i) => m.status === "linked" && !renames[i])) {
    const all = matches.length > 1 ? `, all ${matches.length} meetings` : ` on ${matches[0].found!.date}`;
    return [`Události: linked ("${matches[0].found!.title}"${all}): nothing to do.`];
  }
  // A series' meeting is often one occurrence of a recurring Google event: only that one changes.
  const occurrence = matches.length > 1 ? " (this occurrence only)" : "";
  const lines = matches.map((match, i) => {
    const { meeting, status, found } = match;
    const day = `Události, ${meeting.start}`;
    if (status === "missing") {
      return meeting.cancelled
        ? `${day}: no event, and the meeting is cancelled: nothing to do.`
        : `${day}: no event: add one with ${url} in its description.`;
    }
    const rename = renames[i]
      ? `rename "${found!.title}" to "${renames[i]}"${occurrence}, as the meeting is ${meeting.cancelled ? "cancelled (do not delete the event)" : "no longer cancelled"}`
      : undefined;
    if (status === "moved") {
      const also = [!found!.linked && `add ${url} to its description`, rename].filter(Boolean);
      const more = also.length > 0 ? `, then ${also.join(" and ")}` : "";
      return `${day}: "${found!.title}" is still on ${found!.date}: move it to ${meeting.start}${timesText(meeting)}${more}. Do not import an .ics: it would add a second event.`;
    }
    if (status === "unlinked") {
      return `${day}: "${found!.title}" has no link: add ${url} to its description${rename ? `, and ${rename}` : ""}.`;
    }
    return rename ? `${day}: linked, but ${rename}.` : `${day}: linked ("${found!.title}").`;
  });
  const closing = [
    ...(matches.some(
      (m) =>
        m.status === "unlinked" ||
        (m.status === "missing" && !m.meeting.cancelled) ||
        (m.status === "moved" && !m.found!.linked),
    )
      ? [WHEN]
      : []),
    ...(renames.some(Boolean) || matches.some((m) => m.status === "moved") ? [CHANGE_WHEN] : []),
  ];
  return [...lines, ...closing];
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
