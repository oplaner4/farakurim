import type { CampContacts, CampQuote, CampTeam, CampTeamMember, CampYear, NextCamp } from "./types/camp";

/*
 * Tábor (design/DESIGN.md §29): the texts, the team, the contacts and the past years from the old site's pages
 * (farni_tabor/informace, vedouci, kontakt and the year pages). The team's photos are the old site's, cropped to 4:5
 * and uploaded to /uploads/tabor/vedouci/; each year's cover is a photo the parish chose, uploaded to
 * /uploads/tabor/rocniky/<year>.webp (the original resized to 800 px wide as WebP).
 */

/** The wide photo of O táboru (§29.2, 1), the old page's photo. */
export const campHero = {
  src: "/uploads/tabor/o-taboru.webp",
  small: "/uploads/tabor/o-taboru-nahled.webp",
  alt: "Účastníci a vedoucí farního tábora na společné fotografii na louce",
  /** Keeps the group in the wide box. */
  focusY: 62,
};

export const nextCamp: NextCamp = {
  year: 2027,
  applications: "zveřejníme zde a v aktualitách",
};

export const campQuotes: CampQuote[] = [
  {
    name: "Jakub",
    text: "Farní tábor je společenství tvořené vedoucími, praktikanty a dětmi, do kterého každý přináší něco jedinečného. Na to se snažím jako vedoucí tábora dávat důraz.",
  },
  {
    name: "Terka",
    text: "Tábor je pro mě příležitost strávit volný čas s dětmi a vrstevníky ve farnosti něčím smysluplným.",
  },
  {
    name: "Štěpánka",
    text: "Pro mě je tábor inspirující, možností předávání svých schopností a vědomostí, v neposlední řadě bytí spolu, a to s Bohem i kolektivem.",
  },
  {
    name: "Ondra",
    text: "I když zabere plánování tábora spoustu času, vždycky to bývá nezapomenutelný čas plný zážitků se skvělými lidmi.",
  },
  { name: "Dori", text: "Pro mě je to jeden týden, na který pak vzpomínám celý rok." },
];

const photo = (slug: string) => ({
  small: `/uploads/tabor/vedouci/${slug}-nahled.webp`,
  large: `/uploads/tabor/vedouci/${slug}.webp`,
});

const members: CampTeamMember[] = [
  {
    name: "Honza",
    age: 22,
    role: "Hlavní vedoucí",
    bio: "Na tábory jezdí od dětství. Baví ho práce s dětmi a příprava programu, hraje na kytaru.",
    photo: photo("honza"),
  },
  {
    name: "Bára",
    age: 18,
    role: "Zdravotnice",
    bio: "Jezdí už několik let, letos poprvé jako zdravotnice. Maturuje na gymnáziu v Tišnově, ráda čte a tvoří.",
    photo: photo("bara"),
  },
  {
    name: "Michal",
    age: 22,
    role: "Vedoucí",
    bio: "Pracuje ve strojírenství. Baví ho hry, filmy, kytara a hudba.",
    photo: photo("michal"),
  },
  {
    name: "Tomáš",
    age: 22,
    role: "Vedoucí",
    bio: "Vedoucím je pošesté. Studuje dějepis a fyziku na Pedagogické fakultě Masarykovy univerzity.",
    photo: photo("tomas"),
  },
  {
    name: "Simča",
    age: 19,
    role: "Vedoucí",
    bio: "Poprvé vedoucí, osmý tábor. Studuje ošetřovatelství, má ráda míčové hry a tanec.",
    photo: photo("simca"),
  },
  {
    name: "Šimon",
    age: 20,
    role: "Vedoucí",
    bio: "Člen SDH Sentice, na táboře popáté.",
    photo: photo("simon"),
  },
  {
    name: "Kuba D.",
    age: 17,
    role: "Vedoucí",
    bio: "Osmý tábor, poprvé jako vedoucí. Má rád hudbu a kamarády.",
    photo: photo("kuba-d"),
  },
  {
    name: "Olda",
    role: "Vedoucí",
    bio: "Jezdí několik let. Nadšenec do her a sportu.",
    photo: photo("olda"),
  },
  {
    name: "Anička",
    age: 16,
    role: "Praktikantka",
    bio: "Osmý tábor. Gymnázium Tišnov, hudba a kreslení.",
    photo: photo("anicka"),
  },
  {
    name: "Kuba C.",
    age: 17,
    role: "Praktikant",
    bio: "Třetím rokem praktikant. Únikovky, filmy a hudba.",
    photo: photo("kuba-c"),
  },
  {
    name: "Pája",
    age: 16,
    role: "Praktikantka",
    bio: "Třetím rokem praktikantka. Grafická škola v Brně.",
    photo: photo("paja"),
  },
  {
    name: "Agi",
    age: 16,
    role: "Praktikantka",
    bio: "Podruhé praktikantka. Biologie, basketbal a čtení.",
    photo: photo("agi"),
  },
  {
    name: "Kuba S.",
    age: 15,
    role: "Praktikant",
    bio: "Šestý tábor, poprvé praktikant. Sport a kamarádi.",
    photo: photo("kuba-s"),
  },
  {
    name: "Áďa",
    age: 16,
    role: "Praktikantka",
    bio: "Kytara, klavír, focení a skauting.",
    photo: photo("ada"),
  },
  {
    name: "Dominik",
    age: 15,
    role: "Praktikant",
    bio: "Volejbal, hokej a videohry.",
    photo: photo("dominik"),
  },
  {
    name: "Vanda",
    age: 15,
    role: "Praktikantka",
    bio: "Pátý tábor. Studuje kadeřnictví, hraje florbal.",
    photo: photo("vanda"),
  },
  {
    name: "David",
    age: 16,
    role: "Praktikant",
    bio: "Studuje fotografii. Hudba, tanec a hasičský sport.",
    photo: photo("david"),
  },
];

export const campTeam: CampTeam = { year: 2026, members };

export const campContacts: CampContacts = {
  people: [
    {
      name: "Tomáš Planer",
      role: "komunikace s rodiči",
      phone: "730 931 714",
      email: "tomas.planer@gmail.com",
    },
    {
      name: "Jan Cejnek",
      role: "hlavní vedoucí",
      phone: "704 092 367",
      email: "honzacejndisek@gmail.com",
    },
  ],
  duringCamp: "Telefony vedoucích jsou na táboře k zastižení hlavně večer. V naléhavém případě volejte Janu Cejnkovi.",
};

const zonerama = (album: number) => `https://eu.zonerama.com/FarnostKurim/Album/${album}`;
/** The year's cover, uploaded as an 800 px wide WebP. */
const cover = (year: number) => `/uploads/tabor/rocniky/${year}.webp`;

/** Newest first. The themes the old pages did not name are left out. */
export const campYears: CampYear[] = [
  {
    year: 2026,
    theme: "Cesta kolem světa za 80 dní",
    start: "2026-08-08",
    end: "2026-08-15",
    place: "fara v Cizkrajově",
  },
  {
    year: 2025,
    theme: "Western a kovbojové",
    start: "2025-08-09",
    end: "2025-08-16",
    place: "horská chata Olšanka ve Velkém Vrbně",
    album: zonerama(13713597),
    cover: cover(2025),
  },
  {
    year: 2024,
    theme: "Asterix a Obelix",
    start: "2024-08-10",
    end: "2024-08-17",
    place: "skautská základna v Čachnově",
    album: zonerama(11898112),
    cover: cover(2024),
  },
  {
    year: 2023,
    theme: "Pán prstenů",
    start: "2023-08-12",
    end: "2023-08-19",
    place: "skautská základna v Čachnově",
    album: zonerama(10239838),
    cover: cover(2023),
  },
  {
    year: 2022,
    theme: "Sherlock Holmes",
    start: "2022-08-13",
    end: "2022-08-20",
    place: "skautský dům v Hostinném",
    album: zonerama(8801519),
    cover: cover(2022),
  },
  {
    year: 2021,
    theme: "Jumanji",
    start: "2021-08-14",
    end: "2021-08-21",
    place: "fara v Pačlavicích",
    album: zonerama(7550569),
    cover: cover(2021),
  },
  {
    year: 2020,
    theme: "Řečtí bohové",
    start: "2020-08-15",
    end: "2020-08-22",
    place: "Staré Hutě",
    album: zonerama(6515817),
    cover: cover(2020),
  },
  {
    year: 2019,
    theme: "Piráti z Ostrova",
    start: "2019-08-15",
    end: "2019-08-21",
    place: "fara v Ostrově u Macochy",
    album: zonerama(5571364),
    cover: cover(2019),
  },
];
