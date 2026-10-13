import { endOfMonth, endOfWeek } from "date-fns";
import { links } from "@/content/site";
import type { NewsEvent, TagColor } from "@/content/types/news";
import type { IsoDate } from "@/content/types/shared";
import { formatShortDate } from "@/lib/shared/czech";
import { inPrague, pragueDate, pragueDateTime } from "@/lib/shared/prague";
import { EVENT_STATUS_LABEL, eventEnd, eventProgress, isCancelled, isPast, progressLabel } from "./timing";

// The Aktuality list: its filters, groups and card badges, and the links to an event's pages (design/DESIGN.md §11).
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

/**
 * A badge's look: `now` is the filled "Právě probíhá", `cancelled` the ink "Zrušeno", the rest are the tag colours.
 */
export type EventTagKind = "now" | "cancelled" | TagColor;

const progressTagKind = { now: "now", today: "magenta", next: "blue" } as const;

/**
 * The badges of an event card at the instant `now`, in order: "Přesunuto", the progress, open registration, key facts,
 * the record's own tags, then "Proběhlo". A cancelled event has only "Zrušeno" (§11.9).
 */
export function eventTags(event: NewsEvent, now: number): { kind: EventTagKind; label: string }[] {
  if (isCancelled(event)) return [{ kind: "cancelled", label: "Zrušeno" }];
  const today = pragueDate(now);
  const progress = eventProgress(event, now);
  const tags: { kind: EventTagKind; label: string }[] = [];
  if (event.change?.status === "moved") tags.push({ kind: "orange", label: "Přesunuto" });
  if (progress) tags.push({ kind: progressTagKind[progress.kind], label: progressLabel(progress) });
  if (event.registrationDeadline && event.registrationDeadline >= today) {
    tags.push({ kind: "orange", label: `Přihlášky do ${formatShortDate(event.registrationDeadline)}` });
  }
  if (event.price) tags.push({ kind: "blue", label: event.price });
  // "setkání" is the same word for every count.
  if (event.sessions) tags.push({ kind: "blue", label: `${event.sessions.length} setkání` });
  if (event.longTerm && event.longTerm !== true) tags.push({ kind: "blue", label: "Každý týden" });
  for (const tag of event.tags ?? []) tags.push({ kind: tag.color ?? "blue", label: tag.label });
  if (isPast(event, today)) tags.push({ kind: "grey", label: EVENT_STATUS_LABEL.past });
  return tags;
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

/** The pinned event for "Doporučujeme" while it is not finished, unless it is cancelled. */
export function featuredEvent(events: NewsEvent[], today: IsoDate): NewsEvent | undefined {
  return events.find((e) => e.pinned && !isCancelled(e) && eventEnd(e) >= today);
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
    if (isPast(e, today)) past.push(e);
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

/** Detail page (design/DESIGN.md §13): `/aktuality/<id>/`, so it stays when the title is reworded. */
export const eventHref = (event: NewsEvent) => `${links.news}${event.id}/`;

/** The `.ics` download of "Přidat do kalendáře" (§13.2). */
export const eventCalendarHref = (event: NewsEvent) => `${eventHref(event)}kalendar.ics`;

/**
 * The detail page's `<title>` before the parish name (design/DESIGN.md §13.5). When other events share the title
 * (a yearly "Adorační den farnosti"), the year of the start follows it, so search results tell them apart.
 */
export function eventPageTitle(event: NewsEvent, events: NewsEvent[]): string {
  const shared = events.some((e) => e.id !== event.id && e.title === event.title);
  return shared ? `${event.title} ${event.start.slice(0, 4)}` : event.title;
}

export const findEventById = (events: NewsEvent[], id: string) => events.find((e) => e.id === id);

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
