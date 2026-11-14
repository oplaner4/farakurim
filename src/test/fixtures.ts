import type { NewsEvent } from "@/content/types/news";
import type { Venue } from "@/content/types/venues";
import { pragueDateTime } from "@/lib/shared/prague";

// Fixtures shared by the site's tests: event records, instants of Prague time and the events of the event and archive
// tests.

/** A complete event record, valid for the record schema: "Hody v České" on 18. 10. 2026; `fields` replace defaults. */
export const newsEvent = (fields: Partial<NewsEvent> = {}): NewsEvent => ({
  id: "hody-v-ceske",
  title: "Hody v České",
  place: "Česká, náves",
  text: "Stavění máje.",
  start: "2026-10-18",
  ...fields,
});

/** A venue for "Hody v České": the sokolovna with a full postal address. */
export const sokolovna: Venue = {
  id: "ceska-sokolovna",
  name: "Sokolovna",
  address: { streetAddress: "Hlavní 1", postalCode: "664 31", municipality: "Česká", country: "Česko" },
  position: { lat: 49.28, lon: 16.56 },
};

/** A venue of `municipality` with only a name, an address and a position, and `aliases`. */
const venueAt = (id: string, name: string, municipality: string, aliases?: string[]): Venue => ({
  id,
  name,
  address: { municipality, country: "Česko" },
  position: { lat: 49.29, lon: 16.52 },
  aliases,
});

/** Venues to match places against: two chapels of one name in two municipalities, and one with an alias. */
export const matchVenues = [
  venueAt("kurim-fara", "Fara", "Kuřim", ["areál za farou"]),
  venueAt("kurim-kaple-jana-nepomuckeho", "Kaple sv. Jana Nepomuckého", "Kuřim"),
  venueAt("moravske-kninice-kaple-jana-nepomuckeho", "Kaple sv. Jana Nepomuckého", "Moravské Knínice"),
  venueAt("ceska-kaple", "Kaple Panny Marie Růžencové", "Česká"),
];

/** A bare event record: its id as the title, without a place or a text. */
export const event = (id: string, start: string, end?: string, extra: Partial<NewsEvent> = {}): NewsEvent => ({
  id,
  title: id,
  place: "",
  text: "",
  start,
  end,
  ...extra,
});

// Saturday 3. 10. 2026: the week ends on Sunday 4. 10., the month on 31. 10.
export const TODAY = "2026-10-03";

export const events = [
  event("later", "2026-12-19"),
  event("past", "2026-09-20"),
  event("ongoing", "2026-10-02", "2026-10-04"),
  event("soon", "2026-10-07"),
  event("pinned", "2026-10-18", undefined, { pinned: true }),
  event("weekly", "2026-10-01", "2027-04-29", { longTerm: { weeklyAt: "18:30" } }),
  event("long-past", "2026-03-01", "2026-09-30", { longTerm: true }),
];

export const ids = (list: NewsEvent[]) => list.map((e) => e.id);

/** An instant of a Prague date and time, as `useNow()` gives it. */
export const at = (date: string, time = "12:00") => pragueDateTime(date, time).getTime();
