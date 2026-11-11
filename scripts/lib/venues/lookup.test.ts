import { describe, expect, it } from "vitest";
import { addVenue } from "./add";
import { candidatesLines, lookupResults } from "./lookup";
import { stubMapy, freshVenueFile, VENUE_LIST } from "../test-helpers";

const file = freshVenueFile();

describe("lookup", () => {
  const sokolovna = {
    name: "Sokolovna Česká",
    label: "Sportoviště",
    position: { lon: 16.5264, lat: 49.2966 },
    type: "poi",
    location: "",
    zip: "66431",
    regionalStructure: [
      { name: "1", type: "regional.address" },
      { name: "Hlavní", type: "regional.street" },
      { name: "Česká", type: "regional.municipality" },
      { name: "Česko", type: "regional.country" },
    ],
  };
  const address = { streetAddress: "Hlavní 1", postalCode: "664 31", municipality: "Česká", country: "Česko" };
  const lookup = (extra: object) => ({ municipality: "Česká", ...extra });

  it("numbers the places and makes each a candidate: a place by its name, an address without one", async () => {
    stubMapy("Česká", undefined, [
      sokolovna,
      { ...sokolovna, name: "Hlavní 1", label: "Adresa", type: "regional.address" },
    ]);
    const { lines, candidates } = await lookupResults(lookup({ query: "sokolovna" }), VENUE_LIST, "KEY");
    expect(lines[0]).toBe("1. Sokolovna Česká (Sportoviště)");
    expect(lines).toContain("2. Hlavní 1 (Adresa)");
    expect(candidates).toEqual([
      { id: "ceska-sokolovna-ceska", name: "Sokolovna Česká", address, position: sokolovna.position },
      { name: "", address, position: sokolovna.position },
    ]);
  });

  it("names every candidate --name and gives it the --alias texts", async () => {
    stubMapy("Česká", undefined, [sokolovna]);
    const command = lookup({ query: "sokolovna", name: "Sokolovna", aliases: ["v sokolovně"] });
    const [candidate] = (await lookupResults(command, VENUE_LIST, "KEY")).candidates;
    expect(candidate).toMatchObject({ id: "ceska-sokolovna", name: "Sokolovna", aliases: ["v sokolovně"] });
    expect((await addVenue(file(), candidate, { check: true, key: "KEY" }))[0]).toBe(
      "Would add the venue ceska-sokolovna",
    );
  });

  it("makes a candidate of an exact link's point only, and says what to do with an approximate one", async () => {
    stubMapy("Česká");
    const point = "https://mapy.com/zakladni?source=coor&id=16.5264%2C49.2966&x=16.5264&y=49.2966&z=17";
    const exact = await lookupResults(lookup({ link: point, name: "Sokolovna" }), VENUE_LIST, "KEY");
    expect(exact.candidates).toEqual([
      {
        id: "ceska-sokolovna",
        name: "Sokolovna",
        address: { streetAddress: "Hlavní 1", municipality: "Česká", country: "Česko" },
        position: { lat: 49.2966, lon: 16.5264 },
      },
    ]);
    const centre = await lookupResults(
      lookup({ link: "https://mapy.com/zakladni?x=16.5264&y=49.2966&z=17" }),
      VENUE_LIST,
      "KEY",
    );
    expect(centre.candidates).toEqual([]);
    expect(centre.lines.at(-1)).toMatch(/^next: ask the user for the GPS line/);
  });

  it("makes no candidate of a point in another municipality", async () => {
    stubMapy("Kuřim");
    const point = "https://mapy.com/zakladni?source=coor&id=16.5264%2C49.2966";
    const { lines, candidates } = await lookupResults(lookup({ link: point, name: "Sokolovna" }), VENUE_LIST, "KEY");
    expect(lines).toContain("tell: the position lies in Kuřim, not in Česká");
    expect(candidates).toEqual([]);
  });

  it("says what it wrote, and that an unnamed candidate needs a name", () => {
    const named = { id: "ceska-sokolovna", name: "Sokolovna", address, position: sokolovna.position };
    expect(candidatesLines("c.json", [named])).toEqual([
      "Wrote 1 candidate to c.json, numbered as above",
      "next: copy the chosen one into venue.json, then pnpm venue add venue.json --check",
    ]);
    expect(candidatesLines("c.json", [named, { ...named, id: undefined, name: "" }])[1]).toMatch(
      /^tell: a candidate without a name needs one/,
    );
    expect(candidatesLines("c.json", [])).toEqual(["tell: no candidate written to c.json"]);
  });

  it("refuses to add an unnamed candidate or the whole list", async () => {
    stubMapy("Česká");
    const unnamed = { name: "", address, position: sokolovna.position };
    await expect(addVenue(file(), unnamed, { check: true, key: "KEY" })).rejects.toThrow(/^the venue has no name/);
    await expect(addVenue(file(), [unnamed], { check: true, key: "KEY" })).rejects.toThrow(/^the file holds a list/);
  });
});
