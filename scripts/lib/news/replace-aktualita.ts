// Corrects an aktualita already in src/content/news/ (farnost-correct-aktualita skill): the record with the same id
// is replaced, keeping its `published` and its pin (scripts/lib/news/pin-aktualita.ts moves the pin), and moves to the
// file of its new start month, in start-date order, when the start changed; a month file left without records is
// removed. Prettier formats the files, then the news tests run, and the event is checked in the Události calendar
// (scripts/lib/news/aktualita-calendar.ts). The id never changes: it is the detail page's URL.
//
// Usage: pnpm replace-aktualita <record.json | -> [--check]
// The record is the whole corrected NewsEvent as JSON. --check only validates it and prints where it goes and the
// fields that change, without writing. `pnpm stage aktualita … --corrected` (scripts/lib/stage/aktualita.ts) puts a
// corrected file into the record and calls replaceAktualita(), formatAndTest() and the calendar check itself.

import { readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { isDeepStrictEqual, parseArgs } from "node:util";
import * as z from "zod";
import type { NewsEvent } from "@/content/types/news";
import { newsEventSchema } from "@/lib/news/schema";
import { pragueDate } from "@/lib/shared/prague";
import { insertRecord, monthFile } from "./add-aktualita";
import { reportCalendar } from "./aktualita-calendar";
import { errorMessage } from "../command";
import { formatAndTestNews, NEWS_DIR, writeMonth } from "../content-files";
import { assertPinnable, readMonths, withoutPin } from "./pin-aktualita";

/** The fields that differ between `before` and `after`, in the order they first appear. */
export function changedFields(before: NewsEvent, after: NewsEvent): string[] {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])] as (keyof NewsEvent)[];
  return keys.filter((key) => !isDeepStrictEqual(before[key], after[key]));
}

/**
 * Replaces the record with `input`'s id in the news folder `newsDir` by `input` and returns the files it wrote and
 * removed (relative to newsDir, the record's month file first); `check` only validates. The record keeps its
 * `published` and its pin (pnpm pin-aktualita moves the pin). A new start month moves it to that month's file, in
 * start-date order; a new start in the same month moves it within the file. Throws, before anything is written, for
 * an unknown id, an invalid record or a change of the pin.
 */
export function replaceAktualita(newsDir: string, input: unknown, { check = false, now = new Date() } = {}) {
  // Reads and checks every month file, so a broken one stops the script before it writes.
  const months = readMonths(newsDir);
  const id = input !== null && typeof input === "object" && "id" in input ? input.id : undefined;
  const from = [...months].find(([, list]) => list.some((e) => e.id === id))?.[0];
  if (from === undefined) throw new Error(`there is no aktualita ${String(id)}: add a new one with pnpm add-aktualita`);
  const list = months.get(from) ?? [];
  const previous = list.find((e) => e.id === id) as NewsEvent;
  const { published: _published, ...fields } = input as Record<string, unknown>;
  const parsed = newsEventSchema.safeParse(previous.published ? { ...fields, published: previous.published } : fields);
  if (!parsed.success) throw new Error(`the record is not valid:\n${z.prettifyError(parsed.error)}`);
  const record = parsed.data.pinned === false ? withoutPin(parsed.data) : parsed.data;
  if (Boolean(record.pinned) !== Boolean(previous.pinned)) {
    throw new Error(`the pin of ${record.id} changes only with pnpm pin-aktualita: keep "pinned" as it is`);
  }
  if (record.pinned) assertPinnable(record, pragueDate(now));
  const target = monthFile(record.start);
  const rest = list.filter((e) => e.id !== record.id);
  // The record's month file first, then the file it left (without records, it is removed).
  const files: [string, NewsEvent[]][] =
    target !== from
      ? [
          [target, insertRecord(months.get(target) ?? [], record)],
          [from, rest],
        ]
      : [
          [
            target,
            record.start === previous.start
              ? list.map((e) => (e.id === record.id ? record : e))
              : insertRecord(rest, record),
          ],
        ];
  const kept = files.filter(([, events]) => events.length > 0).map(([file]) => file);
  const removed = files.filter(([, events]) => events.length === 0).map(([file]) => file);
  if (!check) {
    for (const [file, events] of files) if (events.length > 0) writeMonth(newsDir, file, events);
    for (const file of removed) {
      rmSync(join(newsDir, file));
      const year = dirname(join(newsDir, file));
      if (readdirSync(year).length === 0) rmSync(year, { recursive: true });
    }
  }
  return {
    record,
    previous,
    from,
    target,
    created: !months.has(target),
    changed: changedFields(previous, record),
    removed,
    written: check ? [] : kept,
  };
}

/** The lines saying how replaceAktualita() changed (or would change, with `check`) the news files. */
export function replaceLines(
  result: { from: string; target: string; created: boolean; changed: string[]; removed: string[] },
  check: boolean,
): string[] {
  const { from, target, created, changed, removed } = result;
  const where =
    from === target
      ? `${check ? "Would replace" : "Replaced"} the record in src/content/news/${target}`
      : `${check ? "Would move" : "Moved"} the record from src/content/news/${from} to src/content/news/${target}${created ? " (new file)" : ""}`;
  return [
    where,
    changed.length > 0 ? `Changed: ${changed.join(", ")}` : "Nothing changed",
    ...removed.map((file) => `${check ? "Would remove" : "Removed"} src/content/news/${file} (no record left)`),
  ];
}

const USAGE = "Usage: pnpm replace-aktualita <record.json | -> [--check]";

/**
 * Reads the command line `args`: the record file (`-` for stdin) and --check. An unknown option throws with the usage,
 * so a typo of --check never writes.
 */
export function parseCommand(args: string[]): { file: string; check: boolean } {
  let parsed;
  try {
    parsed = parseArgs({ args, allowPositionals: true, options: { check: { type: "boolean" } } });
  } catch (error) {
    throw new Error(`${errorMessage(error)}\n${USAGE}`);
  }
  if (parsed.positionals.length !== 1) throw new Error(USAGE);
  return { file: parsed.positionals[0], check: parsed.values.check ?? false };
}

/** Runs `pnpm replace-aktualita` (scripts/replace-aktualita.ts). */
export async function execute({ file, check }: { file: string; check: boolean }) {
  const input: unknown = JSON.parse(readFileSync(file === "-" ? 0 : file, "utf8"));
  const result = replaceAktualita(NEWS_DIR, input, { check });
  console.log(replaceLines(result, check).join("\n"));
  if (!check) {
    await formatAndTestNews(result.written);
    await reportCalendar(result.record);
  }
}
