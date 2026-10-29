import type { NativityAlbum, NativityPlace, NativitySeason } from "./types/nativity";
import { UPLOADS_PATH } from "@/lib/shared/uploads";

/*
 * Betlémy (design/DESIGN.md §30): the exhibition seasons, newest first. A season's page takes over on 1. 11. of its
 * year and shows the finished season until the next one starts. 2025 comes from the old site's pages (Výstava,
 * Putování, the 2025 results and their photos, its photos from the year's album). 2026 is the design's draft (the
 * 2025 texts with the dates moved), commented out below until the parish confirms the dates, the guest collection and
 * the contest.
 */

const places: NativityPlace[] = [
  {
    name: "Kostel sv. Maří Magdalény",
    address: "Kuřim",
    notes: [
      "prostor pod kůrem",
      "venku u věže",
      "dvě oratoře v 1. patře – každá má vlastní vchod zvenku (věží a bočním vchodem)",
    ],
    color: "blue",
  },
  {
    name: "Fara – sbírka Zdeňka Jílka",
    address: "Křížkovského 55/5",
    notes: ["sál v přízemí", "vstup bočním vchodem dřevěnou brankou"],
    color: "green",
    accessible: true,
  },
];

/** A photo of the season uploaded to betlemy/<year>/ in two widths: "foto-3" → its 800 and 1600 px files. */
const photo = (year: number, name: string) => ({
  small: `${UPLOADS_PATH}betlemy/${year}/${name}-800.webp`,
  large: `${UPLOADS_PATH}betlemy/${year}/${name}-1600.webp`,
});

const planUrl = `${UPLOADS_PATH}betlemy/orientacni-planek.pdf`;
const mapQuery = "Kostel sv. Maří Magdalény Kuřim";

const guestCollection = {
  label: "Novinka na faře",
  title: "Betlémy ze sbírky Zdeňka Jílka a jeho přátel",
  text: "Sběratel z Tišnova vlastní asi 220 betlémů, hlavně dřevěných. Spoluautorem výstavy je Luboš Plachý z Molenburku u Sloupu.",
  materials: [
    "dřevo",
    "šustí",
    "sláma",
    "papír",
    "lýko",
    "překližka",
    "polyresin",
    "sklo",
    "keramika",
    "porcelán",
    "krušnohorské",
  ],
  exhibitors: [
    { name: "Jana Svobodová", place: "Drásov", work: "betlém z těsta" },
    { name: "Antonín Srba", place: "Železný", work: "pohyblivý dřevěný betlém" },
    { name: "Martin Drápela", place: "Osová Bítýška", work: "keramické figurky" },
    { name: "Marcela Petrášová", place: "Lažánky", work: "betlém z březových polínek" },
    { name: "Adriana Patáková", place: "Tišnov", work: "perníkový betlém" },
    { name: "Bohumil Dušek", place: "Praha", work: "mechanické betlémy" },
    { name: "manželé Štefkovi", place: "Blažovice", work: "tištěné papírové betlémy na překližce" },
    { name: "Jaroslav Ševčík", place: "Veverská Bítýška", work: "papírové a keramické betlémy" },
  ],
};

const highlights = [
  { title: "Betlémy dětí z MŠ a ZŠ", text: "Vyrobily je děti z mateřských a základních škol z Kuřimi a okolí." },
  { title: "Rodinné betlémy", text: "Zapůjčili je obyvatelé Kuřimi a okolí a známí sběratelé." },
  { title: "Venkovní betlém ZŠ DiviZna", text: "Je součástí betlémského putování městem." },
];

const tourTitle = "Komentovaná prohlídka se Zdeňkem Jílkem";
const walk = { stops: 9, note: "předposlední zastávkou je venkovní betlém ZŠ DiviZna" };
const sharedScene = { since: 2024, maxHeight: "nejvýše 20 cm", where: "do kostela v Kuřimi", phone: "725 867 515" };

export const nativitySeasons: NativitySeason[] = [
  // The 2026 draft, hidden until the parish confirms it (dates, guest collection, contest); restore and correct it.
  // {
  //   year: 2026,
  //   edition: 7,
  //   openingDays: [
  //     { date: "2026-12-19", from: "14:00", to: "17:00", note: "zahájení výstavy" },
  //     { date: "2026-12-20", from: "10:30", to: "12:00", note: "komentovaná prohlídka se Zdeňkem Jílkem" },
  //     { date: "2026-12-24", from: "13:00", to: "15:00", note: "v 15:00 vánoční příběh se scholou" },
  //     { date: "2026-12-25", from: "10:30", to: "12:00" },
  //     { date: "2026-12-26", from: "14:00", to: "17:00" },
  //     { date: "2026-12-27", from: "14:00", to: "17:00" },
  //     { date: "2027-01-01", from: "14:00", to: "17:00" },
  //     { date: "2027-01-03", from: "14:00", to: "17:00", note: "poslední den" },
  //   ],
  //   hoursNote: "Ve čtvrtek 24. 12. v 15:00 následuje v kostele vánoční příběh s doprovodem dětské scholy.",
  //   places,
  //   planUrl,
  //   mapQuery,
  //   guest: {
  //     ...guestCollection,
  //     tour: { title: tourTitle, date: "2026-12-20", from: "10:30", to: "12:00", place: "fara" },
  //   },
  //   highlights,
  //   contest: { entrants: "třetími třídami", classes: 7, villages: 3 },
  //   sharedScene: { ...sharedScene, from: "2026-12-06", to: "2026-12-24" },
  //   walk,
  //   intentionsMass: { date: "2027-01-10", time: "9:30" },
  // },
  {
    year: 2025,
    edition: 6,
    openingDays: [
      { date: "2025-12-20", from: "14:00", to: "17:00", note: "zahájení výstavy" },
      { date: "2025-12-21", from: "10:30", to: "12:00", note: "komentovaná prohlídka se Zdeňkem Jílkem" },
      { date: "2025-12-24", from: "13:00", to: "15:00", note: "v 15:00 vánoční příběh se scholou" },
      { date: "2025-12-25", from: "10:30", to: "12:00" },
      { date: "2025-12-27", from: "14:00", to: "17:00" },
      { date: "2025-12-28", from: "14:00", to: "17:00" },
      { date: "2026-01-01", from: "14:00", to: "17:00" },
      { date: "2026-01-04", from: "14:00", to: "17:00", note: "poslední den" },
    ],
    hoursNote: "Ve středu 24. 12. v 15:00 následuje v kostele vánoční příběh s doprovodem kuřimské dětské scholy.",
    places,
    planUrl,
    mapQuery,
    guest: {
      ...guestCollection,
      tour: { title: tourTitle, date: "2025-12-21", from: "10:30", to: "12:00", place: "fara" },
    },
    highlights,
    contest: {
      entrants: "třetími třídami",
      classes: 7,
      villages: 3,
      summary:
        "Soutěžilo 7 třetích tříd: 4 z Kuřimi, 2 z Lelekovic a 1 z Moravských Knínic. Odevzdáno bylo 574 hlasovacích lístků (15 neplatných). Vítězům gratulujeme a všem třídám děkujeme!",
      results: [
        {
          className: "3.A",
          school: "ZŠ Tyršova Kuřim",
          teacher: "Mgr. Jana Humpolíčková",
          votes: 119,
          photo: photo(2025, "soutez-1"),
        },
        {
          className: "3.B",
          school: "ZŠ Lelekovice",
          teacher: "Mgr. Markéta Nečasová",
          votes: 95,
          photo: photo(2025, "soutez-2"),
        },
        {
          className: "3.C + 4.C",
          school: "školní družina Jungmannova Kuřim",
          teacher: "Monika Obůrková",
          votes: 90,
          photo: photo(2025, "soutez-3"),
        },
      ],
    },
    sharedScene: { ...sharedScene, from: "2025-12-06", to: "2025-12-24" },
    walk,
    intentionsMass: { date: "2026-01-11", time: "9:30" },
    // From the album "Nafocené betlémy z výstavy" (nativityAlbums, 2025).
    photo: {
      ...photo(2025, "vystava"),
      alt: "Betlém s Pannou Marií, svatým Josefem, pastýři a ovečkami pod vánočním stromkem",
    },
    photos: Array.from({ length: 12 }, (_, i) => photo(2025, `foto-${i + 1}`)),
  },
];

/**
 * The exhibitions' Zonerama albums, newest first: the year pills of "Z minulých ročníků", and the season's own album
 * after its exhibition ("Celé album výstavy").
 */
export const nativityAlbums: NativityAlbum[] = [
  { year: 2025, url: "https://eu.zonerama.com/FarnostKurim/Album/14645111" },
  { year: 2024, url: "https://eu.zonerama.com/FarnostKurim/Album/12670330" },
  { year: 2023, url: "https://eu.zonerama.com/FarnostKurim/Album/10938936" },
  { year: 2022, url: "https://eu.zonerama.com/FarnostKurim/Album/9374540" },
  { year: 2021, url: "https://eu.zonerama.com/FarnostKurim/Album/8061165" },
  { year: 2020, url: "https://eu.zonerama.com/FarnostKurim/Album/6880365" },
];

/** The contest results that stay on the old site (public/.htaccess redirects their old URLs there), newest first. */
export const oldSiteContestResults = [
  { year: 2025, url: "https://stary.farakurim.cz/betlemy/2025" },
  { year: 2024, url: "https://stary.farakurim.cz/betlemy/2024" },
];
