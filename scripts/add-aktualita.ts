// Adds a confirmed aktualita to src/content/news/ (farnost-create-aktualita skill): the record goes into the JSON
// file of its start month (news/<year>/<MM>.json, created for the month's first record), in start-date order, with
// `published` set to today in Prague. Prettier formats the file, then the news tests run. The record's rules are
// newsEventSchema's (src/lib/news/schema.ts).
//
// Usage: pnpm add-aktualita <record.json | -> [--check]
// The record is a NewsEvent as JSON, upload paths root-relative ("/uploads/aktuality/x.webp"). --check only
// validates the record and the news files and prints the target file, without writing. A record with
// `"pinned": true` takes the pin from the record pinned before (scripts/pin-aktualita.ts), named in the output.
// Then it checks the event in the Události calendar (scripts/aktualita-calendar.ts).
// `pnpm stage aktualita … --record <file>` (scripts/stage/cli.ts) adds the staged poster and attachments and
// calls addAktualita(), formatAndTest() and the calendar check itself.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import * as z from "zod";
import type { NewsEvent } from "@/content/types/news";
import { newsEventSchema } from "@/lib/news/schema";
import { pragueDate } from "@/lib/shared/prague";
import { reportCalendar } from "./aktualita-calendar";
import { formatAndTest, NEWS_DIR, writeMonth } from "./content-files";
import { assertPinnable, movePin, readMonths, unpinnedLines, withoutPin } from "./pin-aktualita";

/** The month file inside news/ for a record starting on `start`. */
export const monthFile = (start: string) => `${start.slice(0, 4)}/${start.slice(5, 7)}.json`;

/** `list` (in start-date order) with `record` after the last record that starts on or before it. */
export function insertRecord(list: NewsEvent[], record: NewsEvent): NewsEvent[] {
  const at = list.findIndex((e) => e.start > record.start);
  return at === -1 ? [...list, record] : list.toSpliced(at, 0, record);
}

/**
 * Adds `input` to the news folder `newsDir` and returns the files it wrote (relative to newsDir, the record's month
 * file first); `check` only validates. A pinned record takes the pin from every other record (movePin()). Throws with
 * every problem found, before anything is written.
 */
export function addAktualita(newsDir: string, input: unknown, { check = false, now = new Date() } = {}) {
  const withDate = input !== null && typeof input === "object" ? { published: pragueDate(now), ...input } : input;
  const parsed = newsEventSchema.safeParse(withDate);
  if (!parsed.success) throw new Error(`the record is not valid:\n${z.prettifyError(parsed.error)}`);
  const record = parsed.data.pinned === false ? withoutPin(parsed.data) : parsed.data;
  if (record.pinned) assertPinnable(record, pragueDate(now));
  // Reads and checks every month file, so a broken one stops the script before it writes.
  const months = readMonths(newsDir);
  if ([...months.values()].some((list) => list.some((e) => e.id === record.id))) {
    throw new Error(`id ${record.id} is already taken`);
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
  `${check ? "Would add" : "Added"} the record to src/content/news/${target}${created ? " (new file)" : ""}`;

const USAGE = "Usage: pnpm add-aktualita <record.json | -> [--check]";

/**
 * Reads the command line `args`: the record file (`-` for stdin) and --check. An unknown option throws with the usage,
 * so a typo of --check never writes.
 */
export function parseCommand(args: string[]): { file: string; check: boolean } {
  let parsed;
  try {
    parsed = parseArgs({ args, allowPositionals: true, options: { check: { type: "boolean" } } });
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : error}\n${USAGE}`);
  }
  if (parsed.positionals.length !== 1) throw new Error(USAGE);
  return { file: parsed.positionals[0], check: parsed.values.check ?? false };
}

// No top-level await: tsx runs the scripts as CommonJS (package.json has no "type": "module").
async function main() {
  let command: { file: string; check: boolean };
  try {
    command = parseCommand(process.argv.slice(2));
  } catch (error) {
    console.error(`add-aktualita: ${error instanceof Error ? error.message : error}`);
    process.exit(2);
  }
  const { file, check } = command;
  try {
    const input: unknown = JSON.parse(readFileSync(file === "-" ? 0 : file, "utf8"));
    const result = addAktualita(NEWS_DIR, input, { check });
    console.log([targetLine(result, check), ...unpinnedLines(result.unpinned, check)].join("\n"));
    if (!check) {
      await formatAndTest(
        result.written.map((f) => join(NEWS_DIR, f)),
        "src/content/news",
      );
      await reportCalendar(result.record);
    }
  } catch (error) {
    console.error(`add-aktualita: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Run as a command, not imported by the tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) void main();
