import * as z from "zod";
import type { Venue, VenueId } from "@/content/types/venues";
import { venueFileSchema } from "@/lib/venues/schema";
import data from "./venues.json";

// The venues (src/content/venues.json, written by `pnpm venue`): the buildings the services, Kontakty, Betlémy, the
// Bohoslužby calendar and events refer to by id. Checked on import, so a broken file fails the build naming the field.

const parsed = venueFileSchema.safeParse(data);
if (!parsed.success) throw new Error(`src/content/venues.json is not valid:\n${z.prettifyError(parsed.error)}`);

/** In the file's order. */
export const venueList: Venue[] = parsed.data.venues;

/** By id. */
export const venues: Record<VenueId, Venue> = Object.fromEntries(venueList.map((v) => [v.id, v]));
