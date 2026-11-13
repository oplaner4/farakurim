import { describe, expect, it } from "vitest";
import { addAlias, addVenue, readVenues } from "./add";
import { stubMapy, freshVenueFile } from "../test-helpers/venues";

const file = freshVenueFile();
const ids = () => readVenues(file()).map((v) => v.id);

describe("add", () => {
  const sokolovna = {
    id: "ceska-sokolovna",
    name: "Sokolovna",
    address: { streetAddress: "Hlavní 1", postalCode: "664 31", country: "Česko" },
    position: { lat: 49.2966, lon: 16.5264 },
  };

  it("takes a candidate of a list by its number, makes its id from its name and adds aliases, sorted", async () => {
    stubMapy("Česká");
    const { id: _, ...candidate } = sokolovna;
    const list = [
      { ...candidate, name: "Kaple" },
      { ...candidate, name: "Sokolovna Česká", aliases: ["u sokola"] },
    ];
    const lines = await addVenue(file(), list, { check: true, key: "KEY", pick: 2, aliases: ["v sokolovně"] });
    expect(lines[0]).toBe("Would add the venue ceska-sokolovna-ceska");
    expect(lines).toContain("  aliases: u sokola, v sokolovně");
    const renamed = await addVenue(file(), list, { check: true, key: "KEY", pick: 2, name: " Sokolovna " });
    expect(renamed.slice(0, 2)).toEqual(["Would add the venue ceska-sokolovna", "  name: Sokolovna"]);
  });

  it("refuses a list without a pick or with one past its end, a pick of one venue and no name", async () => {
    stubMapy("Česká");
    const options = { check: true, key: "KEY" };
    await expect(addVenue(file(), [sokolovna], options)).rejects.toThrow(/^the file holds 1 candidate(?!s)/);
    await expect(addVenue(file(), [sokolovna], { ...options, pick: 2 })).rejects.toThrow(/^there is no candidate 2/);
    await expect(addVenue(file(), sokolovna, { ...options, pick: 1 })).rejects.toThrow(/^--pick takes a candidate/);
    const unnamed = { ...sokolovna, id: undefined, name: "" };
    await expect(addVenue(file(), unnamed, options)).rejects.toThrow(/^the venue has no name/);
  });

  it("fills the municipality from the position and prints the venue with its pin, writing only without check", async () => {
    stubMapy("Česká");
    const lines = await addVenue(file(), sokolovna, { check: true, key: "KEY" });
    expect(lines[0]).toBe("Would add the venue ceska-sokolovna");
    expect(lines).toContain("  address: Hlavní 1, 664 31 Česká, Česko");
    expect(lines).toContain(
      "  pin: https://mapy.cz/zakladni?source=coor&id=16.5264%2C49.2966&x=16.5264&y=49.2966&z=17",
    );
    expect(ids()).not.toContain("ceska-sokolovna");
    await addVenue(file(), sokolovna, { check: false, key: "KEY" });
    expect(readVenues(file()).find((v) => v.id === "ceska-sokolovna")?.address.municipality).toBe("Česká");
  });

  it("refuses an id not made of the municipality and name, a taken id and no position", async () => {
    stubMapy("Česká");
    await expect(addVenue(file(), { ...sokolovna, id: "sokolovna" }, { check: true, key: "KEY" })).rejects.toThrow(
      /^the id must be ceska-sokolovna/,
    );
    stubMapy("Kuřim");
    await expect(
      addVenue(file(), { ...sokolovna, id: "kurim-fara", name: "Fara" }, { check: true, key: "KEY" }),
    ).rejects.toThrow(/^kurim-fara is already a venue/);
    const { position: _, ...noPosition } = sokolovna;
    await expect(addVenue(file(), noPosition, { check: true, key: "KEY" })).rejects.toThrow(/position/);
  });

  it("refuses a position in another municipality than the address names", async () => {
    stubMapy("Kuřim");
    const stated = { ...sokolovna, address: { ...sokolovna.address, municipality: "Česká" } };
    await expect(addVenue(file(), stated, { check: true, key: "KEY" })).rejects.toThrow(
      /^the position lies in Kuřim, not in Česká/,
    );
  });

  it("warns, but adds, when the address lands more than 150 m from the position", async () => {
    stubMapy("Česká", { lon: 16.5264, lat: 49.2986 });
    const lines = await addVenue(file(), sokolovna, { check: true, key: "KEY" });
    expect(lines).toContain(
      "tell: a search of the address lands 222 m from the position: check the address, or the pin",
    );
  });
});

describe("alias", () => {
  it("refuses a text another venue of the municipality already has, and writes a new one sorted", () => {
    expect(() => addAlias(file(), "kurim-fara", "Kostel", { check: false })).toThrow(
      /"Kostel" already means kurim-kostel in Kuřim/,
    );
    expect(addAlias(file(), "kurim-fara", "farní zahrada", { check: true })).toEqual([
      'Would add the alias "farní zahrada" to kurim-fara',
    ]);
    addAlias(file(), "kurim-fara", "farní zahrada", { check: false });
    expect(readVenues(file()).find((v) => v.id === "kurim-fara")?.aliases).toEqual(["areál za farou", "farní zahrada"]);
    expect(() => addAlias(file(), "kurim-sokolovna", "x", { check: true })).toThrow(/no venue kurim-sokolovna/);
  });
});
