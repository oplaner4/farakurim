import { describe, expect, it } from "vitest";
import { matchVenues } from "@/test/fixtures";
import { foldPlace, venueProblems } from "./checks";

const list = matchVenues;
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

  it("refuses an unknown venue and a venue without a place, not one from another municipality", () => {
    expect(venueProblems({ place: "Kuřim, fara", venue: "kurim-sokolovna" }, byId)).toEqual([
      'venue: no venue with the id "kurim-sokolovna"',
    ]);
    expect(venueProblems({ venue: "kurim-fara" }, byId)).toEqual(["venue: needs a place"]);
    expect(venueProblems({ place: "Česká, fara", venue: "kurim-fara" }, byId)).toEqual([]);
  });
});
