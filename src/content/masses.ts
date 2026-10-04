import type { ParishChurch, Place, PlaceId, RegularService } from "./types";

// Mock content. Replace with data from the CMS/API once the backend exists.

/** In display order (design/DESIGN.md §14.3). */
export const places: Record<PlaceId, Place> = {
  kurim: {
    name: "Kuřim",
    church: "Chrám Páně sv. Maří Magdaleny",
    churchShort: "kostel sv. Maří Magdalény",
    color: "blue",
    mapQuery: "kostel sv. Maří Magdalény Kuřim",
  },
  "moravske-kninice": {
    name: "Moravské Knínice",
    church: "Chrám Páně sv. Markéty",
    churchShort: "kostel sv. Markéty",
    color: "green",
    mapQuery: "kostel sv. Markéty Moravské Knínice",
  },
  jinacovice: { name: "Jinačovice", color: "orange", mapQuery: "Jinačovice", byAgreement: true },
};

/** The churches of `places` plus the chapels, one per village of the parish, in display order. */
export const parishChurches: ParishChurch[] = [
  ...(["kurim", "moravske-kninice"] as const).map((id) => {
    const { name, church = "", color, mapQuery } = places[id];
    return { village: name, building: church, color, mapQuery };
  }),
  {
    village: "Jinačovice",
    building: "Kaple sv. Máří Magdaleny",
    note: "bohoslužby dle domluvy",
    color: "orange",
    mapQuery: "kaple sv. Máří Magdaleny Jinačovice",
  },
  {
    village: "Česká",
    building: "Kaple Panny Marie Růžencové",
    color: "magenta",
    mapQuery: "kaple Panny Marie Růžencové Česká",
  },
];

/**
 * Regular weekly schedule (source: /porad_bohosluzeb/). First-Friday and first-Saturday variants use `rule`;
 * the days of the current ohlášky (`content/ohlasky.ts`) replace it through `scheduleExceptions`.
 */
export const regularServices: RegularService[] = [
  { weekday: 1, time: "8:00", place: "kurim" },
  { weekday: 4, time: "17:30", place: "kurim", title: "Adorace" },
  { weekday: 4, time: "18:00", place: "kurim" },
  { weekday: 5, time: "16:45", place: "kurim", rule: "not-first-in-month" },
  { weekday: 5, time: "18:15", place: "kurim", rule: "first-in-month" },
  { weekday: 5, time: "19:00", place: "kurim", title: "Modlitební večer", rule: "first-in-month" },
  { weekday: 5, time: "17:00", place: "moravske-kninice", rule: "first-in-month" },
  { weekday: 5, time: "18:00", place: "moravske-kninice", rule: "not-first-in-month" },
  { weekday: 6, time: "8:00", place: "kurim", rule: "first-in-month" },
  { weekday: 0, time: "8:00", place: "kurim" },
  { weekday: 0, time: "9:30", place: "kurim", note: "s katechezí pro děti (ve školním roce)" },
  { weekday: 0, time: "11:00", place: "moravske-kninice" },
];

/** Pořad bohoslužeb §14.1 (4)–(5). */
export const sacraments = {
  confession: "Půl hodiny před každou mší svatou je možnost přistoupit ke svátosti smíření.",
  baptism: "Křty bývají druhou neděli v měsíci v 9:30. Termín si domluvte na faře.",
};
