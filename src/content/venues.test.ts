import { describe, expect, it } from "vitest";
import { parishChurches, places } from "./masses";
import { nativitySeasons } from "./nativity";
import { contacts } from "./site";
import { venueList, venues } from "./venues";

describe("venues (venues.json)", () => {
  it("names every venue and links only to the diocese catalogue", () => {
    for (const v of venueList) {
      expect(v.name, v.id).not.toBe("");
      if (v.catalogueHref) expect(v.catalogueHref, v.id).toMatch(/^https:\/\/katalog\.biskupstvi\.cz\//);
    }
  });

  it("knows every venue the services, Kontakty and Betlémy refer to", () => {
    const refs = [
      ...Object.values(places).map((p) => p.venue),
      ...parishChurches.map((c) => c.venue),
      contacts.venue,
      ...nativitySeasons.map((s) => s.venue),
    ];
    for (const ref of refs) expect(Object.hasOwn(venues, ref), ref).toBe(true);
  });

  it("gives the fara the parish office's address", () => {
    const { streetAddress, postalCode, municipality } = venues[contacts.venue].address;
    expect({ streetAddress, postalCode, municipality }).toEqual({
      streetAddress: contacts.street,
      postalCode: contacts.postalCode,
      municipality: contacts.town,
    });
  });
});
