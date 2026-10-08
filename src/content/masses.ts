import type { ParishChapel, ParishChurch } from "@/content/types/contacts";
import type { Intentions, Place, PlaceId, RegularService } from "@/content/types/services";

// The parish's churches and its regular weekly schedule. Edit here when the schedule changes; the current ohlášky
// (`content/ohlasky.ts`) override it day by day.

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

/** The other chapels of the villages with a church, listed under it on Kontakty. */
const otherChapels: Partial<Record<PlaceId, ParishChapel[]>> = {
  kurim: [
    {
      name: "Kaple Panny Marie Bolestné",
      href: "https://katalog.biskupstvi.cz/detail/kostel/7414/Ku%C5%99im,%20kaple-Panny-Marie-Bolestne",
    },
    {
      name: "Kaple sv. Jana Nepomuckého",
      href: "https://katalog.biskupstvi.cz/detail/kostel/8128/Ku%C5%99im,%20kaple-sv-Jana-Nepomuckeho",
    },
  ],
  "moravske-kninice": [
    {
      name: "Kaple sv. Cyrila a Metoděje",
      href: "https://katalog.biskupstvi.cz/detail/kostel/6910/Moravsk%C3%A9%20Kn%C3%ADnice,%20kaple-sv-Cyrila-a-Metodeje",
    },
    {
      name: "Kaple sv. Jana Nepomuckého",
      href: "https://katalog.biskupstvi.cz/detail/kostel/6937/Moravsk%C3%A9%20Kn%C3%ADnice,%20kaple-sv-Jana-Nepomuckeho",
    },
  ],
};

/** The churches of `places` plus the chapels, one per village of the parish, in display order. */
export const parishChurches: ParishChurch[] = [
  ...(["kurim", "moravske-kninice"] as const).map((id) => {
    const { name, church = "", color, mapQuery } = places[id];
    return { village: name, building: church, color, mapQuery, chapels: otherChapels[id] };
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
    // The search finds another place; the share link points at the chapel.
    mapUrl: "https://mapy.com/s/kedezofodo",
  },
];

/**
 * Regular weekly schedule (source: /porad_bohosluzeb/). First-Friday and first-Saturday variants use `rule`;
 * the days of the current ohlášky and the hand-entered `laterExceptions` (`content/ohlasky.ts`) replace it through
 * `scheduleExceptions()`.
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

/** Pořad bohoslužeb §14.1 (3a): the Intence card. */
export const intentions: Intentions = {
  intro: {
    before: "Úmysl, na který bude mše svatá sloužena, si můžete nechat zapsat ",
    emphasis: "po každé mši svaté",
    after: " v sakristii.",
  },
  why: "Mše svatá je nejlepší způsob, jak na oltář položit svůj dík i prosbu.",
  reasons: [
    "poděkování za výročí",
    "za zemřelé",
    "za zdraví",
    "za Boží požehnání",
    "v těžké situaci",
    "o dar Ducha svatého",
  ],
  note: "Připadne-li na den mše s intencí pohřeb, mše s vaší intencí se slouží dál.",
};
