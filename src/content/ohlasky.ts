import "server-only";
import type { ScheduleException, ServiceSheet, SheetRow } from "@/content/types/services";

// The current ohlášky, filled from the parish's weekly PDF (`farnost-create-porad-bohosluzeb`). Server-only: rows marked not public must never reach a client bundle, so client
// components get what they need as props (the schedule exceptions, the PDF link), never this module.

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
  pdfUrl: "/uploads/porady_bohosluzeb/2026-10-04-porad-bohosluzeb.pdf",
  validFrom: "2026-10-04",
  validTo: "2026-10-11",
  days: [
    {
      date: "2026-10-04",
      feast: "27. neděle v mezidobí",
      solemnity: true,
      rows: [
        kurimMass("8:00", "za živou a † rodinu Valíčkovu"),
        {
          time: "9:30",
          place: "moravske-kninice",
          title: "Mše sv.",
          mass: true,
          detail: "za živou a zemřelou rodinu, přízeň a DO",
        },
        kurimMass("11:00", "za obec Česká, její obyvatele a rodáky", { title: "Hodová mše sv." }),
      ],
    },
    { date: "2026-10-05", feast: "sv. Faustyna Kowalská", rows: [kurimMass("8:00", "za posilu v pastýřské službě")] },
    { date: "2026-10-06", rows: [kurimMass("8:00", "za dar jednoty ve smýšlení a společném konání")] },
    { date: "2026-10-07", feast: "Panna Maria Růžencová", rows: [kurimMass("8:00", FOR_PARISHIONERS)] },
    {
      date: "2026-10-08",
      rows: [
        { time: "17:30", place: "kurim", title: "Adorace", service: true },
        kurimMass("18:00", "za uzdravení bratrských vztahů a obnovení důvěry"),
      ],
    },
    {
      date: "2026-10-09",
      rows: [
        kurimMass("16:45", "za † Janku Križalkovičovu"),
        { time: "18:00", place: "moravske-kninice", title: "Mše sv.", mass: true, detail: "za nemocnou osobu" },
      ],
    },
    { date: "2026-10-10", rows: [kurimMass("16:30", "za Komunitu Emmanuel")] },
    {
      date: "2026-10-11",
      feast: "28. neděle v mezidobí",
      solemnity: true,
      rows: [
        kurimMass("8:00", "za rodinu Skoupou a Kábelovu"),
        kurimMass("9:30", "za Boží požehnání pro vnoučata a kmotřence"),
        {
          time: "11:00",
          place: "moravske-kninice",
          title: "Mše sv.",
          mass: true,
          detail: "na poděkování za prožitá léta a požehnání pro celou rodinu",
        },
      ],
    },
  ],
  announcements: [
    {
      category: "smireni",
      html: "<p>V Kuřimi se zpovídá ve čtvrtek od 17.30 hod, v Moravských Knínicích v pátek po mši svaté.</p>",
    },
    {
      category: "pozvanka",
      html: '<p>Připravujeme <strong>farní pouť</strong> do Lukova, rodiště blahoslaveného Jana Buly, a na adventní trhy do Třebíče. Pojede se v sobotu <strong>19. prosince</strong>, cena 300 Kč, přihláška do <strong>10. října</strong> na <a href="mailto:poutnicimkk@seznam.cz">poutnicimkk@seznam.cz</a></p>',
      newsId: "pout-lukov-trebic",
    },
    {
      category: "pozvanka",
      html: '<p>V návaznosti na blahořečení Jana Buly a Václava Drboly vznikl v naší diecézi projekt <strong>Začni, kde jsi</strong>, který otevírá téma odpuštění a smíření. Chce připomenout, že odpuštění může být cestou k uzdravení vztahů, vnitřní svobodě a pokoji – a že někdy stačí začít jedním malým krokem.</p><p>K zapojení do projektu jsou zváni všichni lidé – věřící i nevěřící v celé diecézi. Jednou z možností je napsat dopis člověku, kterému potřebujete něco říct nebo přinést do vztahu s ním odpuštění. Nemusíte dopis posílat ani odevzdávat tomu člověku. Dopis můžete napsat anonymně na webu <a href="https://zacnikdejsi.cz">zacnikdejsi.cz</a>, nebo ho fyzicky vložit do schránky v brněnské katedrále. Dopisy se nebudou ukládat ani číst. Každou první neděli v měsíci až do konce roku bude v katedrále <strong>v 10:30 hod</strong> sloužena mše svatá za všechny tyto úmysly.</p>',
    },
    {
      category: "pozvanka",
      html: "<p>V pondělí <strong>12. října</strong> je <strong>Adorační den farnosti</strong>. Od 13 hod do 17:30 bude tichá adorace, v 17:30 společná modlitba růžence, svátostné požehnání s žehnáním farnosti a možnost přistoupit ke svatému přijímání. Po celé odpoledne bude kostel otevřen k modlitbě a uctění Nejsvětější svátosti.</p>",
    },
    {
      category: "pozvanka",
      html: "<p>Na <strong>Slavnost posvěcení kostela</strong> přijal pozvání Otec biskup Vojtěch Cikrle. V neděli <strong>18. října v 9.30 hod</strong> bude s námi slavit pontifikální mši svatou, a pak přibližně v 10.30 přijde do naší misijní kavárny na faře.</p>",
    },
  ],
};

/**
 * Hand-entered changes after this week's ohlášky, as soon as the parish announces them: each replaces its whole day
 * (`services: []` cancels it). `scheduleExceptions()` puts them after the sheet's days and drops the ones the sheet
 * covers or that are past.
 */
export const laterExceptions: ScheduleException[] = [];
