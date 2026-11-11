import { describe, expect, it } from "vitest";
import type { Venue } from "@/content/types/venues";
import { buildingText, findVenue, foldPlace, venueProblems } from "./match";

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

describe("buildingText", () => {
  it("gives the text after the village and a comma", () => {
    expect(buildingText("Kuřim, areál za farou", "Kuřim")).toBe("areál za farou");
    expect(buildingText("Brno-Husovice, fara", "Brno")).toBe("fara");
  });

  it("gives an empty text for the village alone", () => {
    expect(buildingText("Kuřim", "Kuřim")).toBe("");
  });

  it("gives null when the place does not start with the village", () => {
    expect(buildingText("Česká, sokolovna", "Kuřim")).toBeNull();
    expect(buildingText("Českákov, sál", "Česká")).toBeNull();
  });
});

describe("findVenue", () => {
  it("knows a venue by an alias, folded", () => {
    expect(findVenue(list, "Kuřim", "Kuřim, areál za farou")).toEqual({ kind: "known", venue: byId["kurim-fara"] });
    expect(findVenue(list, "Kuřim", "Kurim, ARÉAL ZA FAROU")).toEqual({ kind: "known", venue: byId["kurim-fara"] });
  });

  it("knows a venue by its name only within the village", () => {
    expect(findVenue(list, "Kuřim", "Kuřim, kaple sv. Jana Nepomuckého")).toEqual({
      kind: "known",
      venue: byId["kurim-kaple-jana-nepomuckeho"],
    });
  });

  it("lists the village's venues when nothing matches", () => {
    expect(findVenue(list, "Kuřim", "Kuřim, farní zahrada")).toEqual({
      kind: "candidates",
      venues: [byId["kurim-fara"], byId["kurim-kaple-jana-nepomuckeho"]],
    });
  });

  it("refuses a place in another village", () => {
    expect(findVenue(list, "Kuřim", "Česká, sokolovna")).toEqual({ kind: "wrong-village" });
  });
});

describe("venueProblems", () => {
  it("accepts a venue of the place's village", () => {
    expect(venueProblems({ place: "Kuřim, fara", venue: "kurim-fara" }, byId)).toEqual([]);
    expect(venueProblems({ place: "Kuřim, fara" }, byId)).toEqual([]);
  });

  it("refuses an unknown venue, a venue without a place, one from another village and mapQuery next to it", () => {
    expect(venueProblems({ place: "Kuřim, fara", venue: "kurim-sokolovna" }, byId)).toEqual([
      'venue: no venue with the id "kurim-sokolovna"',
    ]);
    expect(venueProblems({ venue: "kurim-fara" }, byId)).toEqual(["venue: needs a place"]);
    expect(venueProblems({ place: "Česká, fara", venue: "kurim-fara" }, byId)).toEqual([
      'venue: kurim-fara is in Kuřim, but the place "Česká, fara" does not start with it',
    ]);
    expect(venueProblems({ place: "Kuřim, fara", venue: "kurim-fara", mapQuery: "fara Kuřim" }, byId)).toEqual([
      "mapQuery: must be left out next to a venue, whose position gives the map link",
    ]);
  });
});
