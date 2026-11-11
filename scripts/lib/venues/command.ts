import { writeFileSync } from "node:fs";
import { readMonths } from "@/content/news";
import type { NewsEvent } from "@/content/types/news";
import type { Venue } from "@/content/types/venues";
import { actionVerb, parseCommandLine, readJsonRecord } from "../command";
import { formatAndTest, formatAndTestNews, NEWS_DIR, VENUES_FILE, writeMonth } from "../content-files";
import { tell } from "../output";
import { addAlias, addVenue, readVenues, type AddOptions } from "./add";
import { candidatesLines, lookupResults, type LookupRequest } from "./lookup";
import { mapyKey } from "./mapy";
import { setVenue, venueUse } from "./set";
import { findVenue, venuesOf, venuesWith } from "./match";

// The venue commands: their arguments, a municipality's venues narrowed by keywords, the records whose place matches
// a venue exactly, and each command run (the lookup and its candidates in lookup.ts, adding to the list in add.ts,
// changing a venue in set.ts).

export const USAGE = `Usage: pnpm venue find --municipality "<municipality>" [<keyword>…]
       pnpm venue lookup --municipality "<municipality>" ("<query>" | --link <Mapy.com link> | --address "<address>"
                         | --position "<GPS line>") [--out <candidates.json>]
       pnpm venue add <venue.json | candidates.json | -> [--pick <n>] [--name "<building>"] [--alias "<text>"…]
                      [--check]
       pnpm venue set <id> [--name "<name>"] [<candidates.json> --pick <n>] [--check]
       pnpm venue alias <id> "<text>" [--check]
       pnpm venue assign [--check]`;

export type VenueCommand =
  | { sub: "find"; municipality: string; keywords: string[] }
  | ({ sub: "lookup"; out?: string } & LookupRequest)
  | ({ sub: "add"; file: string; check: boolean } & AddOptions)
  | { sub: "set"; id: string; file?: string; pick?: number; name?: string; check: boolean }
  | { sub: "alias"; id: string; text: string; check: boolean }
  | { sub: "assign"; check: boolean };

const OPTIONS = {
  municipality: { type: "string" },
  link: { type: "string" },
  address: { type: "string" },
  position: { type: "string" },
  name: { type: "string" },
  alias: { type: "string", multiple: true },
  pick: { type: "string" },
  out: { type: "string" },
  check: { type: "boolean" },
} as const;

type Parsed = ReturnType<typeof parseCommandLine<typeof OPTIONS>>;

/** `lookup` takes exactly one of a query, --link, --address and --position; a name or an alias is `add`'s. */
function parseLookup({ positionals, values }: Parsed): VenueCommand | undefined {
  const { municipality, link, address, position, out } = values;
  const [query, ...extra] = positionals;
  const sources = [query, link, address, position].filter(Boolean).length;
  if (!municipality || extra.length > 0 || sources !== 1) return undefined;
  if (values.name !== undefined || values.alias !== undefined || values.pick !== undefined) return undefined;
  return {
    sub: "lookup",
    municipality,
    ...(query && { query }),
    ...(link && { link }),
    ...(address && { address }),
    ...(position && { position }),
    ...(out && { out }),
  };
}

const isPick = (pick: string | undefined) => pick === undefined || /^[1-9]\d*$/.test(pick);

/** `set` takes the venue's id, and a new name, a candidates file or both. */
function parseSet({ positionals: [id, file, ...extra], values: { pick, name, alias } }: Parsed, check: boolean) {
  if (!id || extra.length > 0 || alias !== undefined || !isPick(pick) || (name === undefined && !file))
    return undefined;
  if (pick !== undefined && !file) return undefined;
  return {
    sub: "set" as const,
    id,
    check,
    ...(file && { file }),
    ...(pick !== undefined && { pick: Number(pick) }),
    ...(name !== undefined && { name }),
  };
}

/** `add` takes one file, and --pick a whole number from 1. */
function parseAdd({ positionals, values: { pick, name, alias: aliases } }: Parsed, check: boolean) {
  if (positionals.length !== 1 || !isPick(pick)) return undefined;
  return {
    sub: "add" as const,
    file: positionals[0],
    check,
    ...(pick !== undefined && { pick: Number(pick) }),
    ...(name !== undefined && { name }),
    ...(aliases?.length && { aliases }),
  };
}

const PARSERS: Record<string, (parsed: Parsed, check: boolean) => VenueCommand | undefined> = {
  find: ({ positionals, values: { municipality } }) =>
    municipality ? { sub: "find", municipality, keywords: positionals } : undefined,
  lookup: parseLookup,
  add: parseAdd,
  set: parseSet,
  alias: ({ positionals: [id, text, ...extra] }, check) =>
    id && text && extra.length === 0 ? { sub: "alias", id, text, check } : undefined,
  assign: ({ positionals }, check) => (positionals.length === 0 ? { sub: "assign", check } : undefined),
};

export function parseCommand(args: string[]): VenueCommand {
  const [sub = "", ...rest] = args;
  const parsed = parseCommandLine(rest, OPTIONS, USAGE);
  const command = Object.hasOwn(PARSERS, sub) ? PARSERS[sub](parsed, parsed.values.check ?? false) : undefined;
  if (!command) throw new Error(USAGE);
  return command;
}

const aliasNote = (venue: Venue) => (venue.aliases?.length ? ` (${venue.aliases.join(", ")})` : "");

const venueLine = (v: Venue) => `  ${v.id}  ${v.name}${aliasNote(v)}`;

/**
 * `find`: the venues of `municipality` whose name or an alias holds any of `keywords`; all of them without keywords,
 * or after a note when none does.
 */
export function findLines(list: Venue[], municipality: string, keywords: string[] = []): string[] {
  const all = venuesOf(list, municipality);
  if (all.length === 0) return [tell(`${municipality} has no venues yet.`)];
  if (keywords.length === 0) return [`Venues of ${municipality}:`, ...all.map(venueLine)];
  const words = keywords.map((k) => `"${k}"`).join(", ");
  const found = venuesWith(list, municipality, keywords);
  if (found.length === 0)
    return [tell(`no venue of ${municipality} has ${words}; all of them:`), ...all.map(venueLine)];
  return [`Venues of ${municipality} with ${words}:`, ...found.map(venueLine)];
}

/** The record with `venue` right after its place. */
function withVenue(event: NewsEvent, venue: string): NewsEvent {
  return Object.fromEntries(
    Object.entries(event).flatMap(([key, value]) =>
      key === "place"
        ? [
            [key, value],
            ["venue", venue],
          ]
        : [[key, value]],
    ),
  ) as NewsEvent;
}

/**
 * `assign`: gives every record without a venue the one its place names exactly (in any municipality of the list);
 * writes the changed month files unless `check`.
 */
export function assignVenues(newsDir: string, list: Venue[], { check }: { check: boolean }) {
  const municipalities = [...new Set(list.map((v) => v.address.municipality))];
  const months = readMonths(newsDir);
  const lines: string[] = [];
  const changed: string[] = [];
  for (const [file, events] of months) {
    const updated = events.map((event) => {
      if (event.venue || !event.place) return event;
      const match = municipalities.map((m) => findVenue(list, m, event.place!)).find((m) => m.kind === "known");
      if (match?.kind !== "known") return event;
      lines.push(`${actionVerb(check, "set")} ${event.id} venue ${match.venue.id}`);
      return withVenue(event, match.venue.id);
    });
    if (updated.some((e, i) => e !== events[i])) {
      changed.push(file);
      if (!check) writeMonth(newsDir, file, updated);
    }
  }
  return { lines, written: check ? [] : changed };
}

export async function execute(command: VenueCommand) {
  if (command.sub === "find") {
    console.log(findLines(readVenues(VENUES_FILE), command.municipality, command.keywords).join("\n"));
  } else if (command.sub === "lookup") {
    const { lines, candidates } = await lookupResults(command, readVenues(VENUES_FILE), mapyKey());
    if (command.out) {
      if (candidates.length > 0) writeFileSync(command.out, `${JSON.stringify(candidates, null, 2)}\n`);
      lines.push(...candidatesLines(command.out, candidates));
    }
    console.log(lines.join("\n"));
  } else if (command.sub === "add") {
    const { sub: _, file, ...options } = command;
    const lines = await addVenue(VENUES_FILE, readJsonRecord(file), { ...options, key: mapyKey() });
    console.log(lines.join("\n"));
    if (!command.check) await formatAndTest([VENUES_FILE], ["src/content/venues.test.ts", "src/content/news"]);
  } else if (command.sub === "set") {
    const { id, file, pick, name, check } = command;
    const input = file === undefined ? undefined : readJsonRecord(file);
    const use = venueUse(id, NEWS_DIR);
    const lines = await setVenue(VENUES_FILE, id, { name, input, pick, check, key: mapyKey(), use });
    console.log(lines.join("\n"));
    if (!check) {
      const tests = ["src/content/venues.test.ts", "src/content/masses.test.ts", "src/content/news"];
      await formatAndTest([VENUES_FILE], tests);
    }
  } else if (command.sub === "alias") {
    console.log(addAlias(VENUES_FILE, command.id, command.text, { check: command.check }).join("\n"));
    if (!command.check) await formatAndTest([VENUES_FILE], ["src/content/venues.test.ts"]);
  } else {
    const { lines, written } = assignVenues(NEWS_DIR, readVenues(VENUES_FILE), { check: command.check });
    console.log(lines.length > 0 ? lines.join("\n") : "Nothing to set");
    await formatAndTestNews(written);
  }
}
