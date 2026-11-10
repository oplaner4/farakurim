import type { ParishChapel, ParishChurch } from "@/content/types/contacts";
import type { Intentions, Place, PlaceId, RegularService } from "@/content/types/services";
import type { YearlyBreak } from "@/content/types/shared";
import type { VenueId } from "@/content/types/venues";
import { venues } from "./venues";

// The parish's churches and its regular weekly schedule. Edit here when the schedule changes; the current service sheets
// (`content/service-sheets.json`) override it day by day.

/** In display order (design/DESIGN.md §14.3). */
export const places: Record<PlaceId, Place> = {
  kurim: {
    name: "Kuřim",
    church: "Chrám Páně sv. Maří Magdaleny",
    churchShort: "kostel sv. Maří Magdalény",
    color: "blue",
    locative: "v Kuřimi",
    venue: "kurim-kostel",
  },
  "moravske-kninice": {
    name: "Moravské Knínice",
    church: "Chrám Páně sv. Markéty",
    churchShort: "kostel sv. Markéty",
    color: "green",
    locative: "v Moravských Knínicích",
    venue: "moravske-kninice-kostel",
  },
  jinacovice: {
    name: "Jinačovice",
    locative: "v Jinačovicích",
    color: "orange",
    venue: "jinacovice-kaple",
    byAgreement: true,
  },
};

/** The other chapels of the villages with a church, listed under it on Kontakty. */
const otherChapels: Partial<Record<PlaceId, VenueId[]>> = {
  kurim: ["kurim-kaple-panny-marie-bolestne", "kurim-kaple-jana-nepomuckeho"],
  "moravske-kninice": ["moravske-kninice-kaple-cyrila-a-metodeje", "moravske-kninice-kaple-jana-nepomuckeho"],
};

/** A chapel of `otherChapels`, linked to its page in the diocese catalogue. */
const chapel = (id: VenueId): ParishChapel => ({ name: venues[id].name, href: venues[id].catalogueHref ?? "" });

/** The churches of `places` plus the chapels, one per village of the parish, in display order. */
export const parishChurches: ParishChurch[] = [
  ...(["kurim", "moravske-kninice"] as const).map((id) => {
    const { name, church = "", color, venue } = places[id];
    return { village: name, building: church, color, venue, chapels: otherChapels[id]?.map(chapel) };
  }),
  {
    village: "Jinačovice",
    building: "Kaple sv. Máří Magdaleny",
    note: "bohoslužby dle domluvy",
    color: "orange",
    venue: "jinacovice-kaple",
  },
  {
    village: "Česká",
    building: "Kaple Panny Marie Růžencové",
    color: "magenta",
    venue: "ceska-kaple",
  },
];

const summerBreak: YearlyBreak = { from: "07-01", to: "08-31" };

/**
 * Regular weekly schedule (source: /porad_bohosluzeb/). First-Friday and first-Saturday variants use `rule`;
 * the days of the service sheets (`content/service-sheets.json`) and the changes announced for later
 * (`content/schedule-exceptions.json`) replace it through `scheduleExceptions()`.
 */
export const regularServices: RegularService[] = [
  { weekday: 1, time: "8:00", place: "kurim" },
  { weekday: 4, time: "17:30", place: "kurim", title: "Adorace" },
  { weekday: 4, time: "18:00", place: "kurim" },
  { weekday: 5, time: "16:45", place: "kurim", rule: "not-first-in-month" },
  { weekday: 5, time: "18:15", place: "kurim", rule: "first-in-month" },
  {
    weekday: 5,
    time: "19:00",
    place: "kurim",
    title: "Modlitební večer",
    rule: "first-in-month",
    note: "mimo letní prázdniny",
    closed: summerBreak,
  },
  { weekday: 5, time: "17:00", place: "moravske-kninice", rule: "first-in-month" },
  { weekday: 5, time: "18:00", place: "moravske-kninice", rule: "not-first-in-month" },
  { weekday: 6, time: "8:00", place: "kurim", rule: "first-in-month" },
  { weekday: 0, time: "8:00", place: "kurim" },
  { weekday: 0, time: "9:30", place: "kurim", note: "s katechezí pro děti (ve školním roce)", closed: summerBreak },
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
