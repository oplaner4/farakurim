import type { Venue } from "@/content/types/venues";
import { fold } from "@/lib/shared/czech";

// Matching an event's place with the venues: exact, after folding, never fuzzy. The municipality is stated by whoever
// reads the source, never parsed from `place`.

/** A place text compared without case, accents, dots or extra spaces: "Kurim,  ARÉAL za farou." → "kurim, areal za farou". */
export const foldPlace = (text: string): string => fold(text).replace(/\./g, "").replace(/\s+/g, " ").trim();

/**
 * The building part of `place` in `municipality`: the text after the first comma ("Kuřim, areál za farou" → "areál
 * za farou", "Brno-Husovice, fara" in Brno → "fara"), "" for the municipality alone, or null when `place` does not
 * start with the municipality as a whole word.
 */
export function buildingText(place: string, municipality: string): string | null {
  const folded = foldPlace(place);
  const start = foldPlace(municipality);
  if (!folded.startsWith(start) || !/^($|[, -])/.test(folded.slice(start.length))) return null;
  const comma = place.indexOf(",");
  return comma < 0 ? "" : place.slice(comma + 1).trim();
}

const inMunicipality = (venue: Venue, municipality: string) =>
  foldPlace(venue.address.municipality) === foldPlace(municipality);

export type VenueMatch =
  { kind: "known"; venue: Venue } | { kind: "candidates"; venues: Venue[] } | { kind: "wrong-municipality" };

/**
 * The venue of `municipality` whose name or alias is exactly the building text of `place`, else the municipality's
 * venues.
 */
export function findVenue(list: Venue[], municipality: string, place: string): VenueMatch {
  const building = buildingText(place, municipality);
  if (building === null) return { kind: "wrong-municipality" };
  const local = list.filter((v) => inMunicipality(v, municipality));
  const venue = local.find((v) => [v.name, ...(v.aliases ?? [])].some((t) => foldPlace(t) === foldPlace(building)));
  return venue ? { kind: "known", venue } : { kind: "candidates", venues: local };
}

/** What is wrong with an event's venue, as sentences naming the field; [] when nothing is. */
export function venueProblems(
  event: { place?: string; venue?: string; mapQuery?: string },
  venues: Record<string, Venue>,
): string[] {
  const { place, venue: id, mapQuery } = event;
  if (!id) return [];
  const venue = Object.hasOwn(venues, id) ? venues[id] : undefined;
  if (!venue) return [`venue: no venue with the id "${id}"`];
  const problems: string[] = [];
  if (!place) problems.push("venue: needs a place");
  else if (buildingText(place, venue.address.municipality) === null) {
    problems.push(`venue: ${id} is in ${venue.address.municipality}, but the place "${place}" does not start with it`);
  }
  if (mapQuery) problems.push("mapQuery: must be left out next to a venue, whose position gives the map link");
  return problems;
}
