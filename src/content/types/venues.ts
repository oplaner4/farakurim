// Venues (venues.json): the buildings services, Kontakty, Betlémy and events take place in, written once and referred
// to by id.

/** A venue's id: `<municipality>-<building>` kebab-case ("kurim-fara"), never changed once used. */
export type VenueId = string;

/** A point on the map, in degrees (WGS 84, as Mapy.com gives it). */
export type Position = { lat: number; lon: number };

/** Where a venue is, in the parts Mapy.com names (schema.org's names where they fit); `formatAddress()` joins them. */
export type VenueAddress = {
  /** Street and number as one text, as Mapy.com writes it: "Křížkovského 55/5", "Jinačovice 46", "Úvoz ev. č. 44". */
  streetAddress?: string;
  /** The part of the municipality, when the address names it: "Husovice". */
  part?: string;
  /** "664 34" */
  postalCode?: string;
  /** The municipality as Mapy.com names it ("Brno" for Brno-Husovice): what an event's `place` starts with. */
  municipality: string;
  /** "Česko" */
  country: string;
};

export type Venue = {
  id: VenueId;
  /** "Kostel sv. Maří Magdalény", "Kaple Panny Marie Růžencové" */
  name: string;
  /**
   * A church's is part of the Bohoslužby calendar's location (`venueLocation()`): changing it rewrites every upcoming
   * service.
   */
  address: VenueAddress;
  /** The building itself, confirmed on a pin: its map link and the `.ics` GEO. */
  position: Position;
  /** Texts of `place` already confirmed to mean this venue ("areál za farou"), matched folded within its municipality. */
  aliases?: string[];
  /** Its page in the diocese catalogue (katalog.biskupstvi.cz). */
  catalogueHref?: string;
};

/** src/content/venues.json */
export type VenueFile = { venues: Venue[] };
