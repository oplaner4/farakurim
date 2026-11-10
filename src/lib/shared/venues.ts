import type { Venue } from "@/content/types/venues";

/** Where a venue is, for the calendars: its name and postal address, or its name and village without one. */
export const venueLocation = (venue: Venue): string => `${venue.name}, ${venue.address ?? venue.village}`;
