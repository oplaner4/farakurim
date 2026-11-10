import { describe, expect, it } from "vitest";
import { VENUE_IDS } from "@/content/types/venues";
import { contacts } from "./site";
import { venues } from "./venues";

describe("venues", () => {
  it("lists every venue id, in order", () => {
    expect(Object.keys(venues)).toEqual([...VENUE_IDS]);
  });

  it("names every venue and links only to the diocese catalogue", () => {
    for (const [id, v] of Object.entries(venues)) {
      expect(v.name, id).not.toBe("");
      expect(v.village, id).not.toBe("");
      if (v.catalogueHref) expect(v.catalogueHref, id).toMatch(/^https:\/\/katalog\.biskupstvi\.cz\//);
    }
  });

  it("gives the fara the parish office's address", () => {
    expect(venues[contacts.venue].address).toBe(`${contacts.street}, ${contacts.postalCode} ${contacts.town}, Česko`);
  });
});
