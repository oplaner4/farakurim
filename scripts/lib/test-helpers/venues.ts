// Venue fixtures for the script tests: venue records, a venue list file and stubbed Mapy.com answers.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, vi } from "vitest";
import type { Venue } from "@/content/types/venues";
import { jsonResponse } from "@/test/fetch";
import { freshTempDir } from "./files";

/** A venue of `municipality` at the Kuřim church, with `extra` fields. */
export const venueRecord = (id: string, name: string, municipality: string, extra: Partial<Venue> = {}): Venue => ({
  id,
  name,
  address: { municipality, country: "Česko" },
  position: { lat: 49.2966, lon: 16.5264 },
  ...extra,
});

/** Two venues of Kuřim (one with an address) and one of Česká, with aliases to match. */
export const VENUE_LIST = [
  venueRecord("kurim-kostel", "Kostel sv. Maří Magdalény", "Kuřim", { aliases: ["kostel"] }),
  venueRecord("kurim-fara", "Fara", "Kuřim", {
    address: { streetAddress: "Křížkovského 55/5", postalCode: "664 34", municipality: "Kuřim", country: "Česko" },
    aliases: ["areál za farou"],
  }),
  venueRecord("ceska-kaple", "Kaple Panny Marie Růžencové", "Česká"),
];

/**
 * The answers of Mapy.com: the reverse lookup names the municipality, the address search lands somewhere; `places`,
 * when given, answers every search but the municipality's.
 */
export const stubMapy = (municipality: string, addressAt = { lon: 16.5264, lat: 49.2966 }, places?: object[]) =>
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof globalThis.fetch>(async (url) => {
      const at = String(url).includes("/rgeocode") ? { lon: 16.5264, lat: 49.2966 } : addressAt;
      if (String(url).includes("type=regional.municipality")) {
        const box = [16.5, 49.2, 16.6, 49.3];
        return jsonResponse({
          items: [{ name: municipality, type: "regional.municipality", bbox: box, regionalStructure: [] }],
        });
      }
      if (places && !String(url).includes("/rgeocode")) return jsonResponse({ items: places });
      return jsonResponse({
        items: [
          {
            name: "Hlavní 1",
            label: "Adresa",
            position: at,
            type: "regional.address",
            location: "",
            regionalStructure: [
              { name: municipality, type: "regional.municipality" },
              { name: "Česko", type: "regional.country" },
            ],
          },
        ],
      });
    }),
  );

/** A temporary venues.json holding VENUE_LIST, fresh for each test, and the stubbed Mapy.com undone after it. */
export function freshVenueFile(): () => string {
  const dir = freshTempDir("venues");
  let file = "";
  beforeEach(() => {
    file = join(dir(), "venues.json");
    writeFileSync(file, `${JSON.stringify({ venues: VENUE_LIST }, null, 2)}\n`);
  });
  afterEach(() => vi.unstubAllGlobals());
  return () => file;
}
