import type { Position, Venue } from "@/content/types/venues";
import { positionMapHref } from "@/lib/shared/links";
import { formatAddress } from "@/lib/shared/venues";
import { next, tell } from "../output";
import {
  addressOf,
  distanceMetres,
  geocode,
  gpsPosition,
  municipalityOf,
  rgeocode,
  shareLinkPosition,
  type MapyItem,
} from "./mapy";

// Places looked up on Mapy.com inside one municipality, printed numbered for the agent to judge, and the same places
// as venue candidates: what Mapy.com knows of each, for `add` to take one of.

export const positionText = ({ lat, lon }: Position) => `${lat}, ${lon}`;

const itemBlock = (item: MapyItem, i: number) => [
  `${i + 1}. ${item.name} (${item.label})`,
  `  address: ${formatAddress(addressOf(item))}`,
  `  position: ${positionText(item.position)}`,
  `  pin: ${positionMapHref(item.position)}`,
];

/** A lookup result as Mapy.com gives it: a place's own name (empty for an address or a point), address and position. */
export type VenueCandidate = Pick<Venue, "name" | "address" | "position">;

/** What `lookup` takes: the municipality and one of a query, an address, a link and a GPS line. */
export type LookupRequest = {
  municipality: string;
  query?: string;
  link?: string;
  address?: string;
  position?: string;
};

export type LookupResults = { lines: string[]; candidates: VenueCandidate[] };

/**
 * A position (of a shared link or a GPS line), its address and the nearest venue; a candidate only for an exact one
 * inside `municipality`.
 */
async function positionResults(
  { exact, ...position }: Position & { exact: boolean },
  municipality: string,
  list: Venue[],
  key: string,
): Promise<LookupResults> {
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
    ...(exact ? [] : [next('ask the user for the GPS line of the place\'s card: --position "<GPS line>"')]),
  ];
  const usable = exact && place && !elsewhere;
  return { lines, candidates: usable ? [{ name: "", address: addressOf(place), position }] : [] };
}

/** The places a name or an address finds in `municipality`, numbered, each a candidate. */
async function searchResults({ municipality, query, address }: LookupRequest, key: string): Promise<LookupResults> {
  const types = address ? ["regional.address", "regional.street"] : ["poi", "regional.address"];
  const items = await geocode(address ?? query ?? "", { municipality, types }, key);
  if (items.length === 0) {
    const lines = [
      tell(`Mapy.com finds nothing like that in ${municipality}.`),
      next("ask the user for a Mapy.com link"),
    ];
    return { lines, candidates: [] };
  }
  const candidates = items.map((item) => ({
    name: item.type === "poi" ? item.name : "",
    address: addressOf(item),
    position: item.position,
  }));
  return { lines: items.flatMap(itemBlock), candidates };
}

/**
 * `lookup`: Mapy.com's places for a name, an address, a shared link or a GPS line, inside `municipality` only, numbered, and the
 * same places as venue candidates (none for a link's approximate position, or for one outside the municipality).
 */
export async function lookupResults(request: LookupRequest, list: Venue[], key: string): Promise<LookupResults> {
  const { municipality, link, position } = request;
  if (link) return positionResults(await shareLinkPosition(link), municipality, list, key);
  if (position) return positionResults({ ...gpsPosition(position), exact: true }, municipality, list, key);
  return searchResults(request, key);
}

/** What `lookup --out` prints about the candidates it wrote to `file` (nothing is written when there are none). */
export function candidatesLines(file: string, candidates: VenueCandidate[]): string[] {
  if (candidates.length === 0) return [tell(`no candidate written to ${file}`)];
  return [
    `Wrote ${candidates.length} candidate${candidates.length === 1 ? "" : "s"} to ${file}, numbered as above`,
    next(`pnpm venue add ${file} --pick <n> [--name "<building>"] [--alias "<text>"…] --check`),
  ];
}
