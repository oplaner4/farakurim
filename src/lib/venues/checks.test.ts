import { describe, expect, it } from "vitest";
import type { Venue } from "@/content/types/venues";
import { foldPlace, venueProblems } from "./checks";

const at = (id: string, name: string, municipality: string, aliases?: string[]): Venue => ({
  id,
  name,
  address: { municipality, country: "Česko" },
  position: { lat: 49.29, lon: 16.52 },
  aliases,
});

const list = [
  at("kurim-fara", "Fara", "Kuřim", ["areál za farou"]),
  at("kurim-kaple-jana-nepomuckeho", "Kaple sv. Jana Nepomuckého", "Kuřim"),
  at("moravske-kninice-kaple-jana-nepomuckeho", "Kaple sv. Jana Nepomuckého", "Moravské Knínice"),
  at("ceska-kaple", "Kaple Panny Marie Růžencové", "Česká"),
];
const byId = Object.fromEntries(list.map((v) => [v.id, v]));

describe("foldPlace", () => {
  it("ignores case, accents, dots and extra spaces", () => {
    expect(foldPlace("  Kaple  sv. Jana   NEPOMUCKÉHO ")).toBe("kaple sv jana nepomuckeho");
  });
});

describe("venueProblems", () => {
  it("accepts a venue of the place's municipality", () => {
    expect(venueProblems({ place: "Kuřim, fara", venue: "kurim-fara" }, byId)).toEqual([]);
    expect(venueProblems({ place: "Kuřim, fara" }, byId)).toEqual([]);
  });

  it("refuses an unknown venue, a venue without a place and mapQuery next to it, not one from another municipality", () => {
    expect(venueProblems({ place: "Kuřim, fara", venue: "kurim-sokolovna" }, byId)).toEqual([
      'venue: no venue with the id "kurim-sokolovna"',
    ]);
    expect(venueProblems({ venue: "kurim-fara" }, byId)).toEqual(["venue: needs a place"]);
    expect(venueProblems({ place: "Česká, fara", venue: "kurim-fara" }, byId)).toEqual([]);
    expect(venueProblems({ place: "Kuřim, fara", venue: "kurim-fara", mapQuery: "fara Kuřim" }, byId)).toEqual([
      "mapQuery: must be left out next to a venue, whose position gives the map link",
    ]);
  });
});
