import { differenceInCalendarDays, endOfMonth, endOfWeek } from "date-fns";
import { links } from "@/content/site";
import type { NewsEvent, TagColor } from "@/content/types/news";
import type { ClockTime, IsoDate } from "@/content/types/shared";
import { atClockTime, formatEventWhen, formatShortDate, plural, relativeDayName } from "@/lib/shared/czech";
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

export const eventEnd = (event: Pick<NewsEvent, "start" | "end">): IsoDate => event.end ?? event.start;

/** The label of a finished and a running event: card tags, the "Proběhlo" group and the detail page. */
export const EVENT_STATUS_LABEL = { past: "Proběhlo", now: "Právě probíhá" } as const;

/** Finished from the day after its last day (by date, so it moves to "Proběhlo" at midnight). */
export const isPast = (event: Pick<NewsEvent, "start" | "end">, today: IsoDate) => eventEnd(event) < today;

/** Cancelled (§11.9): the event does not take place, though its record and detail page stay. */
export const isCancelled = (event: Pick<NewsEvent, "change">) => event.change?.status === "cancelled";

/** "9:30" or "18:00–20:30"; other time texts ("po mši") make the event all-day. */
const CLOCK = /^(\d{1,2}:\d{2})(?:\s*[–-]\s*(\d{1,2}:\d{2}))?$/;

/** Start (and end) time of a time text, if it is a clock time. */
export function parseClock(time: string | undefined): { from: ClockTime; to?: ClockTime } | undefined {
  const match = CLOCK.exec(time ?? "");
  return match ? { from: match[1], to: match[2] } : undefined;
}

/**
 * Where a started event is right now (§11.6), computed, never stored: running (`now`), a meeting later today
 * (`today`), or a series between its meetings (`next`). Undefined before it starts, after it ends, and for
 * long-term and cancelled events.
 */
export type EventProgress = { kind: "now" } | { kind: "today"; time: ClockTime } | { kind: "next"; date: IsoDate };

/**
 * A meeting with a clock time on one day runs from its start time to its end time (or to midnight without one);
 * otherwise it runs all of its days. Dropped meetings are skipped.
 */
export function eventProgress(event: EventTiming, now: number): EventProgress | undefined {
  if (event.longTerm || isCancelled(event)) return undefined;
  const today = pragueDate(now);
  for (const meeting of meetingsOf(event)) {
    if (meeting.cancelled || meeting.end < today) continue;
    if (meeting.start > today) return event.start <= today ? { kind: "next", date: meeting.start } : undefined;
    const clock = meeting.start === meeting.end ? parseClock(meeting.time) : undefined;
    if (!clock) return { kind: "now" };
    if (now < pragueDateTime(today, clock.from).getTime()) return { kind: "today", time: clock.from };
    if (!clock.to || now < pragueDateTime(today, clock.to).getTime()) return { kind: "now" };
    // Today's meeting is over: the next one, if any.
  }
  return undefined;
}

/** "Právě probíhá", "Dnes v 18:00", "Další setkání 25. 10." */
export function progressLabel(progress: EventProgress): string {
  switch (progress.kind) {
    case "now":
      return EVENT_STATUS_LABEL.now;
    case "today":
      return `Dnes ${atClockTime(progress.time)}`;
    case "next":
      return `Další setkání ${formatShortDate(progress.date)}`;
  }
}

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

/**
 * Relative label of a detail page (§13.1) at the instant `now`: "Za 15 dní", "Za 3 dny", "Zítra" (by Prague calendar
 * days), then "Dnes", "Právě probíhá" (also a started long-term event), "Další setkání 25. 10.", and "Proběhlo".
 */
export function relativeEventLabel(event: EventTiming, now: number): string {
  const { start } = event;
  const today = pragueDate(now);
  if (isPast(event, today)) return EVENT_STATUS_LABEL.past;
  if (start <= today) {
    if (event.longTerm) return EVENT_STATUS_LABEL.now;
    const progress = eventProgress(event, now);
    if (progress?.kind === "next") return progressLabel(progress);
    // One day without a clock time stays "Dnes"; so does the rest of the day after today's last meeting.
    const known = eventEnd(event) > start || parseClock(event.time);
    return progress?.kind === "now" && known ? progressLabel(progress) : "Dnes";
  }
  const days = differenceInCalendarDays(pragueDateTime(start, "12:00"), pragueDateTime(today, "12:00"), {
    in: inPrague,
  });
  return relativeDayName(days) ?? `Za ${days} ${plural(days, ["den", "dny", "dní"])}`;
}

/**
 * A meeting of a series with its defaults filled in: its last day and its time text. `cancelled` when it does not
 * take place (the whole event cancelled, or the meeting dropped).
 */
export type Meeting = { start: IsoDate; end: IsoDate; time?: string; cancelled?: true };

/** The meetings of a series (`sessions`), empty for other events. */
export function eventMeetings(
  event: Pick<NewsEvent, "sessions" | "time"> & Partial<Pick<NewsEvent, "change" | "cancelledMeetings">>,
): Meeting[] {
  const dropped = new Set(event.cancelledMeetings?.dates);
  return (event.sessions ?? []).map((session) => {
    const meeting =
      typeof session === "string"
        ? { start: session, end: session, time: event.time }
        : { start: session.date, end: session.end ?? session.date, time: session.time ?? event.time };
    return isCancelled(event) || dropped.has(meeting.start) ? { ...meeting, cancelled: true } : meeting;
  });
}

/** The fields that say when an event takes place (what a client component needs for its progress). */
export type EventTiming = Pick<NewsEvent, "start" | "end" | "time" | "sessions" | "longTerm"> &
  Partial<Pick<NewsEvent, "change" | "cancelledMeetings">>;

/** The days the event takes place: each meeting of a series, the first day of a weekly one, else its span. */
export function meetingsOf(event: EventTiming): Meeting[] {
  if (event.sessions) return eventMeetings(event);
  const cancelled = isCancelled(event) && { cancelled: true as const };
  if (event.longTerm && event.longTerm !== true) {
    return [{ start: event.start, end: event.start, time: event.longTerm.weeklyAt, ...cancelled }];
  }
  return [{ start: event.start, end: eventEnd(event), time: event.time, ...cancelled }];
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

/** The poster's name after its file's: a WebP attachment would otherwise be overwritten by its own poster. */
export const POSTER_SUFFIX = "-poster.webp";

/** A file name without its extension: "/uploads/aktuality/x-plakat.pdf" → "/uploads/aktuality/x-plakat". */
const withoutExtension = (file: string) => file.replace(/\.[^./]+$/, "");

/** The poster WebP of an attachment file: "/uploads/aktuality/x-plakat.pdf" → "/uploads/aktuality/x-plakat-poster.webp". */
export const posterOf = (file: string) => withoutExtension(file) + POSTER_SUFFIX;

/** The name (without its extension) of the file a poster WebP was made from: before `-poster.webp`, or `.webp`. */
const posterSource = (src: string) => src.replace(/(-poster)?\.webp$/, "");

/** Whether the poster `src` was made from `file`: named `<file>-poster.webp`, or `<file>.webp` before that name. */
export const isPosterOf = (src: string, file: string) => posterSource(src) === withoutExtension(file);

/**
 * What the detail page's poster opens full size: the poster's original (its file is named like the poster WebP, before
 * `.webp` or, since `pnpm stage aktualita` names posters `<file>-poster.webp`, before `-poster.webp`), else the
 * "Plakát" attachment, else the WebP itself. Undefined without a poster or a "Plakát" attachment.
 */
export function posterHref(event: NewsEvent): string | undefined {
  const attachments = event.attachments ?? [];
  const base = event.poster && `${posterSource(event.poster.src)}.`;
  const original =
    attachments.find((a) => base && a.file.startsWith(base)) ?? attachments.find((a) => a.label === "Plakát");
  return original?.file ?? event.poster?.src;
}

/**
 * Alt text of a poster in the lightbox (design/DESIGN.md §21.3), which is often the only source of the details:
 * "Plakát: Farní den, neděle 18. října 2026 v 9:30, farní zahrada".
 */
export function posterAlt(event: NewsEvent): string {
  const when = formatEventWhen(event, { longMonth: true });
  return [`Plakát: ${event.title}`, when.time ? `${when.date} ${atClockTime(when.time)}` : when.date, event.place]
    .filter(Boolean)
    .join(", ");
}
