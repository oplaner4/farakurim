// Adds a confirmed aktualita to src/content/news/ (farnost-create-aktualita skill): the record goes into the JSON
// file of its start month (news/<year>/<MM>.json, created for the month's first record), in start-date order, with
// `published` set to today in Prague. Prettier formats the file, then the news tests run. The record's rules are
// newsEventSchema's (src/lib/news/schema.ts).
//
// Usage: pnpm add-aktualita <record.json | -> [--check]
// The record is a NewsEvent as JSON, upload paths root-relative ("/uploads/aktuality/x.webp"). --check only
// validates the record and the news files and prints the target file, without writing. A record with
// `"pinned": true` takes the pin from the record pinned before (scripts/lib/news/pin-aktualita.ts), named in the output.
// Then it checks the event in the Události calendar (scripts/lib/news/aktualita-calendar.ts).
// `pnpm stage aktualita … --record <file>` (scripts/lib/stage/command.ts) adds the staged poster and attachments and
// calls addAktualita(), formatAndTest() and the calendar check itself. A record already there is corrected with
// `pnpm replace-aktualita` (scripts/lib/news/replace-aktualita.ts).

import { monthFile, readMonths } from "@/content/news";
import type { NewsEvent } from "@/content/types/news";
import { newsEventSchema } from "@/lib/news/schema";
import { parseOrThrow } from "@/lib/shared/json-file";
import { pragueDate } from "@/lib/shared/prague";
import { reportCalendar } from "./aktualita-calendar";
import { actionVerb, parseCommandLine, readJsonRecord } from "../command";
import { formatAndTestNews, NEWS_DIR, writeMonth } from "../content-files";
import { assertPinnable, movePin, unpinnedLines, withoutPin } from "./pin-aktualita";

/** `list` (in start-date order) with `record` after the last record that starts on or before it. */
export function insertRecord(list: NewsEvent[], record: NewsEvent): NewsEvent[] {
  const at = list.findIndex((e) => e.start > record.start);
  return at === -1 ? [...list, record] : list.toSpliced(at, 0, record);
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
export function addAktualita(newsDir: string, input: unknown, { check = false, now = new Date() } = {}) {
  const record = parseRecord(input, now);
  // Reads and checks every month file, so a broken one stops the script before it writes.
  const months = readMonths(newsDir);
  if ([...months.values()].some((list) => list.some((e) => e.id === record.id))) {
    throw new Error(
      `id ${record.id} is already taken: to correct that aktualita, use pnpm replace-aktualita (or pnpm stage aktualita --corrected for a file)`,
    );
  }
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

const USAGE = "Usage: pnpm add-aktualita <record.json | -> [--check]";

/**
 * Reads the command line `args`: the record file (`-` for stdin) and --check. An unknown option throws with the usage,
 * so a typo of --check never writes.
 */
export function parseCommand(args: string[]): { file: string; check: boolean } {
  const { positionals, values } = parseCommandLine(args, { check: { type: "boolean" } }, USAGE);
  if (positionals.length !== 1) throw new Error(USAGE);
  return { file: positionals[0], check: values.check ?? false };
}

/** Runs `pnpm add-aktualita` (scripts/add-aktualita.ts). */
export async function execute({ file, check }: { file: string; check: boolean }) {
  const input = readJsonRecord(file);
  const result = addAktualita(NEWS_DIR, input, { check });
  console.log([targetLine(result, check), ...unpinnedLines(result.unpinned, check)].join("\n"));
  if (!check) {
    await formatAndTestNews(result.written);
    await reportCalendar(result.record);
  }
}
