import { describe, expect, it } from "vitest";
import { readVenues } from "./add";
import { setVenue, venueUse, type VenueUse } from "./set";
import { freshTempDir, freshVenueFile, stubMapy } from "../test-helpers";

const file = freshVenueFile();
const unused: VenueUse = { services: [], office: false, nativity: false, events: [] };
const options = { check: true, key: "KEY", use: unused };
const venue = (id: string) => readVenues(file()).find((v) => v.id === id);

describe("set", () => {
  const candidate = {
    name: "Kaple",
    address: { streetAddress: "Hlavní 1", postalCode: "664 31", municipality: "Česká", country: "Česko" },
    position: { lat: 49.2967, lon: 16.5265 },
  };

  it("renames a venue, keeping its id, and says what uses it, writing only without check", async () => {
    const use = { ...unused, services: ["Česká"], events: ["hody-ceska-2026"] };
    const lines = await setVenue(file(), "ceska-kaple", { ...options, use, name: "Kaple sv. Anny" });
    expect(lines).toEqual([
      "Would update the venue ceska-kaple",
      "  name: Kaple Panny Marie Růžencové → Kaple sv. Anny",
      "  used by: the services in Česká; the events hody-ceska-2026",
      "tell: the name and address are every upcoming service's location in the Bohoslužby calendar",
    ]);
    expect(venue("ceska-kaple")?.name).toBe("Kaple Panny Marie Růžencové");
    await setVenue(file(), "ceska-kaple", { ...options, check: false, name: "Kaple sv. Anny" });
    expect(venue("ceska-kaple")).toMatchObject({ id: "ceska-kaple", name: "Kaple sv. Anny" });
  });

  it("moves a venue to a lookup candidate's address and position, inside its municipality", async () => {
    stubMapy("Česká", { lat: 49.2967, lon: 16.5265 });
    const lines = await setVenue(file(), "ceska-kaple", { ...options, input: [candidate], pick: 1 });
    expect(lines).toContain("  address: Česká, Česko → Hlavní 1, 664 31 Česká, Česko");
    expect(lines).toContain("  position: 49.2966, 16.5264 → 49.2967, 16.5265");
    expect(lines.some((l) => l.startsWith("  pin: "))).toBe(true);
    expect(lines).toContain("  used by: nothing");
    stubMapy("Kuřim");
    await expect(setVenue(file(), "ceska-kaple", { ...options, input: [candidate], pick: 1 })).rejects.toThrow(
      /^the position lies in Kuřim, not in Česká/,
    );
  });

  it("refuses to move the parish office's address, but renames it", async () => {
    stubMapy("Kuřim");
    const office = { ...options, use: { ...unused, office: true } };
    const moved = { ...candidate, address: { ...candidate.address, municipality: "Kuřim" } };
    await expect(setVenue(file(), "kurim-fara", { ...office, input: moved })).rejects.toThrow(
      /^kurim-fara is the parish office/,
    );
    expect((await setVenue(file(), "kurim-fara", { ...office, name: "Farní úřad" }))[1]).toBe(
      "  name: Fara → Farní úřad",
    );
  });

  it("says when nothing changes, and refuses an unknown venue or a name that breaks the list", async () => {
    expect(await setVenue(file(), "kurim-fara", { ...options, name: "Fara" })).toEqual([
      "tell: kurim-fara is already so: nothing to change",
    ]);
    await expect(setVenue(file(), "kurim-sokolovna", { ...options, name: "X" })).rejects.toThrow(
      /^there is no venue kurim-sokolovna/,
    );
    await expect(setVenue(file(), "kurim-fara", { ...options, name: "Kostel" })).rejects.toThrow(
      /"kostel" already means/,
    );
  });
});

describe("venueUse", () => {
  const news = freshTempDir("venue-use");

  it("finds the services, Kontakty and Betlémy in the content", () => {
    expect(venueUse("kurim-kostel", news())).toMatchObject({ services: ["Kuřim"], nativity: true, events: [] });
    expect(venueUse("kurim-fara", news()).office).toBe(true);
  });
});
