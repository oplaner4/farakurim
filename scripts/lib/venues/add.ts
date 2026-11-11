import type { Position, Venue } from "@/content/types/venues";
import { parseOrThrow, readJsonFile } from "@/lib/shared/json-file";
import { positionMapHref } from "@/lib/shared/links";
import { slug } from "@/lib/shared/slug";
import { formatAddress } from "@/lib/shared/venues";
import { venueFileSchema, venueSchema } from "@/lib/venues/schema";
import { actionVerb } from "../command";
import { writeContentFile } from "../content-files";
import { next, refusal, tell } from "../output";
import { positionText } from "./lookup";
import { distanceMetres, geocode, municipalityOf, rgeocode } from "./mapy";

// The venue list's file: read and checked, and a new venue or alias written into it, each checked against the list
// and (a venue) Mapy.com first.

/** How far an address search may land from the position before `add` warns. */
const ADDRESS_DISTANCE_METRES = 150;

/** The venues of the file `file`, checked. */
export const readVenues = (file: string): Venue[] => readJsonFile(file, venueFileSchema).venues;

/** The municipality Mapy.com names at `position`; refuses another than `stated`. */
export async function municipalityAt(position: Position, stated: string | undefined, key: string): Promise<string> {
  const [here] = await rgeocode(position, key);
  const municipality = here && municipalityOf(here);
  if (!municipality) throw refusal("Mapy.com names no municipality at the position", next("check the pin"));
  if (stated && stated !== municipality) {
    throw refusal(`the position lies in ${municipality}, not in ${stated}`, next("check the pin, or the municipality"));
  }
  return municipality;
}

/** A note when a search of the venue's address lands far from its position (a typo, or the wrong pin). */
export async function addressNote(venue: Venue, key: string): Promise<string[]> {
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

/** What `add` changes on the venue it reads: the candidate `pick` (from 1) of a list, its name, aliases to add. */
export type AddOptions = { pick?: number; name?: string; aliases?: string[] };

/** The record `input` holds, or candidate `pick` (from 1) of the list it holds, as lookup's file numbers them. */
export function pickedRecord(input: unknown, pick: number | undefined): Partial<Venue> {
  let record = input;
  if (Array.isArray(input)) {
    if (pick === undefined) {
      const count = `${input.length} candidate${input.length === 1 ? "" : "s"}`;
      throw refusal(`the file holds ${count}`, next("--pick <n> takes one, numbered as lookup's"));
    }
    if (pick > input.length) throw refusal(`there is no candidate ${pick}: the file holds ${input.length}`);
    record = input[pick - 1];
  } else if (pick !== undefined) {
    throw refusal("--pick takes a candidate of a list, and the file holds one venue");
  }
  return (record !== null && typeof record === "object" ? record : {}) as Partial<Venue>;
}

/** The venue `input` holds, or candidate `pick` of the list it holds, named `name` and with `aliases` added. */
function chosenVenue(input: unknown, { pick, name, aliases = [] }: AddOptions): Partial<Venue> {
  const raw = pickedRecord(input, pick);
  const named = name ?? raw.name;
  if (typeof named !== "string" || !named.trim()) {
    throw refusal("the venue has no name", next('--name "<building>" names it ("Sokolovna")'));
  }
  const all = [...new Set([...(raw.aliases ?? []), ...aliases.map((a) => a.trim())])];
  return {
    ...raw,
    name: named.trim(),
    ...(all.length > 0 && { aliases: all.sort((a, b) => a.localeCompare(b, "cs")) }),
  };
}

/**
 * `add`: the venue `input` holds, or a candidate of the list it holds (`options`), its municipality taken from its
 * position and its id made of the municipality and the name, checked against the list and Mapy.com; written unless
 * `check`. Returns the printed lines.
 */
export async function addVenue(
  file: string,
  input: unknown,
  { check, key, ...options }: { check: boolean; key: string } & AddOptions,
) {
  const list = readVenues(file);
  const raw = chosenVenue(input, options);
  const position = parseOrThrow(venueSchema.shape.position, raw.position, "the venue's position");
  const municipality = await municipalityAt(position, raw.address?.municipality, key);
  const id = slug(`${municipality} ${raw.name}`);
  if (raw.id !== undefined && raw.id !== id) throw refusal(`the id must be ${id} (the municipality and the name)`);
  const venue = parseOrThrow(venueSchema, { ...raw, id, address: { ...raw.address, municipality } }, "the venue");
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
