import type { Venue, VenueId } from "@/content/types/venues";
import { venueFileSchema } from "@/lib/venues/schema";
import { parseOrThrow } from "@/lib/shared/parse";
import data from "./venues.json";

// The venues (src/content/venues.json, written by `pnpm venue`): the buildings the services, Kontakty, Betlémy, the
// Bohoslužby calendar and events refer to by id. Checked on import, so a broken file fails the build naming the field.

const parsed = parseOrThrow(venueFileSchema, data, "src/content/venues.json");

/** In the file's order. */
export const venueList: Venue[] = parsed.venues;

/** By id. */
export const venues: Record<VenueId, Venue> = Object.fromEntries(venueList.map((v) => [v.id, v]));
