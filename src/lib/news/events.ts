import { endOfMonth, endOfWeek } from "date-fns";
import { links } from "@/content/site";
import type { NewsEvent, TagColor } from "@/content/types/news";
import type { IsoDate } from "@/content/types/shared";
import { formatEventWhen, formatShortDate } from "@/lib/shared/czech";
import { inPrague, pragueDate, pragueDateTime } from "@/lib/shared/prague";

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

/** A badge's look: `now` is the filled "Právě probíhá", the rest are the tag colours. */
export type EventTagKind = "now" | TagColor;

/**
 * The badges of an event card, in order: running, open registration, key facts, the record's own tags, then
 * "Proběhlo".
 */
export function eventTags(
  event: NewsEvent,
  status: EventStatus,
  today: IsoDate,
): { kind: EventTagKind; label: string }[] {
  const tags: { kind: EventTagKind; label: string }[] = [];
  if (status === "now") tags.push({ kind: "now", label: "Právě probíhá" });
  if (event.registrationDeadline && event.registrationDeadline >= today) {
    tags.push({ kind: "orange", label: `Přihlášky do ${formatShortDate(event.registrationDeadline)}` });
  }
  if (event.price) tags.push({ kind: "blue", label: event.price });
  // "setkání" is the same word for every count.
  if (event.sessions) tags.push({ kind: "blue", label: `${event.sessions.length} setkání` });
  if (event.longTerm && event.longTerm !== true) tags.push({ kind: "blue", label: "Každý týden" });
  for (const tag of event.tags ?? []) tags.push({ kind: tag.color ?? "blue", label: tag.label });
  if (status === "past") tags.push({ kind: "grey", label: "Proběhlo" });
  return tags;
}

/** A meeting of a series with its defaults filled in: its last day and its time text. */
export type Meeting = { start: IsoDate; end: IsoDate; time?: string };

/** The meetings of a series (`sessions`), empty for other events. */
export function eventMeetings(event: Pick<NewsEvent, "sessions" | "time">): Meeting[] {
  return (event.sessions ?? []).map((session) =>
    typeof session === "string"
      ? { start: session, end: session, time: event.time }
      : { start: session.date, end: session.end ?? session.date, time: session.time ?? event.time },
  );
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

/**
 * Alt text of a poster in the lightbox (design/DESIGN.md §21.3), which is often the only source of the details:
 * "Plakát: Farní den, neděle 18. října 2026 v 9:30, farní zahrada".
 */
export function posterAlt(event: NewsEvent): string {
  const when = formatEventWhen(event, { longMonth: true });
  return [`Plakát: ${event.title}`, when.time ? `${when.date} v ${when.time}` : when.date, event.place]
    .filter(Boolean)
    .join(", ");
}
