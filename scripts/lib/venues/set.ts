import { isDeepStrictEqual } from "node:util";
import { places } from "@/content/masses";
import { readEvents } from "@/content/news";
import { nativitySeasons } from "@/content/nativity";
import { contacts } from "@/content/site";
import type { Venue, VenueId } from "@/content/types/venues";
import { parseOrThrow } from "@/lib/shared/json-file";
import { positionMapHref } from "@/lib/shared/links";
import { formatAddress } from "@/lib/shared/venues";
import { venueFileSchema, venueSchema } from "@/lib/venues/schema";
import { actionVerb } from "../command";
import { writeContentFile } from "../content-files";
import { next, refusal, tell } from "../output";
import { addressNote, municipalityAt, pickedRecord, readVenues } from "./add";
import { positionText } from "./lookup";

// A venue changed in place: its name, or its address and position from a lookup candidate. Its id and municipality
// never change (the id is made of them, and everything refers to it), and a venue is never removed.

/** What refers to a venue: the services' places, Kontakty (the parish office), Betlémy and the event records. */
export type VenueUse = { services: string[]; office: boolean; nativity: boolean; events: string[] };

/** What refers to the venue `id` in the content, the events of `newsDir` included. */
export function venueUse(id: VenueId, newsDir: string): VenueUse {
  return {
    services: Object.values(places)
      .filter((p) => p.venue === id)
      .map((p) => p.name),
    office: contacts.venue === id,
    nativity: nativitySeasons.some((s) => s.venue === id),
    events: readEvents(newsDir)
      .filter((e) => e.venue === id)
      .map((e) => e.id),
  };
}

function usedByLines({ services, office, nativity, events }: VenueUse): string[] {
  const used = [
    ...services.map((name) => `the services in ${name}`),
    ...(office ? ["Kontakty"] : []),
    ...(nativity ? ["Betlémy"] : []),
    ...(events.length > 0 ? [`the events ${events.join(", ")}`] : []),
  ];
  return used.length > 0 ? [`  used by: ${used.join("; ")}`] : ["  used by: nothing"];
}

/** What `set` changes: the name, and the candidate `pick` of `input` (a lookup file) for the address and position. */
export type SetOptions = { name?: string; input?: unknown; pick?: number };

const change = (label: string, before: string, after: string) =>
  before === after ? [] : [`  ${label}: ${before} → ${after}`];

/**
 * `set`: the venue `id` renamed and moved to a candidate's address and position (inside its municipality), checked
 * against the list and Mapy.com; written unless `check`. Returns the printed lines.
 */
export async function setVenue(
  file: string,
  id: VenueId,
  { name, input, pick, check, key, use }: SetOptions & { check: boolean; key: string; use: VenueUse },
): Promise<string[]> {
  const list = readVenues(file);
  const old = list.find((v) => v.id === id);
  if (!old) throw refusal(`there is no venue ${id}`, next("pnpm venue find lists the municipality's venues"));
  let updated: Venue = { ...old, ...(name !== undefined && { name: name.trim() }) };
  if (input !== undefined) {
    const record = pickedRecord(input, pick);
    const position = parseOrThrow(venueSchema.shape.position, record.position, "the candidate's position");
    const { municipality } = old.address;
    await municipalityAt(position, municipality, key);
    updated = { ...updated, address: { ...record.address, municipality } as Venue["address"], position };
  }
  updated = parseOrThrow(venueSchema, updated, "the venue");
  if (isDeepStrictEqual(updated, old)) return [tell(`${id} is already so: nothing to change`)];
  if (use.office && !isDeepStrictEqual(updated.address, old.address)) {
    throw refusal(
      `${id} is the parish office: its address is Kontakty's`,
      next("ask the maintainer: the office's address changes in Kontakty's code with it"),
    );
  }
  const venues = list.map((v) => (v.id === id ? updated : v));
  parseOrThrow(venueFileSchema, { venues }, "the venue list");
  const pins = change("pin", positionMapHref(old.position), positionMapHref(updated.position));
  const lines = [
    `${actionVerb(check, "update")} the venue ${id}`,
    ...change("name", old.name, updated.name),
    ...change("address", formatAddress(old.address), formatAddress(updated.address)),
    ...change("position", positionText(old.position), positionText(updated.position)),
    ...pins,
    ...usedByLines(use),
    ...(use.services.length > 0
      ? [tell("the name and address are every upcoming service's location in the Bohoslužby calendar")]
      : []),
    ...(input !== undefined ? await addressNote(updated, key) : []),
  ];
  if (!check) writeContentFile(file, { venues });
  return lines;
}
