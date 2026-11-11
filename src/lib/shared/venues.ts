import type { Venue, VenueAddress } from "@/content/types/venues";

/**
 * An address as Mapy.com writes it: "Křížkovského 55/5, 664 34 Kuřim, Česko", "Vranovská 766/103, 614 00 Brno -
 * Husovice, Česko"; the parts it lacks left out.
 */
export function formatAddress({ streetAddress, part, postalCode, municipality, country }: VenueAddress): string {
  const town = [postalCode, part ? `${municipality} - ${part}` : municipality].filter(Boolean).join(" ");
  return [streetAddress, town, country].filter(Boolean).join(", ");
}

/** Where a venue is, for the calendars: its name and address. */
export const venueLocation = (venue: Venue): string => `${venue.name}, ${formatAddress(venue.address)}`;
