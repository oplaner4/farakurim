import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readMonth } from "@/content/news";
import type { Venue } from "@/content/types/venues";
import { jsonResponse } from "@/test/fetch";
import { newsEvent } from "@/test/fixtures";
import { addAlias, addVenue, assignVenues, findLines, parseCommand, readVenues } from "./command";
import { freshTempDir, useNewsFixture } from "../test-helpers";

const venue = (id: string, name: string, municipality: string, extra: Partial<Venue> = {}): Venue => ({
  id,
  name,
  address: { municipality, country: "Česko" },
  position: { lat: 49.2966, lon: 16.5264 },
  ...extra,
});

const LIST = [
  venue("kurim-kostel", "Kostel sv. Maří Magdalény", "Kuřim", { aliases: ["kostel"] }),
  venue("kurim-fara", "Fara", "Kuřim", {
    address: { streetAddress: "Křížkovského 55/5", postalCode: "664 34", municipality: "Kuřim", country: "Česko" },
    aliases: ["areál za farou"],
  }),
  venue("ceska-kaple", "Kaple Panny Marie Růžencové", "Česká"),
];

// The answers of Mapy.com: the reverse lookup names the municipality, the address search lands somewhere.
const mapy = (municipality: string, addressAt = { lon: 16.5264, lat: 49.2966 }) =>
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

describe("pnpm venue", () => {
  const dir = freshTempDir("venues");
  let file: string;
  beforeEach(() => {
    file = join(dir(), "venues.json");
    writeFileSync(file, `${JSON.stringify({ venues: LIST }, null, 2)}\n`);
  });
  afterEach(() => vi.unstubAllGlobals());
  const ids = () => readVenues(file).map((v) => v.id);

  describe("find", () => {
    it("names a known venue, else lists the village's venues, else says it has none", () => {
      expect(findLines(LIST, "Kuřim", "Kuřim, areál za farou")).toEqual(["Known venue: kurim-fara (Fara)"]);
      expect(findLines(LIST, "Kuřim", "Kuřim, farní zahrada")).toEqual([
        'ask: "Kuřim, farní zahrada" matches no venue of Kuřim. Is it one of these, or a new venue?',
        "  kurim-kostel  Kostel sv. Maří Magdalény (kostel)",
        "  kurim-fara  Fara (areál za farou)",
      ]);
      expect(findLines(LIST, "Lelekovice", "Lelekovice, u vodojemu")).toEqual(["tell: Lelekovice has no venues yet."]);
    });

    it("refuses a place in another village", () => {
      expect(() => findLines(LIST, "Kuřim", "Česká, sokolovna")).toThrow(
        /^the place "Česká, sokolovna" does not start with Kuřim/,
      );
    });
  });

  describe("add", () => {
    const sokolovna = {
      id: "ceska-sokolovna",
      name: "Sokolovna",
      address: { streetAddress: "Hlavní 1", postalCode: "664 31", country: "Česko" },
      position: { lat: 49.2966, lon: 16.5264 },
    };

    it("fills the municipality from the position and prints the venue with its pin, writing only without check", async () => {
      mapy("Česká");
      const lines = await addVenue(file, sokolovna, { check: true, key: "KEY" });
      expect(lines[0]).toBe("Would add the venue ceska-sokolovna");
      expect(lines).toContain("  address: Hlavní 1, 664 31 Česká, Česko");
      expect(lines).toContain(
        "  pin: https://mapy.cz/zakladni?source=coor&id=16.5264%2C49.2966&x=16.5264&y=49.2966&z=17",
      );
      expect(ids()).not.toContain("ceska-sokolovna");
      await addVenue(file, sokolovna, { check: false, key: "KEY" });
      expect(readVenues(file).find((v) => v.id === "ceska-sokolovna")?.address.municipality).toBe("Česká");
    });

    it("refuses an id not made of the municipality and name, a taken id and no position", async () => {
      mapy("Česká");
      await expect(addVenue(file, { ...sokolovna, id: "sokolovna" }, { check: true, key: "KEY" })).rejects.toThrow(
        /^the id must be ceska-sokolovna/,
      );
      mapy("Kuřim");
      await expect(
        addVenue(file, { ...sokolovna, id: "kurim-fara", name: "Fara" }, { check: true, key: "KEY" }),
      ).rejects.toThrow(/^kurim-fara is already a venue/);
      const { position: _, ...noPosition } = sokolovna;
      await expect(addVenue(file, noPosition, { check: true, key: "KEY" })).rejects.toThrow(/position/);
    });

    it("refuses a position in another municipality than the address names", async () => {
      mapy("Kuřim");
      const stated = { ...sokolovna, address: { ...sokolovna.address, municipality: "Česká" } };
      await expect(addVenue(file, stated, { check: true, key: "KEY" })).rejects.toThrow(
        /^the position lies in Kuřim, not in Česká/,
      );
    });

    it("warns, but adds, when the address lands more than 150 m from the position", async () => {
      mapy("Česká", { lon: 16.5264, lat: 49.2986 });
      const lines = await addVenue(file, sokolovna, { check: true, key: "KEY" });
      expect(lines).toContain(
        "tell: a search of the address lands 222 m from the position: check the address, or the pin",
      );
    });
  });

  describe("alias", () => {
    it("refuses a text another venue of the village already has, and writes a new one sorted", () => {
      expect(() => addAlias(file, "kurim-fara", "Kostel", { check: false })).toThrow(
        /"Kostel" already means kurim-kostel in Kuřim/,
      );
      expect(addAlias(file, "kurim-fara", "farní zahrada", { check: true })).toEqual([
        'Would add the alias "farní zahrada" to kurim-fara',
      ]);
      addAlias(file, "kurim-fara", "farní zahrada", { check: false });
      expect(readVenues(file).find((v) => v.id === "kurim-fara")?.aliases).toEqual(["areál za farou", "farní zahrada"]);
      expect(() => addAlias(file, "kurim-sokolovna", "x", { check: true })).toThrow(/no venue kurim-sokolovna/);
    });
  });

  describe("assign", () => {
    const news = useNewsFixture({
      "2026/10.json": [
        newsEvent({ id: "a-2026", start: "2026-10-01", place: "Kuřim, areál za farou", mapQuery: "fara Kuřim" }),
        newsEvent({ id: "b-2026", start: "2026-10-02", place: "Kuřim, farní zahrada" }),
        newsEvent({ id: "c-2026", start: "2026-10-03", place: "Kuřim, fara", venue: "kurim-fara" }),
        newsEvent({ id: "d-2026", start: "2026-10-04", place: "Česká, kaple Panny Marie Růžencové" }),
      ],
    });

    it("prints the venue of every record whose place matches exactly, writing only without check", () => {
      const before = readFileSync(join(news.dir(), "2026/10.json"), "utf8");
      const { lines, written } = assignVenues(news.dir(), LIST, { check: true });
      expect(lines).toEqual(["Would set a-2026 venue kurim-fara, drop mapQuery", "Would set d-2026 venue ceska-kaple"]);
      expect(written).toEqual([]);
      expect(readFileSync(join(news.dir(), "2026/10.json"), "utf8")).toBe(before);

      expect(assignVenues(news.dir(), LIST, { check: false }).written).toEqual(["2026/10.json"]);
      const a = readMonth(news.dir(), "2026/10.json").find((e) => e.id === "a-2026");
      expect(a).toMatchObject({ venue: "kurim-fara" });
      expect(a).not.toHaveProperty("mapQuery");
    });
  });
});

describe("parseCommand", () => {
  it("reads each subcommand and refuses a missing village", () => {
    expect(parseCommand(["find", "--village", "Kuřim", "Kuřim, fara"])).toEqual({
      sub: "find",
      village: "Kuřim",
      place: "Kuřim, fara",
    });
    expect(parseCommand(["lookup", "--village", "Česká", "--link", "https://mapy.com/s/x"])).toEqual({
      sub: "lookup",
      village: "Česká",
      link: "https://mapy.com/s/x",
    });
    expect(parseCommand(["add", "v.json", "--check"])).toEqual({ sub: "add", file: "v.json", check: true });
    expect(parseCommand(["alias", "kurim-fara", "farní zahrada"])).toEqual({
      sub: "alias",
      id: "kurim-fara",
      text: "farní zahrada",
      check: false,
    });
    expect(parseCommand(["assign", "--check"])).toEqual({ sub: "assign", check: true });
    expect(() => parseCommand(["find", "Kuřim, fara"])).toThrow(/Usage: pnpm venue/);
    expect(() => parseCommand(["move"])).toThrow(/Usage: pnpm venue/);
  });
});
