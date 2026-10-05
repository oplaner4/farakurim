import type { PastProject } from "./types/support";

/*
 * Starší projekty (design/DESIGN.md §28): the yearly accounts of the finished repairs, from the old site's
 * /financni_podpora/starsi, rounded to whole Kč. Newest year first; `null` = not recorded.
 */
export const pastProjects: PastProject[] = [
  {
    id: "kninice",
    title: "Kostel sv. Markéty v Moravských Knínicích",
    place: { name: "Moravské Knínice", color: "green" },
    summary: "Celková oprava kostela 2019–2023: střechy, věž, fasády. Od roku 2024 běžná údržba.",
    years: [
      { year: 2025, works: "běžná provozní údržba", budget: null, grants: null, gifts: null, costs: 213518 },
      { year: 2024, works: "zvonění", budget: null, grants: 0, gifts: 3620, costs: 15476 },
      {
        year: 2023,
        works: "severní fasáda, opěráky, omítky věže",
        budget: 833390,
        grants: 578000,
        gifts: 153540,
        costs: 783841,
      },
      { year: 2022, works: "cimbuří, helmice, fasáda", budget: 918498, grants: 500000, gifts: 292000, costs: 769331 },
      {
        year: 2021,
        works: "3. etapa: cimbuří věže, fasáda",
        budget: 901514,
        grants: 596000,
        gifts: 235312,
        costs: 1014499,
      },
      { year: 2020, works: "střecha, helmice věže", budget: 1294255, grants: 806000, gifts: 343540, costs: 1286157 },
      {
        year: 2019,
        works: "1. etapa: střecha presbytáře, obvodové zdi",
        budget: 784680,
        grants: 345000,
        gifts: 197258,
        costs: 543287,
      },
    ],
  },
  {
    id: "fara",
    title: "Budova fary v Kuřimi",
    place: { name: "Kuřim", color: "blue" },
    summary: "Postupná obnova fary a dvora 2019–2025: ohradní zeď, dláždění, střechy, komíny, interiéry.",
    years: [
      {
        year: 2025,
        works: "komíny, krov stodoly, odvlhčení, sokl, dveře",
        budget: 1011175,
        grants: 500000,
        gifts: 402742,
        costs: 1049415,
      },
      {
        year: 2024,
        works: "chodník, stropy, komíny, podlaha, výmalba",
        budget: 1266245,
        grants: 550000,
        gifts: 391609,
        costs: 1147845,
      },
      {
        year: 2023,
        works: "dláždění nádvoří, zastřešení, podlaha, krov",
        budget: 871567,
        grants: 500000,
        gifts: 470500,
        costs: 774938,
      },
      {
        year: 2022,
        works: "dláždění nádvoří, ploty, zastřešení",
        budget: 1149850,
        grants: 500000,
        gifts: 307400,
        costs: 915201,
      },
      { year: 2021, works: "3. etapa: sokl, dláždění", budget: 994860, grants: 350000, gifts: 343478, costs: 618813 },
      {
        year: 2020,
        works: "2. etapa: ohradní zeď, dláždění",
        budget: 1381208,
        grants: 700000,
        gifts: 419200,
        costs: 1028879,
      },
      { year: 2020, works: "přístavba WC a přístřešku", budget: 925078, grants: 0, gifts: 550000, costs: 507428 },
      {
        year: 2019,
        works: "1. etapa: ohradní zeď, vjezd",
        budget: 1294255,
        grants: 500000,
        gifts: 36000,
        costs: 655446,
      },
    ],
  },
  {
    id: "kostel",
    title: "Kostel sv. Maří Magdaleny v Kuřimi",
    place: { name: "Kuřim", color: "blue" },
    summary: "Pravidelná údržba kostela: krov, hodiny, zvony, elektroinstalace, topení.",
    years: [
      { year: 2025, works: "běžná provozní údržba", budget: null, grants: null, gifts: null, costs: 213518 },
      { year: 2024, works: "ochrana krovu proti škůdcům", budget: 200000, grants: 0, gifts: 20800, costs: 145200 },
      { year: 2023, works: "údržba, čištění, topné panely", budget: 120000, grants: 0, gifts: 52768, costs: 92032 },
      { year: 2022, works: "hodiny, zvony, elektro", budget: 70000, grants: 0, gifts: 15000, costs: 30750 },
      { year: 2021, works: "běžná údržba", budget: 50000, grants: 0, gifts: 28361, costs: 18148 },
      { year: 2020, works: "čištění, drobné opravy", budget: 25000, grants: 0, gifts: 17900, costs: 14278 },
    ],
  },
];
