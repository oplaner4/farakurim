import type { Venue } from "@/content/types/venues";
import { fold } from "@/lib/shared/czech";

// The rules of venue texts and of an event's venue that the site's content checks too: how place texts compare, and
// what makes an event's venue wrong.

/** A place text compared without case, accents, dots or extra spaces: "Kurim,  ARÉAL za farou." → "kurim, areal za farou". */
export const foldPlace = (text: string): string => fold(text).replace(/\./g, "").replace(/\s+/g, " ").trim();

/** The fields of an event a venue check reads. */
export type VenueFields = { place?: string; venue?: string; mapQuery?: string };

/**
 * What is wrong with an event's venue, as sentences naming the field; [] when nothing is. A venue in another
 * municipality than the place starts with is allowed (an event in several villages may take the one it is held at):
 * the venue scripts note it.
 */
export function venueProblems(event: VenueFields, venues: Record<string, Venue>): string[] {
  const { place, venue: id, mapQuery } = event;
  if (!id) return [];
  if (!Object.hasOwn(venues, id)) return [`venue: no venue with the id "${id}"`];
  const problems: string[] = [];
  if (!place) problems.push("venue: needs a place");
  if (mapQuery) problems.push("mapQuery: must be left out next to a venue, whose position gives the map link");
  return problems;
}
