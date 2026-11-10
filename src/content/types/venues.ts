// Venues (venues.ts): the parish's buildings, written once and referred to by id from the services, Kontakty and
// Betlémy.

/** The parish's buildings, the one list of VenueId. */
export const VENUE_IDS = [
  "kurim-kostel",
  "kurim-fara",
  "kurim-kaple-panny-marie-bolestne",
  "kurim-kaple-jana-nepomuckeho",
  "moravske-kninice-kostel",
  "moravske-kninice-kaple-cyrila-a-metodeje",
  "moravske-kninice-kaple-jana-nepomuckeho",
  "jinacovice-kaple",
  "ceska-kaple",
] as const;
export type VenueId = (typeof VENUE_IDS)[number];

export type Venue = {
  /** "Kostel sv. Maří Magdalény", "Kaple Panny Marie Růžencové" */
  name: string;
  /** The village it stands in: "Kuřim". */
  village: string;
  /** The postal address. A church's is the Bohoslužby calendar's location: changing it rewrites every upcoming service. */
  address?: string;
  /** Mapy.cz search of its map link; without it, the link searches the address. */
  mapQuery?: string;
  /** Its page in the diocese catalogue (katalog.biskupstvi.cz). */
  catalogueHref?: string;
};
