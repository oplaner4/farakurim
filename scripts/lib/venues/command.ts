import { readMonths } from "@/content/news";
import type { NewsEvent } from "@/content/types/news";
import type { Position, Venue } from "@/content/types/venues";
import { parseOrThrow, readJsonFile } from "@/lib/shared/json-file";
import { positionMapHref } from "@/lib/shared/links";
import { slug } from "@/lib/shared/slug";
import { formatAddress } from "@/lib/shared/venues";
import { findVenue } from "@/lib/venues/match";
import { venueFileSchema, venueSchema } from "@/lib/venues/schema";
import { actionVerb, parseCommandLine, readJsonRecord } from "../command";
import {
  formatAndTest,
  formatAndTestNews,
  NEWS_DIR,
  VENUES_FILE,
  writeContentFile,
  writeMonth,
} from "../content-files";
import { ask, next, refusal, tell } from "../output";
import {
  addressOf,
  distanceMetres,
  geocode,
  mapyKey,
  municipalityOf,
  rgeocode,
  shareLinkPosition,
  type MapyItem,
} from "./mapy";

// The venue list (src/content/venues.json) and the records' venues: an exact match of a place within its municipality,
// Mapy.com lookups inside one municipality, a new venue or alias written after the user's yes, and the records whose
// place matches a venue exactly.

export const USAGE = `Usage: pnpm venue find --municipality "<municipality>" "<place>"
       pnpm venue lookup --municipality "<municipality>" ("<query>" | --link <Mapy.com link> | --address "<address>")
       pnpm venue add <venue.json | -> [--check]
       pnpm venue alias <id> "<text>" [--check]
       pnpm venue assign [--check]`;

/** How far an address search may land from the position before `add` warns. */
const ADDRESS_DISTANCE_METRES = 150;

export type VenueCommand =
  | { sub: "find"; municipality: string; place: string }
  | { sub: "lookup"; municipality: string; query?: string; link?: string; address?: string }
  | { sub: "add"; file: string; check: boolean }
  | { sub: "alias"; id: string; text: string; check: boolean }
  | { sub: "assign"; check: boolean };

const OPTIONS = {
  municipality: { type: "string" },
  link: { type: "string" },
  address: { type: "string" },
  check: { type: "boolean" },
} as const;

type Parsed = ReturnType<typeof parseCommandLine<typeof OPTIONS>>;

/** `lookup` takes exactly one of a query, --link and --address. */
function parseLookup({ positionals, values: { municipality, link, address } }: Parsed): VenueCommand | undefined {
  const [query, ...extra] = positionals;
  if (!municipality || extra.length > 0 || [query, link, address].filter(Boolean).length !== 1) return undefined;
  return { sub: "lookup", municipality, ...(query && { query }), ...(link && { link }), ...(address && { address }) };
}

const PARSERS: Record<string, (parsed: Parsed, check: boolean) => VenueCommand | undefined> = {
  find: ({ positionals, values: { municipality } }) =>
    municipality && positionals.length === 1 ? { sub: "find", municipality, place: positionals[0] } : undefined,
  lookup: parseLookup,
  add: ({ positionals }, check) => (positionals.length === 1 ? { sub: "add", file: positionals[0], check } : undefined),
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

/** The venues of the file `file`, checked. */
export const readVenues = (file: string): Venue[] => readJsonFile(file, venueFileSchema).venues;

const aliasNote = (venue: Venue) => (venue.aliases?.length ? ` (${venue.aliases.join(", ")})` : "");

/** `find`: the venue `place` names in `municipality`, else the municipality's venues to choose from. */
export function findLines(list: Venue[], municipality: string, place: string): string[] {
  const match = findVenue(list, municipality, place);
  if (match.kind === "wrong-municipality") {
    throw refusal(
      `the place "${place}" does not start with ${municipality}`,
      next("name the municipality the place is in"),
    );
  }
  if (match.kind === "known") return [`Known venue: ${match.venue.id} (${match.venue.name})`];
  if (match.venues.length === 0) return [tell(`${municipality} has no venues yet.`)];
  return [
    ask(`"${place}" matches no venue of ${municipality}. Is it one of these, or a new venue?`),
    ...match.venues.map((v) => `  ${v.id}  ${v.name}${aliasNote(v)}`),
  ];
}

const positionText = ({ lat, lon }: Position) => `${lat}, ${lon}`;

const itemBlock = (item: MapyItem) => [
  `${item.name} (${item.label})`,
  `  address: ${formatAddress(addressOf(item))}`,
  `  position: ${positionText(item.position)}`,
  `  pin: ${positionMapHref(item.position)}`,
];

/** `lookup`: Mapy.com's places for a name, an address or a shared link, inside `municipality` only. */
export async function lookupLines(command: Extract<VenueCommand, { sub: "lookup" }>, list: Venue[], key: string) {
  const { municipality, query, link, address } = command;
  if (link) {
    const { exact, ...position } = await shareLinkPosition(link);
    const [place] = await rgeocode(position, key);
    const nearest = list
      .map((v) => ({ v, metres: distanceMetres(v.position, position) }))
      .sort((a, b) => a.metres - b.metres)[0];
    const found = place && municipalityOf(place);
    return [
      `position: ${positionText(position)} (${exact ? "exact" : "approximate: the shared map's centre"})`,
      `  pin: ${positionMapHref(position)}`,
      ...(place ? [`  address: ${formatAddress(addressOf(place))}`] : []),
      ...(found && found !== municipality ? [tell(`the position lies in ${found}, not in ${municipality}`)] : []),
      ...(nearest ? [`  nearest venue: ${nearest.v.id}, ${Math.round(nearest.metres)} m`] : []),
    ];
  }
  const types = address ? ["regional.address", "regional.street"] : ["poi", "regional.address"];
  const items = await geocode(address ?? query ?? "", { municipality, types }, key);
  if (items.length === 0)
    return [tell(`Mapy.com finds nothing like that in ${municipality}.`), next("ask the user for a Mapy.com link")];
  return items.flatMap(itemBlock);
}

/** The municipality Mapy.com names at `position`; refuses another than `stated`. */
async function municipalityAt(position: Position, stated: string | undefined, key: string): Promise<string> {
  const [here] = await rgeocode(position, key);
  const municipality = here && municipalityOf(here);
  if (!municipality) throw refusal("Mapy.com names no municipality at the position", next("check the pin"));
  if (stated && stated !== municipality) {
    throw refusal(`the position lies in ${municipality}, not in ${stated}`, next("check the pin, or the municipality"));
  }
  return municipality;
}

/** A note when a search of the venue's address lands far from its position (a typo, or the wrong pin). */
async function addressNote(venue: Venue, key: string): Promise<string[]> {
  if (!venue.address.streetAddress) return [];
  const types = ["regional.address", "regional.street"];
  const { municipality } = venue.address;
  const [found] = await geocode(formatAddress(venue.address), { municipality, types, limit: 1 }, key);
  const metres = found ? distanceMetres(found.position, venue.position) : 0;
  if (metres <= ADDRESS_DISTANCE_METRES) return [];
  return [
    tell(`a search of the address lands ${Math.round(metres)} m from the position: check the address, or the pin`),
  ];
}

/**
 * `add`: the venue `input` (its municipality taken from its position), checked against the list and Mapy.com;
 * written unless `check`. Returns the printed lines.
 */
export async function addVenue(file: string, input: unknown, { check, key }: { check: boolean; key: string }) {
  const list = readVenues(file);
  const raw = (input !== null && typeof input === "object" ? input : {}) as Partial<Venue>;
  const position = parseOrThrow(venueSchema.shape.position, raw.position, "the venue's position");
  const municipality = await municipalityAt(position, raw.address?.municipality, key);
  const venue = parseOrThrow(venueSchema, { ...raw, address: { ...raw.address, municipality } }, "the venue");
  const id = slug(`${municipality} ${venue.name}`);
  if (venue.id !== id) throw refusal(`the id must be ${id} (the municipality and the name)`);
  if (list.some((v) => v.id === venue.id)) {
    throw refusal(`${venue.id} is already a venue`, next("pnpm venue alias adds a text to it"));
  }
  const venues = [...list, venue];
  parseOrThrow(venueFileSchema, { venues }, "the venue list");
  const lines = [
    `${actionVerb(check, "add")} the venue ${venue.id}`,
    `  name: ${venue.name}`,
    `  address: ${formatAddress(venue.address)}`,
    `  position: ${positionText(venue.position)}`,
    ...(venue.aliases?.length ? [`  aliases: ${venue.aliases.join(", ")}`] : []),
    `  pin: ${positionMapHref(venue.position)}`,
    ...(await addressNote(venue, key)),
  ];
  if (!check) writeContentFile(file, { venues });
  return lines;
}

/** `alias`: adds `text` to the aliases of the venue `id` (sorted), unless another venue of its municipality has it. */
export function addAlias(file: string, id: string, text: string, { check }: { check: boolean }): string[] {
  const list = readVenues(file);
  const venue = list.find((v) => v.id === id);
  if (!venue) throw refusal(`there is no venue ${id}`, next("pnpm venue find lists the municipality's venues"));
  const aliases = [...new Set([...(venue.aliases ?? []), text.trim()])].sort((a, b) => a.localeCompare(b, "cs"));
  const venues = list.map((v) => (v === venue ? { ...v, aliases } : v));
  const parsed = venueFileSchema.safeParse({ venues });
  if (!parsed.success) throw refusal(parsed.error.issues.map((i) => i.message).join("; "));
  if (!check) writeContentFile(file, { venues });
  return [`${actionVerb(check, "add")} the alias "${text.trim()}" to ${id}`];
}

/** The record with `venue` right after its place, and without its `mapQuery`. */
function withVenue({ mapQuery: _, ...event }: NewsEvent, venue: string): NewsEvent {
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
      lines.push(
        `${actionVerb(check, "set")} ${event.id} venue ${match.venue.id}${event.mapQuery ? ", drop mapQuery" : ""}`,
      );
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
    console.log(findLines(readVenues(VENUES_FILE), command.municipality, command.place).join("\n"));
  } else if (command.sub === "lookup") {
    console.log((await lookupLines(command, readVenues(VENUES_FILE), mapyKey())).join("\n"));
  } else if (command.sub === "add") {
    const lines = await addVenue(VENUES_FILE, readJsonRecord(command.file), { check: command.check, key: mapyKey() });
    console.log(lines.join("\n"));
    if (!command.check) await formatAndTest([VENUES_FILE], ["src/content/venues.test.ts", "src/content/news"]);
  } else if (command.sub === "alias") {
    console.log(addAlias(VENUES_FILE, command.id, command.text, { check: command.check }).join("\n"));
    if (!command.check) await formatAndTest([VENUES_FILE], ["src/content/venues.test.ts"]);
  } else {
    const { lines, written } = assignVenues(NEWS_DIR, readVenues(VENUES_FILE), { check: command.check });
    console.log(lines.length > 0 ? lines.join("\n") : "Nothing to set");
    await formatAndTestNews(written);
  }
}
