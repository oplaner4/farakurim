// Adds an event record to the news folder: the record goes into the JSON file of its start month
// (news/<year>/<MM>.json, created for the month's first record), in start-date order, with `published` set to today in
// Prague, and a pinned record takes the pin from every other one (movePin()). The record's rules are newsEventSchema's
// (src/lib/news/schema.ts).

import { monthFile, readMonths } from "@/content/news";
import type { NewsEvent } from "@/content/types/news";
import { newsEventSchema } from "@/lib/news/schema";
import { parseOrThrow } from "@/lib/shared/json-file";
import { pragueDate } from "@/lib/shared/prague";
import { reportCalendar } from "./event-calendar";
import { actionVerb, parseCommandLine, readJsonRecord } from "../command";
import { formatAndTestNews, NEWS_DIR, writeMonth } from "../content-files";
import { assertPinnable, movePin, unpinnedLines, withoutPin } from "./pin-event";

/** `list` (in start-date order) with `record` after the last record that starts on or before it. */
export function insertRecord(list: NewsEvent[], record: NewsEvent): NewsEvent[] {
  const at = list.findIndex((e) => e.start > record.start);
  return at === -1 ? [...list, record] : list.toSpliced(at, 0, record);
}

/**
 * The error for a new record whose id `taken` already holds: it names that event, so the caller can tell the same
 * event (to correct) from another one of the same title that year (it takes the start date instead of the year).
 */
export function takenIdError(taken: NewsEvent): Error {
  const dated = `${taken.id.replace(/-\d{4}$/, "")}-<start YYYY-MM-DD>`;
  return new Error(
    `id ${taken.id} is already taken by "${taken.title}" (${taken.start}): for another event of that title, use ${dated} instead; to correct that event, use pnpm replace-event (or pnpm stage event --corrected for a file)`,
  );
}

/** `input` checked as a new record, published `now` unless it says otherwise; a pinned one must be pinnable. */
function parseRecord(input: unknown, now: Date): NewsEvent {
  const withDate = input !== null && typeof input === "object" ? { published: pragueDate(now), ...input } : input;
  const parsed = parseOrThrow(newsEventSchema, withDate, "the record");
  const record = parsed.pinned === false ? withoutPin(parsed) : parsed;
  if (record.pinned) assertPinnable(record, pragueDate(now));
  return record;
}

/**
 * Adds `input` to the news folder `newsDir` and returns the files it wrote (relative to newsDir, the record's month
 * file first); `check` only validates. A pinned record takes the pin from every other record (movePin()). Throws with
 * every problem found, before anything is written.
 */
export function addEvent(newsDir: string, input: unknown, { check = false, now = new Date() } = {}) {
  const record = parseRecord(input, now);
  // Reads and checks every month file, so a broken one stops the script before it writes.
  const months = readMonths(newsDir);
  const taken = [...months.values()].flat().find((e) => e.id === record.id);
  if (taken) throw takenIdError(taken);
  const target = monthFile(record.start);
  const created = !months.has(target);
  months.set(target, insertRecord(months.get(target) ?? [], record));
  const { changed, unpinned } = record.pinned ? movePin(months, record.id) : { changed: new Map(), unpinned: [] };
  // The record's month file first; movePin() may have changed it too.
  const files = new Map<string, NewsEvent[]>([[target, months.get(target) ?? []], ...changed]);
  if (!check) for (const [file, list] of files) writeMonth(newsDir, file, list);
  return { record, target, created, unpinned, written: check ? [] : [...files.keys()] };
}

/** The line saying where the record went (or would go) in src/content/news/. */
export const targetLine = ({ target, created }: { target: string; created: boolean }, check: boolean) =>
  `${actionVerb(check, "add")} the record to src/content/news/${target}${created ? " (new file)" : ""}`;

const USAGE = "Usage: pnpm add-event <record.json | -> [--check]";

/**
 * Reads the command line `args`: the record file (`-` for stdin) and --check. An unknown option throws with the usage,
 * so a typo of --check never writes.
 */
export function parseCommand(args: string[]): { file: string; check: boolean } {
  const { positionals, values } = parseCommandLine(args, { check: { type: "boolean" } }, USAGE);
  if (positionals.length !== 1) throw new Error(USAGE);
  return { file: positionals[0], check: values.check ?? false };
}

/** Adds the record in `file` and prints where it went; then formats and tests the news files and checks the event. */
export async function execute({ file, check }: { file: string; check: boolean }) {
  const input = readJsonRecord(file);
  const result = addEvent(NEWS_DIR, input, { check });
  console.log([targetLine(result, check), ...unpinnedLines(result.unpinned, check)].join("\n"));
  if (!check) {
    await formatAndTestNews(result.written);
    await reportCalendar(result.record);
  }
}
