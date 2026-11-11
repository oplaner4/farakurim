import { describe, expect, it } from "vitest";
import type { Venue } from "@/content/types/venues";
import { venueFileSchema } from "./schema";

const venue = (over: Partial<Venue> = {}): Venue => ({
  id: "kurim-fara",
  name: "Fara",
  address: { streetAddress: "Křížkovského 55/5", postalCode: "664 34", municipality: "Kuřim", country: "Česko" },
  position: { lat: 49.2965974, lon: 16.526404 },
  ...over,
});

const problems = (venues: unknown[]) => {
  const parsed = venueFileSchema.safeParse({ venues });
  return parsed.success ? [] : parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

describe("venueFileSchema", () => {
  it("accepts a venue with its address and position", () => {
    expect(problems([venue()])).toEqual([]);
  });

  it("refuses a duplicate id", () => {
    expect(problems([venue(), venue({ name: "Fara 2" })])).toEqual(["venues.1.id: kurim-fara is already taken"]);
  });

  it("refuses an id that is not kebab-case", () => {
    expect(problems([venue({ id: "Kuřim fara" })])).toEqual(["venues.0.id: must be ASCII kebab-case"]);
  });

  it("refuses an alias another venue of the same municipality has, folded", () => {
    const kostel = venue({ id: "kurim-kostel", name: "Kostel sv. Maří Magdalény", aliases: ["kostel"] });
    expect(problems([kostel, venue({ aliases: ["Kostel"] })])).toEqual([
      'venues.1.aliases: "Kostel" already means kurim-kostel in Kuřim',
    ]);
    expect(problems([kostel, venue({ aliases: ["kostel sv. Maří Magdalény"] })])).toHaveLength(1);
  });

  it("lets venues of different municipalities share an alias", () => {
    const ceska = venue({
      id: "ceska-kaple",
      name: "Kaple",
      address: { municipality: "Česká", country: "Česko" },
      aliases: ["kostel"],
    });
    expect(problems([venue({ aliases: ["kostel"] }), ceska])).toEqual([]);
  });

  it("refuses a venue without a position or a municipality", () => {
    const { position: _, ...noPosition } = venue();
    expect(problems([noPosition])).toHaveLength(1);
    expect(problems([venue({ address: { country: "Česko" } as Venue["address"] })])).toHaveLength(1);
  });

  it("refuses a latitude outside −90…90", () => {
    expect(problems([venue({ position: { lat: 91, lon: 16 } })])).toHaveLength(1);
  });
});
