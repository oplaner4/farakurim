import type { Position, Venue, VenueAddress } from "@/content/types/venues";
import { positionMapHref } from "@/lib/shared/links";
import { slug } from "@/lib/shared/slug";
import { formatAddress } from "@/lib/shared/venues";
import { next, tell } from "../output";
import { addressOf, distanceMetres, geocode, municipalityOf, rgeocode, shareLinkPosition, type MapyItem } from "./mapy";

// Places looked up on Mapy.com inside one municipality, printed numbered for the agent to judge, and the same places
// as venue candidates: records `add` takes once one is chosen and named.

export const positionText = ({ lat, lon }: Position) => `${lat}, ${lon}`;

const itemBlock = (item: MapyItem, i: number) => [
  `${i + 1}. ${item.name} (${item.label})`,
  `  address: ${formatAddress(addressOf(item))}`,
  `  position: ${positionText(item.position)}`,
  `  pin: ${positionMapHref(item.position)}`,
];

/**
 * A lookup result as a venue for `add`: named `name`, else a place's own name. An address or a point has none, so its
 * name stays empty (and it gets no id) for the agent to fill in; `add` refuses it until then.
 */
export type VenueCandidate = Omit<Venue, "id"> & { id?: string };

export function venueCandidate(
  { name, address, position }: { name: string; address: VenueAddress; position: Position },
  aliases: string[] = [],
): VenueCandidate {
  const trimmed = name.trim();
  return {
    ...(trimmed && { id: slug(`${address.municipality} ${trimmed}`) }),
    name: trimmed,
    address,
    position,
    ...(aliases.length > 0 && { aliases }),
  };
}

/** What `lookup` takes: one of a query, an address and a link, and what fills the candidates. */
export type LookupRequest = {
  municipality: string;
  query?: string;
  link?: string;
  address?: string;
  name?: string;
  aliases?: string[];
};

export type LookupResults = { lines: string[]; candidates: VenueCandidate[] };

/**
 * The position of a shared link, its address and the nearest venue; a candidate only for an exact point inside
 * `municipality`.
 */
async function linkResults(link: string, request: LookupRequest, list: Venue[], key: string): Promise<LookupResults> {
  const { municipality, name, aliases } = request;
  const { exact, ...position } = await shareLinkPosition(link);
  const [place] = await rgeocode(position, key);
  const nearest = list
    .map((v) => ({ v, metres: distanceMetres(v.position, position) }))
    .sort((a, b) => a.metres - b.metres)[0];
  const found = place && municipalityOf(place);
  const elsewhere = Boolean(found && found !== municipality);
  const lines = [
    `position: ${positionText(position)} (${exact ? "exact" : "approximate: the shared map's centre"})`,
    `  pin: ${positionMapHref(position)}`,
    ...(place ? [`  address: ${formatAddress(addressOf(place))}`] : []),
    ...(elsewhere ? [tell(`the position lies in ${found}, not in ${municipality}`)] : []),
    ...(nearest ? [`  nearest venue: ${nearest.v.id}, ${Math.round(nearest.metres)} m`] : []),
    ...(exact ? [] : [next("ask the user for the GPS line of the place's card and use it as the position")]),
  ];
  const usable = exact && place && !elsewhere;
  const candidates = usable ? [venueCandidate({ name: name ?? "", address: addressOf(place), position }, aliases)] : [];
  return { lines, candidates };
}

/** The places a name or an address finds in `municipality`, numbered, each a candidate. */
async function searchResults(request: LookupRequest, key: string): Promise<LookupResults> {
  const { municipality, query, address, name, aliases } = request;
  const types = address ? ["regional.address", "regional.street"] : ["poi", "regional.address"];
  const items = await geocode(address ?? query ?? "", { municipality, types }, key);
  if (items.length === 0) {
    const lines = [
      tell(`Mapy.com finds nothing like that in ${municipality}.`),
      next("ask the user for a Mapy.com link"),
    ];
    return { lines, candidates: [] };
  }
  const candidates = items.map((item) =>
    venueCandidate(
      { name: name ?? (item.type === "poi" ? item.name : ""), address: addressOf(item), position: item.position },
      aliases,
    ),
  );
  return { lines: items.flatMap(itemBlock), candidates };
}

/**
 * `lookup`: Mapy.com's places for a name, an address or a shared link, inside `municipality` only, numbered, and the
 * same places as venue candidates (none for a link's approximate position, or for one outside the municipality).
 */
export const lookupResults = (request: LookupRequest, list: Venue[], key: string): Promise<LookupResults> =>
  request.link ? linkResults(request.link, request, list, key) : searchResults(request, key);

/** What `lookup --out` prints about the candidates it wrote to `file` (nothing is written when there are none). */
export function candidatesLines(file: string, candidates: VenueCandidate[]): string[] {
  if (candidates.length === 0) return [tell(`no candidate written to ${file}`)];
  return [
    `Wrote ${candidates.length} candidate${candidates.length === 1 ? "" : "s"} to ${file}, numbered as above`,
    ...(candidates.some((c) => !c.name)
      ? [tell('a candidate without a name needs one: --name "<building>", or its name and id in venue.json')]
      : []),
    next("copy the chosen one into venue.json, then pnpm venue add venue.json --check"),
  ];
}
