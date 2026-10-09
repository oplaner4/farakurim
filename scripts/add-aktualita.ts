// Adds a confirmed aktualita to src/content/news/ (farnost-create-aktualita skill): the record goes into the JSON
// file of its start month (news/<year>/<MM>.json, created for the month's first record), in start-date order, with
// `published` set to today in Prague. Prettier formats the file, then the news tests run. The record's rules are
// newsEventSchema's (src/lib/news/schema.ts).
//
// Usage: pnpm add-aktualita <record.json | -> [--check]
// The record is a NewsEvent as JSON, upload paths root-relative ("/uploads/aktuality/x.webp"). --check only
// validates the record and the news files and prints the target file, without writing.
// Then it checks the event in the Události calendar (scripts/aktualita-calendar.ts).
// `pnpm stage aktualita … --record <file>` (scripts/stage/cli.ts) adds the staged poster and attachments and
// calls addAktualita(), formatAndTest() and the calendar check itself.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as z from "zod";
import { readMonth } from "@/content/news";
import type { NewsEvent } from "@/content/types/news";
import { newsEventSchema } from "@/lib/news/schema";
import { pragueDate } from "@/lib/shared/prague";
import { reportCalendar } from "./aktualita-calendar";
import { formatAndTest, NEWS_DIR, newsIds } from "./content-files";

/** The month file inside news/ for a record starting on `start`. */
export const monthFile = (start: string) => `${start.slice(0, 4)}/${start.slice(5, 7)}.json`;

/** `list` (in start-date order) with `record` after the last record that starts on or before it. */
export function insertRecord(list: NewsEvent[], record: NewsEvent): NewsEvent[] {
  const at = list.findIndex((e) => e.start > record.start);
  return at === -1 ? [...list, record] : list.toSpliced(at, 0, record);
}

/**
 * Adds `input` to the news folder `newsDir` and returns the file it wrote (relative to newsDir); `check` only
 * validates. Throws with every problem found, before anything is written.
 */
export function addAktualita(newsDir: string, input: unknown, { check = false, now = new Date() } = {}) {
  const withDate = input !== null && typeof input === "object" ? { published: pragueDate(now), ...input } : input;
  const parsed = newsEventSchema.safeParse(withDate);
  if (!parsed.success) throw new Error(`the record is not valid:\n${z.prettifyError(parsed.error)}`);
  const record = parsed.data;
  // Reads and checks every month file, so a broken one stops the script before it writes.
  if (newsIds(newsDir).has(record.id)) {
    throw new Error(`id ${record.id} is already taken`);
  }
  const target = monthFile(record.start);
  const path = join(newsDir, target);
  const created = !existsSync(path);
  if (!check) {
    const list = created ? [] : readMonth(newsDir, target);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(insertRecord(list, record), null, 2)}\n`);
  }
  return { record, target, created, written: check ? [] : [target] };
}

/** The line saying where the record went (or would go) in src/content/news/. */
export const targetLine = ({ target, created }: { target: string; created: boolean }, check: boolean) =>
  `${check ? "Would add" : "Added"} the record to src/content/news/${target}${created ? " (new file)" : ""}`;

// No top-level await: tsx runs the scripts as CommonJS (package.json has no "type": "module").
async function main() {
  const [file] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const check = process.argv.includes("--check");
  if (!file) {
    console.error("Usage: pnpm add-aktualita <record.json | -> [--check]");
    process.exit(2);
  }
  try {
    const input: unknown = JSON.parse(readFileSync(file === "-" ? 0 : file, "utf8"));
    const result = addAktualita(NEWS_DIR, input, { check });
    console.log(targetLine(result, check));
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
