// Pins an aktualita for "Doporučujeme" on Aktuality (design/DESIGN.md §11), unpinning every other record: at most
// one record is pinned (news.test.ts), and movePin() is the only code that changes `pinned`, also for a new pinned
// record (scripts/add-aktualita.ts). An event that has ended cannot be pinned (featuredEvent() would skip it).
// Prettier formats the changed month files, then the news tests run.
//
// Usage: pnpm pin-aktualita <id> | --none [--check]
// --none unpins every record. --check only validates and prints what would change, without writing.

import { parseArgs } from "node:util";
import { monthFiles, readMonth } from "@/content/news";
import type { IsoDate } from "@/content/types/shared";
import type { NewsEvent } from "@/content/types/news";
import { eventEnd } from "@/lib/news/events";
import { pragueDate } from "@/lib/shared/prague";
import { errorMessage, runCommand } from "./command";
import { formatAndTestNews, NEWS_DIR, writeMonth } from "./content-files";

/** Every month file under `newsDir` (`<year>/<MM>.json` → its records), in readEvents() order. */
export const readMonths = (newsDir: string) =>
  new Map(monthFiles(newsDir).map((file) => [file, readMonth(newsDir, file)]));

/** `event` without the `pinned` key (an unpinned record has none, never `"pinned": false`). */
export function withoutPin(event: NewsEvent): NewsEvent {
  const { pinned: _pinned, ...rest } = event;
  return rest;
}

/** Throws when `event` has ended by `today`: "Doporučujeme" only shows an event until its last day. */
export function assertPinnable(event: NewsEvent, today: IsoDate) {
  if (eventEnd(event) < today) throw new Error(`cannot pin ${event.id}: it ended on ${eventEnd(event)}`);
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
  unpinned.map((e) => `${check ? "Would unpin" : "Unpinned"} ${named(e)}`);

/** The lines saying what pinAktualita() changed (or would change, with `check`). */
export function pinLines(
  { pinned, unpinned, alreadyPinned = false }: { pinned?: NewsEvent; unpinned: NewsEvent[]; alreadyPinned?: boolean },
  check: boolean,
): string[] {
  if (pinned && alreadyPinned) return [`${named(pinned)} is already the only pinned aktualita`];
  const lines = unpinnedLines(unpinned, check);
  if (pinned) lines.push(`${check ? "Would pin" : "Pinned"} ${named(pinned)}`);
  return lines.length > 0 ? lines : ["Nothing is pinned"];
}

const USAGE = "Usage: pnpm pin-aktualita <id> | --none [--check]";

/**
 * Reads the command line `args`: the id or --none (null), and --check. An unknown option throws with the usage, so a
 * typo of --check never writes.
 */
export function parseCommand(args: string[]): { id: string | null; check: boolean } {
  let parsed;
  try {
    parsed = parseArgs({
      args,
      allowPositionals: true,
      options: { none: { type: "boolean" }, check: { type: "boolean" } },
    });
  } catch (error) {
    throw new Error(`${errorMessage(error)}\n${USAGE}`);
  }
  const { positionals, values } = parsed;
  if (positionals.length !== (values.none ? 0 : 1)) throw new Error(USAGE);
  return { id: values.none ? null : positionals[0], check: values.check ?? false };
}

runCommand("pin-aktualita", import.meta.url, parseCommand, async ({ id, check }) => {
  const result = pinAktualita(NEWS_DIR, id, { check });
  console.log(pinLines(result, check).join("\n"));
  await formatAndTestNews(result.written);
});
