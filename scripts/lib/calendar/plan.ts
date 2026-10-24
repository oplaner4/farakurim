import type { NewsEvent } from "@/content/types/news";
import type { IsoDate } from "@/content/types/shared";
import { eventDays, eventPaths, type GoogleEvent } from "@/lib/calendar/google-calendar";
import { eventHref } from "@/lib/news/events";
import { meetingsOf } from "@/lib/news/timing";
import { calendarEventId, desiredEvents, eventBody, type DesiredEvent } from "./desired";
import type { GoogleEventBody } from "./google-body";
import { bodyOf, differingFields, type BodyField } from "./in-line";
import type { CalendarSnapshot } from "./read";
import { matchingTitles } from "./titles";

// Plans the sync of the event records to the Události calendar without writing anything. A calendar event belongs
// to a record when its description holds the record's page URL ("owned"); a meeting without one claims the only
// calendar event without any page URL that day whose title matches, asks when that is not clear, or gets a new
// calendar event. Owned and claimed events are brought in line with the record, field by field.

export type { BodyField };

export type Change =
  | { kind: "add"; desired: DesiredEvent; body: GoogleEventBody }
  | {
      kind: "update";
      desired: DesiredEvent;
      target: GoogleEvent;
      /** The target holds no page URL yet: the update adds it. */
      claim: boolean;
      fields: BodyField[];
      body: Partial<GoogleEventBody>;
    };

/** What the sync leaves for a person to settle. */
export type Report =
  | { kind: "ask"; desired: DesiredEvent; candidates: GoogleEvent[] }
  | { kind: "unpaired"; newsId: string; meetings: IsoDate[]; events: GoogleEvent[] }
  | { kind: "orphan"; path: string; event: GoogleEvent }
  | { kind: "deleted"; desired: DesiredEvent };

export type SyncPlan = { changes: Change[]; reports: Report[] };

/** What one run has decided so far: the plan and the calendar events claimed by an earlier meeting. */
type Run = SyncPlan & { claimed: Set<string> };

/** A meeting no calendar event owns, with the calendar events without a page URL whose title matches its record's. */
type Unowned = { event: NewsEvent; item: DesiredEvent; free: GoogleEvent[] };

const isLive = (event: GoogleEvent) => event.status !== "cancelled";

const firstDay = (event: GoogleEvent): IsoDate | undefined => eventDays(event)?.date;

const lastDay = (event: GoogleEvent): IsoDate | undefined => {
  const days = eventDays(event);
  return days && (days.end ?? days.date);
};

/** Whether the event takes place on any day from `from` to `to`. */
const overlaps = (event: GoogleEvent, from: IsoDate, to: IsoDate): boolean => {
  const first = firstDay(event);
  const last = lastDay(event);
  return first !== undefined && last !== undefined && first <= to && last >= from;
};

/** The changes and reports that bring the Události calendar in line with `events`. */
export function planSync(events: NewsEvent[], snapshot: CalendarSnapshot, today: IsoDate): SyncPlan {
  const run: Run = { changes: [], reports: [], claimed: new Set() };
  // Every claim on a meeting's own day comes first, so a calendar event another meeting claims is never a
  // candidate elsewhere, whatever the order of the records.
  const unowned = events.flatMap((event) => planRecord(event, snapshot, today, run));
  const unclaimed = unowned.filter((meeting) => !claimOnDay(meeting, run));
  for (const meeting of unclaimed) planElsewhere(meeting, today, run);
  run.reports.push(...orphans(events, snapshot.instances, today));
  return { changes: run.changes, reports: run.reports };
}

/** Brings the owned calendar events of a record in line; returns its meetings without one. */
function planRecord(event: NewsEvent, snapshot: CalendarSnapshot, today: IsoDate, run: Run): Unowned[] {
  const items = desiredEvents(event, today);
  if (items.length === 0) return [];
  const weekly = items[0].key === "weekly";
  const source = weekly ? snapshot.masters : snapshot.instances;
  const pool = source.filter(isLive);
  const active = items.filter((item) => {
    const deleted = source.some((other) => other.id === item.googleId && !isLive(other));
    if (deleted) run.reports.push({ kind: "deleted", desired: item });
    return !deleted;
  });
  // The calendar events of meetings out of scope (over, or deleted by hand) are left as they are.
  const activeStarts = new Set(active.map((item) => item.meeting.start));
  const meetingStarts = new Set(meetingsOf(event).map((meeting) => meeting.start));
  const href = eventHref(event);
  const owned = pool.filter((candidate) => {
    const start = firstDay(candidate);
    const outOfScope = start !== undefined && meetingStarts.has(start) && !activeStarts.has(start);
    return !outOfScope && eventPaths(candidate.description).includes(href);
  });
  const { pairs, unowned } = pairOwned(event, active, owned, today, run);
  for (const [item, target] of pairs) update(item, target, false, run);
  // The sync's own event of the date before a move, deleted by hand, counts as the moved meeting's deleted event.
  const movedFrom =
    event.change?.status === "moved" ? calendarEventId(event.id, event.change.previousStart) : undefined;
  const deletedBeforeMove = movedFrom !== undefined && source.some((other) => other.id === movedFrom && !isLive(other));
  const free = pool.filter(
    (candidate) =>
      eventPaths(candidate.description).length === 0 && matchingTitles(candidate.summary ?? "", event.title),
  );
  return unowned.flatMap((item) => {
    if (!deletedBeforeMove || item.meeting.start !== event.start) return [{ event, item, free }];
    run.reports.push({ kind: "deleted", desired: item });
    return [];
  });
}

/**
 * Pairs the owned calendar events with the items by start date, then the leftovers in date order when both sides
 * have the same number, or the one leftover owned event with the first unpaired item. A past leftover owned event (not a repeating one) is left alone, unless the record was moved:
 * then it may be the event of its old date. Leftover owned events without items are orphans; any other mismatch is
 * reported, and its items change nothing. The items without an owned event are returned.
 */
function pairOwned(
  event: NewsEvent,
  items: DesiredEvent[],
  owned: GoogleEvent[],
  today: IsoDate,
  run: Run,
): { pairs: [DesiredEvent, GoogleEvent][]; unowned: DesiredEvent[] } {
  const pairs: [DesiredEvent, GoogleEvent][] = [];
  const left = [...owned];
  const isPast = (candidate: GoogleEvent) => !candidate.recurrence && (lastDay(candidate) ?? "") < today;
  const unpaired: DesiredEvent[] = [];
  for (const item of items) {
    const index = left.findIndex((candidate) => firstDay(candidate) === item.meeting.start);
    if (index === -1) unpaired.push(item);
    else pairs.push([item, left.splice(index, 1)[0]]);
  }
  if (event.change?.status !== "moved") {
    for (const past of left.filter(isPast)) left.splice(left.indexOf(past), 1);
  }
  if (left.length === 0 || unpaired.length === 0) {
    for (const orphan of left) {
      if (!isPast(orphan)) run.reports.push({ kind: "orphan", path: eventHref(event), event: orphan });
    }
    return { pairs, unowned: unpaired };
  }
  // One leftover owned event (a plan on the wrong day, its URL pasted by hand) is the first unpaired meeting's.
  if (left.length === 1) {
    const [first, ...rest] = unpaired;
    return { pairs: [...pairs, [first, left[0]]], unowned: rest };
  }
  if (left.length !== unpaired.length) {
    run.reports.push({
      kind: "unpaired",
      newsId: event.id,
      meetings: unpaired.map((item) => item.meeting.start),
      events: left,
    });
    return { pairs, unowned: [] };
  }
  left.sort((a, b) => (firstDay(a) ?? "").localeCompare(firstDay(b) ?? ""));
  return {
    pairs: [...pairs, ...unpaired.map((item, index): [DesiredEvent, GoogleEvent] => [item, left[index]])],
    unowned: [],
  };
}

/**
 * Claims the only free calendar event with a matching title on the meeting's days, or on the day before the move of
 * a moved record, and asks when there are several or that one is claimed already. False when there is none.
 */
function claimOnDay({ event, item, free }: Unowned, run: Run): boolean {
  const { start, end } = item.meeting;
  const previousStart = event.change?.status === "moved" && start === event.start ? event.change.previousStart : null;
  const onDay = free.filter((candidate) => overlaps(candidate, start, end));
  const onPreviousDay = previousStart
    ? free.filter((candidate) => overlaps(candidate, previousStart, previousStart))
    : [];
  const candidates = onDay.length > 0 ? onDay : onPreviousDay;
  if (candidates.length === 0) return false;
  const [only] = candidates;
  if (candidates.length === 1 && !run.claimed.has(only.id)) {
    run.claimed.add(only.id);
    update(item, only, true, run);
  } else {
    run.reports.push({ kind: "ask", desired: item, candidates });
  }
  return true;
}

/**
 * Asks when an unclaimed calendar event with a matching title, not over yet, is on another day of the meeting's year;
 * else adds.
 */
function planElsewhere({ item, free }: Unowned, today: IsoDate, run: Run): void {
  const year = item.meeting.start.slice(0, 4);
  const candidates = free.filter(
    (candidate) =>
      !run.claimed.has(candidate.id) &&
      firstDay(candidate)?.slice(0, 4) === year &&
      (lastDay(candidate) ?? "") >= today,
  );
  if (candidates.length > 0) run.reports.push({ kind: "ask", desired: item, candidates });
  else if (!item.meeting.cancelled) run.changes.push({ kind: "add", desired: item, body: eventBody(item) });
}

/** Brings `target` in line with `item`; a claim always writes the description, which adds the page URL. */
function update(item: DesiredEvent, target: GoogleEvent, claim: boolean, run: Run): void {
  const body = eventBody(item, target);
  const differing = differingFields(body, target, item.key === "weekly");
  const fields = claim && !differing.includes("description") ? [...differing, "description" as const] : differing;
  if (fields.length === 0) return;
  run.changes.push({ kind: "update", desired: item, target, claim, fields, body: bodyOf(body, fields) });
}

/** Live calendar events, today or later, that link a page no record has; a repeating event once. */
function orphans(events: NewsEvent[], instances: GoogleEvent[], today: IsoDate): Report[] {
  const paths = new Set(events.map(eventHref));
  const seen = new Set<string>();
  return instances.filter(isLive).flatMap((event) => {
    if ((lastDay(event) ?? "") < today) return [];
    return eventPaths(event.description).flatMap((path): Report[] => {
      const key = `${path} ${event.recurringEventId ?? event.id}`;
      if (paths.has(path) || seen.has(key)) return [];
      seen.add(key);
      return [{ kind: "orphan", path, event }];
    });
  });
}
