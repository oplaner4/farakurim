// Replaces an event record in the news folder by the record with the same id, keeping its `published` and its
// pin (only movePin() changes the pin), and moves it to the file of its new start month, in start-date order, when
// the start changed; a month file left without records is removed. The id never changes: it is the detail page's URL.
// A draft writes the record of an id as it stands, to edit into the corrected one.

import { readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { monthFile, readMonths } from "@/content/news";
import type { NewsEvent } from "@/content/types/news";
import { newsEventSchema } from "@/lib/news/schema";
import { parseOrThrow } from "@/lib/shared/parse";
import { pragueDate } from "@/lib/shared/prague";
import { assertVenue, insertRecord, venueLines } from "./add-event";
import { changedKeys, changedLine } from "../changes";
import { actionVerb, parseCommandLine } from "../command";
import { NEWS_DIR, writeContentFile, writeMonth } from "../content-files";
import { next, refusal } from "../output";
import { assertPinnable, withoutPin } from "./pin-event";
import { recordCommand } from "./record-command";

/** The month file holding the record with `input`'s id, its records and the record; throws for an unknown id. */
function findRecord(months: Map<string, NewsEvent[]>, input: unknown) {
  const id = input !== null && typeof input === "object" && "id" in input ? input.id : undefined;
  for (const [from, list] of months) {
    const previous = list.find((e) => e.id === id);
    if (previous) return { from, list, previous };
  }
  throw refusal(`there is no event ${String(id)}`, next("pnpm add-event adds a new one"));
}

/** `input` checked as the record replacing `previous`: it keeps `published` and the pin. */
function parseReplacement(input: unknown, previous: NewsEvent, now: Date): NewsEvent {
  const { published: _published, ...fields } = input as Record<string, unknown>;
  const withDate = previous.published ? { ...fields, published: previous.published } : fields;
  const parsed = parseOrThrow(newsEventSchema, withDate, "the record");
  const record = parsed.pinned === false ? withoutPin(parsed) : parsed;
  if (Boolean(record.pinned) !== Boolean(previous.pinned)) {
    throw refusal(`the pin of ${record.id} changes only with pnpm pin-event`, next('keep "pinned" as it is'));
  }
  assertVenue(record);
  if (record.pinned) assertPinnable(record, pragueDate(now));
  return record;
}

/** The month files to write: the record's first, then the file `from` it left (without records, it is removed). */
function changedMonths(
  months: Map<string, NewsEvent[]>,
  { from, list, previous }: { from: string; list: NewsEvent[]; previous: NewsEvent },
  record: NewsEvent,
): [string, NewsEvent[]][] {
  const target = monthFile(record.start);
  const rest = list.filter((e) => e.id !== record.id);
  if (target !== from) {
    return [
      [target, insertRecord(months.get(target) ?? [], record)],
      [from, rest],
    ];
  }
  const same = record.start === previous.start;
  return [[target, same ? list.map((e) => (e.id === record.id ? record : e)) : insertRecord(rest, record)]];
}

/** Writes the month `files` with records and removes the ones without (and a year folder left empty). */
function writeMonthFiles(newsDir: string, files: [string, NewsEvent[]][]) {
  for (const [file, events] of files) {
    if (events.length > 0) {
      writeMonth(newsDir, file, events);
      continue;
    }
    rmSync(join(newsDir, file));
    const year = dirname(join(newsDir, file));
    if (readdirSync(year).length === 0) rmSync(year, { recursive: true });
  }
}

/**
 * Replaces the record with `input`'s id in the news folder `newsDir` by `input` and returns the files it wrote and
 * removed (relative to newsDir, the record's month file first); `check` only validates. The record keeps its
 * `published` and its pin (only movePin() moves the pin). A new start month moves it to that month's file, in
 * start-date order; a new start in the same month moves it within the file. Throws, before anything is written, for
 * an unknown id, an invalid record or a change of the pin.
 */
export function replaceEvent(newsDir: string, input: unknown, { check = false, now = new Date() } = {}) {
  // Reads and checks every month file, so a broken one stops the script before it writes.
  const months = readMonths(newsDir);
  const found = findRecord(months, input);
  const { from, previous } = found;
  const record = parseReplacement(input, previous, now);
  const target = monthFile(record.start);
  const files = changedMonths(months, found, record);
  const kept = files.filter(([, events]) => events.length > 0).map(([file]) => file);
  const removed = files.filter(([, events]) => events.length === 0).map(([file]) => file);
  if (!check) writeMonthFiles(newsDir, files);
  return {
    record,
    previous,
    from,
    target,
    changed: changedKeys(previous, record),
    removed,
    written: check ? [] : kept,
  };
}

/** The lines saying which record replaceEvent() replaced (or would replace, with `check`) and what changed. */
export function replaceLines(
  { record, changed }: { record: Pick<NewsEvent, "id" | "place" | "venue">; changed: string[] },
  check: boolean,
): string[] {
  return [`${actionVerb(check, "replace")} the record ${record.id}`, changedLine(changed), ...venueLines(record)];
}

export type DraftEventResult = { draft: NewsEvent; out: string };

/**
 * Writes the record with `id` in the news folder `newsDir` as it stands to `out`, whole (with its poster, attachments,
 * `published` and pin), to edit into the corrected record. Throws, before writing, for an unknown id.
 */
export function draftEvent(newsDir: string, { id, out }: { id: string; out: string }): DraftEventResult {
  const { previous } = findRecord(readMonths(newsDir), { id });
  writeContentFile(out, previous);
  return { draft: previous, out };
}

/** The line saying what draftEvent() wrote. */
export const draftLine = ({ draft, out }: DraftEventResult) =>
  `Wrote the draft record of ${draft.id} ("${draft.title}", ${draft.start}) to ${out}`;

const USAGE = "Usage: pnpm replace-event <record.json | -> [--check] | --draft <id> --out <record.json>";

/** Replaces the record in the file and prints what changed; then formats and tests the news files. */
const replaceCommand = recordCommand(USAGE, (input, check) => {
  const result = replaceEvent(NEWS_DIR, input, { check });
  return { lines: replaceLines(result, check), written: result.written };
});

export type ReplaceEventCommand = { file: string; check: boolean } | { draft: string; out: string };

/**
 * Reads the command line `args`: the record file (`-` for stdin) and --check, or --draft with its id and --out. An
 * unknown option throws with the usage, so a typo of --check never writes.
 */
export function parseCommand(args: string[]): ReplaceEventCommand {
  const options = { check: { type: "boolean" }, draft: { type: "string" }, out: { type: "string" } } as const;
  const { positionals, values } = parseCommandLine(args, options, USAGE);
  if (values.draft === undefined && values.out === undefined) return replaceCommand.parseCommand(args);
  const { draft, out } = values;
  if (positionals.length > 0 || values.check !== undefined || !draft || !out) throw new Error(USAGE);
  return { draft, out };
}

/** Writes the draft, or replaces the record and prints what changed (then formats and tests the news files). */
export async function execute(command: ReplaceEventCommand) {
  if ("draft" in command) {
    console.log(draftLine(draftEvent(NEWS_DIR, { id: command.draft, out: command.out })));
    return;
  }
  await replaceCommand.execute(command);
}
