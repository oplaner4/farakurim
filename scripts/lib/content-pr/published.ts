// What a content PR publishes, read from its content against the merge base, for the PR body: a week's announcements
// (each with its category and linked event) or, for a week already on the base, what changes in it; and the venues and
// aliases the venue list gains. The agent's report does not hold them, so they always match the content.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { decodeHTML } from "entities";
import { readEvents } from "@/content/news";
import type { NewsEvent } from "@/content/types/news";
import type { Announcement, ServiceSheetRecord } from "@/content/types/services";
import type { Venue } from "@/content/types/venues";
import { venueMapHref } from "@/lib/shared/links";
import { formatAddress } from "@/lib/shared/venues";
import { changedLine } from "../changes";
import { sheetChanges } from "../services/sheet-changes";
import type { Week } from "../services/sheet-week";
import { atBase, inCheckout } from "./changes";

const SHEETS = "src/content/service-sheets.json";
const NEWS = "src/content/news";
const VENUES = "src/content/venues.json";

/** How many characters of an announcement's text the body shows. */
const TEXT_LENGTH = 120;

/** What the PR body shows of the content: a week's lines (none for a week the content lacks), and the new venues. */
export type Published = {
  week: (week: Week) => string[];
  venues: string[];
};

/** Nothing to show: for a body without the content. */
export const NOTHING_PUBLISHED: Published = { week: () => [], venues: [] };

const sheetsOf = (text: string | undefined): ServiceSheetRecord[] =>
  text ? ((JSON.parse(text) as { sheets?: ServiceSheetRecord[] }).sheets ?? []) : [];

const venuesOf = (text: string | undefined): Venue[] =>
  text ? ((JSON.parse(text) as { venues?: Venue[] }).venues ?? []) : [];

const sameWeek = (sheet: Week, week: Week) => sheet.validFrom === week.validFrom && sheet.validTo === week.validTo;

/** The announcement's text without its markup (a block's end as a space), cut at TEXT_LENGTH characters. */
function plainText(html: string): string {
  const text = decodeHTML(html.replace(/<\/?(?:p|br|li|ul|ol)\b[^>]*>/gi, " ").replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
  return text.length > TEXT_LENGTH ? `${text.slice(0, TEXT_LENGTH).trimEnd()}…` : text;
}

/** One announcement: its category and text, and the event it links (`newsId`), looked up in `events`. */
function announcementLine({ category, html, newsId }: Announcement, events: () => Map<string, NewsEvent>): string {
  const event = newsId === undefined ? undefined : events().get(newsId);
  const linked = newsId === undefined ? "" : ` (event ${newsId}${event ? `: ${event.title}, ${event.start}` : ""})`;
  return `- ${category}: ${plainText(html)}${linked}`;
}

/** The lines of `sheet`: its announcements when `before` lacks it, else what differs from `before`. */
function weekLines(
  sheet: ServiceSheetRecord,
  before: ServiceSheetRecord | undefined,
  events: () => Map<string, NewsEvent>,
) {
  if (before) {
    const changed = sheetChanges(before, sheet);
    return [changed.length ? `${changedLine(changed)} (against main)` : "No change against main."];
  }
  const lines = sheet.announcements.map((announcement) => announcementLine(announcement, events));
  return lines.length ? ["Announcements:", ...lines] : ["No announcements."];
}

/** The lines of the venues `after` adds to `before`: each new venue with its pin, and each new alias. */
function venueLines(before: Venue[], after: Venue[]): string[] {
  return after.flatMap((venue) => {
    const old = before.find((candidate) => candidate.id === venue.id);
    const known = new Set(old?.aliases ?? []);
    const added = old
      ? []
      : [`- New venue ${venue.id}: ${venue.name}, ${formatAddress(venue.address)} — pin: ${venueMapHref(venue)}`];
    const aliases = (venue.aliases ?? []).filter((alias) => !known.has(alias));
    return [...added, ...aliases.map((alias) => `- New alias "${alias}" for ${venue.id}`)];
  });
}

/** What the content in `cwd` publishes against the commit `base`. */
export function publishedContent(cwd: string, base: string): Published {
  const sheets = sheetsOf(inCheckout(cwd, SHEETS));
  const baseSheets = sheetsOf(atBase(cwd, base, SHEETS));
  let events: Map<string, NewsEvent> | undefined;
  // Read only for an announcement that links an event.
  const eventsById = () => {
    const dir = join(cwd, NEWS);
    events ??= new Map((existsSync(dir) ? readEvents(dir) : []).map((event) => [event.id, event]));
    return events;
  };
  return {
    week: (week) => {
      const sheet = sheets.find((candidate) => sameWeek(candidate, week));
      if (!sheet) return [];
      return weekLines(
        sheet,
        baseSheets.find((candidate) => sameWeek(candidate, week)),
        eventsById,
      );
    },
    venues: venueLines(venuesOf(atBase(cwd, base, VENUES)), venuesOf(inCheckout(cwd, VENUES))),
  };
}
