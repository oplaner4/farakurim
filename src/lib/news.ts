import { endOfMonth, endOfWeek } from "date-fns";
import { links } from "@/content/site";
import type { IsoDate, NewsEvent } from "@/content/types";
import { inPrague, pragueDate, pragueDateTime } from "./prague";

// ISO dates (`YYYY-MM-DD`) compare correctly as strings, so the date maths here stays on strings.

/** Aktuality filters (design/DESIGN.md §11.3); `upcoming` is the default. */
export const NEWS_FILTERS = ["upcoming", "week", "month", "long", "all"] as const;
export type NewsFilter = (typeof NEWS_FILTERS)[number];

/**
 * Each filter is its own static page (`/aktuality/<slug>/`), so filtering works without JS and can be
 * shared. `slug` is empty for the default.
 */
export const NEWS_FILTER_META: Record<NewsFilter, { slug: string; label: string }> = {
  upcoming: { slug: "", label: "Nadcházející" },
  week: { slug: "tyden", label: "Tento týden" },
  month: { slug: "mesic", label: "Tento měsíc" },
  long: { slug: "dlouhodobe", label: "Dlouhodobé" },
  all: { slug: "vse", label: "Vše" },
};

export const filterFromSlug = (slug: string): NewsFilter | undefined =>
  NEWS_FILTERS.find((f) => NEWS_FILTER_META[f].slug === slug);

/** Cards per "page" of the Aktuality list; "Načíst další aktuality" shows the next batch. */
export const NEWS_PAGE_SIZE = 10;

export type EventStatus = "past" | "now" | "upcoming";

export const eventEnd = (event: Pick<NewsEvent, "start" | "end">): IsoDate => event.end ?? event.start;

/** Computed, never stored. Long-term series are never "now", they get their own group instead. */
export function eventStatus(event: NewsEvent, today: IsoDate): EventStatus {
  if (eventEnd(event) < today) return "past";
  if (!event.longTerm && event.start <= today) return "now";
  return "upcoming";
}

const byStart = (a: Pick<NewsEvent, "start">, b: Pick<NewsEvent, "start">) => a.start.localeCompare(b.start);

/** Homepage: the nearest upcoming or ongoing events, without long-term series. */
export function currentNews<T extends Pick<NewsEvent, "start" | "end" | "longTerm">>(
  events: T[],
  today: IsoDate,
  limit: number,
): T[] {
  return events
    .filter((e) => !e.longTerm && eventEnd(e) >= today)
    .sort(byStart)
    .slice(0, limit);
}

/** The pinned event for "Doporučujeme" while it is not finished. */
export function featuredEvent(events: NewsEvent[], today: IsoDate): NewsEvent | undefined {
  return events.find((e) => e.pinned && eventEnd(e) >= today);
}

const overlaps = (event: NewsEvent, from: IsoDate, to: IsoDate) => event.start <= to && eventEnd(event) >= from;

const prague = (today: IsoDate) => pragueDateTime(today, "12:00");
const weekEnd = (today: IsoDate) => pragueDate(endOfWeek(prague(today), { weekStartsOn: 1, in: inPrague }));
const monthEnd = (today: IsoDate) => pragueDate(endOfMonth(prague(today), { in: inPrague }));

/** Events matching a filter, without the featured one (it is not repeated in the list). */
export function filterEvents(events: NewsEvent[], filter: NewsFilter, today: IsoDate): NewsEvent[] {
  const featuredId = featuredEvent(events, today)?.id;
  const matches = (e: NewsEvent): boolean => {
    switch (filter) {
      case "upcoming":
        return eventEnd(e) >= today;
      case "week":
        return !e.longTerm && overlaps(e, today, weekEnd(today));
      case "month":
        return !e.longTerm && overlaps(e, today, monthEnd(today));
      case "long":
        return !!e.longTerm && eventEnd(e) >= today;
      case "all":
        return true;
    }
  };
  return events.filter((e) => e.id !== featuredId && matches(e));
}

export type EventGroup =
  { kind: "month"; month: IsoDate; events: NewsEvent[] } | { kind: "long" | "past"; events: NewsEvent[] };

/**
 * Groups for the list (§11.4): one per start month (ongoing events stay in the month they started),
 * then long-term series, then finished events. Each group is sorted by start date.
 */
export function groupEvents(events: NewsEvent[], today: IsoDate): EventGroup[] {
  const months = new Map<string, NewsEvent[]>();
  const long: NewsEvent[] = [];
  const past: NewsEvent[] = [];
  for (const e of events.toSorted(byStart)) {
    if (eventStatus(e, today) === "past") past.push(e);
    else if (e.longTerm) long.push(e);
    else {
      const month = e.start.slice(0, 7);
      const list = months.get(month);
      if (list) list.push(e);
      else months.set(month, [e]);
    }
  }
  const groups: EventGroup[] = [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, list]) => ({ kind: "month", month: `${month}-01`, events: list }));
  if (long.length > 0) groups.push({ kind: "long", events: long });
  if (past.length > 0) groups.push({ kind: "past", events: past });
  return groups;
}

/** "?strana=3" → 3; anything invalid → 1. */
export function parsePage(value: string | null): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 1 ? n : 1;
}

/** Lower case without diacritics, so "pout" finds "Pouť" and titles turn into URL parts. */
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** "Slavnostní mše k jubileu 800 let" → "slavnostni-mse-k-jubileu-800-let" */
export const slugify = (text: string) =>
  fold(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const eventSlug = (event: NewsEvent) => event.slug ?? slugify(event.title);

/** Detail page (design/DESIGN.md §13). */
export const eventHref = (event: NewsEvent) => `${links.news}${eventSlug(event)}/`;

/** The `.ics` download of "Přidat do kalendáře" (§13.2). */
export const eventCalendarHref = (event: NewsEvent) => `${eventHref(event)}kalendar.ics`;

export const findEventBySlug = (events: NewsEvent[], slug: string) => events.find((e) => eventSlug(e) === slug);

/** "Další akce" on a detail page: the nearest unfinished events other than this one. */
export const otherEvents = <T extends Pick<NewsEvent, "id" | "start" | "end" | "longTerm">>(
  events: T[],
  current: Pick<NewsEvent, "id">,
  today: IsoDate,
  limit: number,
) =>
  currentNews(
    events.filter((e) => e.id !== current.id),
    today,
    limit,
  );

// Archive (design/DESIGN.md §12)

/** Rows per "page" of the archive; "Načíst starší" shows the next batch. */
export const ARCHIVE_PAGE_SIZE = 20;

const startYear = (event: Pick<NewsEvent, "start">) => Number(event.start.slice(0, 4));

/** The fields the archive works with; the client gets only these (`ArchiveItem`). */
type Archivable = Pick<NewsEvent, "start" | "end" | "archiveHidden">;

/** Finished events (from the day after the end) not hidden by an admin, newest first. */
export function archivedEvents<T extends Archivable>(events: T[], today: IsoDate): T[] {
  return events
    .filter((e) => !e.archiveHidden && eventEnd(e) < today)
    .sort((a, b) => b.start.localeCompare(a.start) || eventEnd(b).localeCompare(eventEnd(a)));
}

/** Year of the most recent archived event, the archive's default; the current year when it is empty. */
export function latestArchiveYear(events: Archivable[], today: IsoDate): number {
  const newest = archivedEvents(events, today)[0];
  return newest ? startYear(newest) : Number(today.slice(0, 4));
}

/**
 * The year buttons "2026 · 2025 · Starší". Each is a static page (`/aktuality/archiv/<slug>/`, empty slug
 * for the default). The default also takes events of a newer year, which a visitor may see archived
 * before the next build adds its button.
 */
export function archiveYears(latest: number) {
  return [
    { slug: "", label: String(latest), matches: (e: Archivable) => startYear(e) >= latest },
    { slug: String(latest - 1), label: String(latest - 1), matches: (e: Archivable) => startYear(e) === latest - 1 },
    { slug: "starsi", label: "Starší", matches: (e: Archivable) => startYear(e) < latest - 1 },
  ];
}

export type ArchiveYear = ReturnType<typeof archiveYears>[number];

/** Search in the title and place, ignoring case and diacritics. */
export function searchEvents<T extends Pick<NewsEvent, "title" | "place">>(events: T[], query: string): T[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return events.filter((e) => {
    const haystack = fold(`${e.title} ${e.place}`);
    return words.every((w) => haystack.includes(w));
  });
}

/** Consecutive events of one start month ("Srpen 2026"); keeps the order of `events`. */
export function groupByMonth<T extends Pick<NewsEvent, "start">>(events: T[]): { month: IsoDate; events: T[] }[] {
  const groups: { month: IsoDate; events: T[] }[] = [];
  for (const e of events) {
    const month = `${e.start.slice(0, 7)}-01`;
    const last = groups.at(-1);
    if (last?.month === month) last.events.push(e);
    else groups.push({ month, events: [e] });
  }
  return groups;
}

/** "/aktuality/archiv/", "/aktuality/archiv/2025/" */
export const archiveYearHref = (slug: string) => (slug ? `${links.newsArchive}${slug}/` : links.newsArchive);
