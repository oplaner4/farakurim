import { describe, expect, it } from "vitest";
import { parishChurches, places, regularServices } from "./masses";
import { venues } from "./venues";
import { mapHref, venueMapHref } from "@/lib/shared/links";
import { venueLocation } from "@/lib/shared/venues";
import { parish } from "./site";
import { isClock, isMonthDay } from "@/test/content-checks";

describe("Pravidelné bohoslužby (masses.ts)", () => {
  it("has a valid regular schedule", () => {
    for (const s of regularServices) {
      expect(s.weekday, s.time).toBeGreaterThanOrEqual(0);
      expect(s.weekday).toBeLessThanOrEqual(6);
      expect(isClock(s.time), s.time).toBe(true);
      expect(Object.hasOwn(places, s.place), s.place).toBe(true);
      if (s.closed) expect(isMonthDay(s.closed.from) && isMonthDay(s.closed.to), s.time).toBe(true);
    }
  });

  it("gives every place a locative and a venue with the calendar's location", () => {
    for (const [id, p] of Object.entries(places)) expect(p.locative, id).toMatch(/^ve? \S/);
    // The Bohoslužby calendar matches its events by this location: a change rewrites every upcoming service.
    expect(Object.fromEntries(Object.entries(places).map(([id, p]) => [id, venueLocation(venues[p.venue])]))).toEqual({
      kurim: "Kostel sv. Maří Magdalény, Pátera Peši, 664 34 Kuřim, Česko",
      "moravske-kninice": "Kostel sv. Markéty, Kuřimská, 664 34 Moravské Knínice, Česko",
      jinacovice: "Kaple sv. Máří Magdaleny, Jinačovice 46, 664 34 Jinačovice, Česko",
    });
  });

  it("only lets a not-first-in-month service give way to a first-in-month variant", () => {
    const firstInMonth = (weekday: number, place: string) =>
      regularServices.some((s) => s.rule === "first-in-month" && s.weekday === weekday && s.place === place);
    const orphans = regularServices.filter((s) => s.rule === "not-first-in-month" && !firstInMonth(s.weekday, s.place));
    expect(orphans).toEqual([]);
  });
});

describe("Kostely a kaple (masses.ts)", () => {
  it("has one church or chapel per village of the parish, in the footer's order", () => {
    expect(parishChurches.map((c) => c.village)).toEqual(parish.villages.map((v) => v.name));
    for (const c of parishChurches) expect(c.building, c.village).not.toBe("");
  });

  it("takes the churches from the venues and links the other chapels to the diocese catalogue", () => {
    expect(parishChurches.map((c) => c.venue)).toEqual([
      "kurim-kostel",
      "moravske-kninice-kostel",
      "jinacovice-kaple",
      "ceska-kaple",
    ]);
    for (const c of parishChurches) {
      for (const chapel of c.chapels ?? [])
        expect(chapel.href, chapel.name).toMatch(/^https:\/\/katalog\.biskupstvi\.cz\//);
    }
  });

  it("finds the Česká chapel by its address, as a search of its name finds another place", () => {
    const ceska = parishChurches.find((c) => c.village === "Česká");
    expect(ceska && venueMapHref(venues[ceska.venue])).toBe(mapHref("Česká 20, 664 31 Česká, Česko"));
  });
});
