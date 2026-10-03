import "server-only";
import { sheetExceptions } from "@/lib/service-sheet";
import { places } from "./masses";
import type { PlaceId, ScheduleException, ServiceSheet, SheetRow } from "./types";

// Mock content: this week's ohlášky. Server-only: rows marked not public must never reach a client bundle, so client
// components get what they need as props (`scheduleExceptions`, the PDF link), never this module.

const kurimMass = (time: string, detail?: string, extra: Partial<SheetRow> = {}): SheetRow => ({
  time,
  place: "kurim",
  title: "Mše sv.",
  mass: true,
  ...(detail && { detail }),
  ...extra,
});

const FOR_PARISHIONERS = "za živé a † farníky a dobrodince naší farnosti";

/** This week's ohlášky (design/DESIGN.md §14.5–14.7), as the parish office would enter them. */
export const serviceSheet: ServiceSheet = {
  pdfUrl: "https://farakurim.cz/nahrane/porady_bohosluzeb/6ab9325f1b46d.porad_bohosluzeb.pdf",
  validFrom: "2026-09-27",
  validTo: "2026-10-04",
  days: [
    {
      date: "2026-09-27",
      feast: "26. neděle v mezidobí",
      solemnity: true,
      rows: [
        kurimMass("8:00"),
        { time: "9:30", place: "moravske-kninice", title: "Mše sv.", mass: true },
        { time: "11:00", place: "Vranov", title: "Mše sv.", detail: FOR_PARISHIONERS },
      ],
    },
    { date: "2026-09-28", feast: "sv. Václav", rows: [kurimMass("8:00")] },
    { date: "2026-09-29", feast: "sv. archandělé Michael, Gabriel a Rafael", rows: [kurimMass("8:00")] },
    { date: "2026-09-30", feast: "sv. Jeroným", rows: [kurimMass("8:00")] },
    {
      date: "2026-10-01",
      feast: "sv. Terezie z Lisieux",
      rows: [{ time: "17:30", place: "kurim", title: "Adorace" }, kurimMass("18:00")],
    },
    {
      date: "2026-10-02",
      feast: "sv. andělé strážní",
      rows: [
        {
          time: "17:00",
          place: "moravske-kninice",
          title: "Mše sv.",
          mass: true,
          detail: "za pokoj a mír na Ukrajině, na Blízkém východě i celém světě",
        },
        kurimMass("18:15", "za Komunitu Emmanuel"),
        { time: "19:00", place: "kurim", title: "Modlitební večer s Komunitou Emmanuel" },
      ],
    },
    {
      date: "2026-10-03",
      rows: [
        kurimMass("8:00", FOR_PARISHIONERS),
        { time: "10:00", place: "kurim", title: "Pohřeb", detail: "[jméno]", public: false },
      ],
    },
    {
      date: "2026-10-04",
      feast: "27. neděle v mezidobí",
      solemnity: true,
      rows: [
        kurimMass("8:00"),
        { time: "9:30", place: "moravske-kninice", title: "Mše sv.", mass: true, changed: true },
        kurimMass("11:00", "za obec Česká, její obyvatele a rodáky", { title: "Hodová mše sv.", changed: true }),
      ],
    },
  ],
  announcements: [
    {
      category: "smireni",
      html: "<p>V Kuřimi se zpovídá ve čtvrtek od 17.30 hod a v pátek při modlitebním večeru, v Moravských Knínicích v pátek od 16.30 hod.</p>",
    },
    {
      category: "zmena",
      html: "<p>V sobotu 3. října jsou v obci Česká hody. V této souvislosti upozorňujeme na mimořádné změny v bohoslužbách příští neděli (4. října): v Kuřimi bude druhá mše svatá <strong>mimořádně v 11 hod</strong> a bude při ní zpívat sbor Magnificat z Lelekovic. V Moravských Knínicích mše svatá bude <strong>již v 9.30 hod</strong>.</p>",
    },
    {
      category: "pozvanka",
      html: '<p>Připravujeme farní pouť do Lukova, rodiště blahoslaveného Jana Buly, a na adventní trhy do Třebíče. Pojede se v sobotu 19. prosince, cena 300 Kč, přihláška do 10. října na <a href="mailto:poutnicimkk@seznam.cz">poutnicimkk@seznam.cz</a>.</p>',
      newsId: "pout-lukov-trebic",
    },
    {
      category: "podekovani",
      html: "<p>Děkujeme všem, kdo zajišťovali mši svatou na náměstí Osvobození a farní stánek na Medových dnech. Byla to zdařilá evangelizace zpěvem, vlídným přijetím, pohoštěním a společným slavením.</p>",
    },
  ],
};

/**
 * Days whose masses differ from the regular schedule: the changed days of the ohlášky first, then
 * cancellations or changes outside this week's ohlášky (the first entry for a date wins).
 */
export const scheduleExceptions: ScheduleException[] = [
  ...sheetExceptions(serviceSheet, Object.keys(places) as PlaceId[]),
];
