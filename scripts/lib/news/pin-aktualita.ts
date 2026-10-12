// The pin of "Doporučujeme" on Aktuality (design/DESIGN.md §11): at most one record is pinned (news.test.ts), and
// movePin() is the only code that changes `pinned`, so pinning a record unpins every other one. An event that has
// ended cannot be pinned (featuredEvent() would skip it).

import { readMonths } from "@/content/news";
import type { IsoDate } from "@/content/types/shared";
import type { NewsEvent } from "@/content/types/news";
import { eventEnd, isCancelled } from "@/lib/news/events";
import { pragueDate } from "@/lib/shared/prague";
import { actionVerb, parseCommandLine } from "../command";
import { formatAndTestNews, NEWS_DIR, writeMonth } from "../content-files";

/** `event` without the `pinned` key (an unpinned record has none, never `"pinned": false`). */
export function withoutPin(event: NewsEvent): NewsEvent {
  const { pinned: _pinned, ...rest } = event;
  return rest;
}

/**
 * Throws when `event` has ended by `today` or is cancelled: "Doporučujeme" only shows an event until its last day,
 * and never a cancelled one.
 */
export function assertPinnable(event: NewsEvent, today: IsoDate) {
  if (eventEnd(event) < today) throw new Error(`cannot pin ${event.id}: it ended on ${eventEnd(event)}`);
  if (isCancelled(event)) {
    throw new Error(`cannot pin ${event.id}: it is cancelled (unpin it first with pnpm pin-aktualita --none)`);
  }
}

/**
 * Pins the record `id` (none for null) in `months` and unpins every other one, without writing. Returns the changed
 * month files with their new records, the records unpinned (in file order) and the pinned record, if `id` exists.
 */
export function movePin(months: Map<string, NewsEvent[]>, id: string | null) {
  const changed = new Map<string, NewsEvent[]>();
  const unpinned: NewsEvent[] = [];
  let pinned: NewsEvent | undefined;
  for (const [file, list] of months) {
    let touched = false;
    const next = list.map((e) => {
      if (e.id === id) {
        touched ||= !e.pinned;
        pinned = e.pinned ? e : { ...e, pinned: true };
        return pinned;
      }
      if (!e.pinned) return e;
      touched = true;
      unpinned.push(e);
      return withoutPin(e);
    });
    if (touched) changed.set(file, next);
  }
  return { changed, unpinned, pinned };
}

/**
 * Pins the record `id` in the news folder `newsDir` (null unpins every record) and returns the month files it wrote
 * (relative to newsDir); `check` only validates. Throws for an unknown id or an event that has ended, before writing.
 */
export function pinAktualita(newsDir: string, id: string | null, { check = false, now = new Date() } = {}) {
  const { changed, unpinned, pinned } = movePin(readMonths(newsDir), id);
  if (id !== null) {
    if (!pinned) throw new Error(`there is no aktualita ${id}`);
    assertPinnable(pinned, pragueDate(now));
  }
  if (!check) for (const [file, list] of changed) writeMonth(newsDir, file, list);
  return {
    pinned,
    unpinned,
    alreadyPinned: pinned !== undefined && changed.size === 0,
    written: check ? [] : [...changed.keys()],
  };
}

const named = (e: NewsEvent) => `${e.id} (${e.title})`;

/** The lines naming the records unpinned (or that would be, with `check`). */
export const unpinnedLines = (unpinned: NewsEvent[], check: boolean) =>
  unpinned.map((e) => `${actionVerb(check, "unpin")} ${named(e)}`);

/** The lines saying what pinAktualita() changed (or would change, with `check`). */
export function pinLines(
  { pinned, unpinned, alreadyPinned = false }: { pinned?: NewsEvent; unpinned: NewsEvent[]; alreadyPinned?: boolean },
  check: boolean,
): string[] {
  if (pinned && alreadyPinned) return [`${named(pinned)} is already the only pinned aktualita`];
  const lines = unpinnedLines(unpinned, check);
  if (pinned) lines.push(`${actionVerb(check, "pin")} ${named(pinned)}`);
  return lines.length > 0 ? lines : ["Nothing is pinned"];
}

const USAGE = "Usage: pnpm pin-aktualita <id> | --none [--check]";

/**
 * Reads the command line `args`: the id or --none (null), and --check. An unknown option throws with the usage, so a
 * typo of --check never writes.
 */
export function parseCommand(args: string[]): { id: string | null; check: boolean } {
  const options = { none: { type: "boolean" }, check: { type: "boolean" } } as const;
  const { positionals, values } = parseCommandLine(args, options, USAGE);
  if (positionals.length !== (values.none ? 0 : 1)) throw new Error(USAGE);
  return { id: values.none ? null : positionals[0], check: values.check ?? false };
}

/** Pins the record `id` (none for null) and prints what changed; then formats and tests the news files. */
export async function execute({ id, check }: { id: string | null; check: boolean }) {
  const result = pinAktualita(NEWS_DIR, id, { check });
  console.log(pinLines(result, check).join("\n"));
  await formatAndTestNews(result.written);
}
