import type { NewsEvent } from "@/content/types/news";
import { UPLOADS } from "../uploads";

export const march: NewsEvent[] = [
  {
    id: "seminar-otcovo-srdce-2026",
    title: "Seminář Otcovo srdce",
    start: "2026-03-05",
    end: "2026-11-10",
    text: "Seminář, který vám pomůže objevit lásku a dobrotu Nebeského Otce i vaši identitu Božího syna či dcery.",
    body:
      "<p>Program zahrnuje vyučování, osobní svědectví a modlitby za uzdravení srdce. Seminář je otevřený pro všechny církevní denominace a doprovází ho český tým Otcova srdce; dva semináře vedou manželé de Hoxar z Velké Británie.</p>" +
      "<p>Termíny 2026: 5.–10. 3. Štěkeň, 9.–14. 4. Vranov u Brna, 14.–19. 5. Tuchoměřice, 25.–30. 6. Vranov u Brna (manželé de Hoxar), 3.–8. 8. Klatovy, 15.–20. 10. Vranov u Brna, 5.–10. 11. Želiv (manželé de Hoxar).</p>",
    poster: {
      src: `${UPLOADS}/seminar-otcovo-srdce-2026-letak.webp`,
      alt: "Leták: Seminář Otcovo srdce, termíny 2026",
    },
    attachments: [{ label: "Leták", file: `${UPLOADS}/seminar-otcovo-srdce-2026-letak.pdf`, size: 11009562 }],
    links: [{ label: "Otcovo srdce", href: "https://www.otcovosrdce.cz/" }],
    longTerm: true,
  },
  {
    id: "kurz-vedoucich-ministrantu-2026-03-06",
    title: "Kurz vedoucích ministrantů ve farnostech",
    start: "2026-03-06",
    end: "2026-03-08",
    place: "Osová Bítýška, centrum MAMRE",
    text: "Víkendový kurz pro současné i budoucí vedoucí ministrantů a ministrantek od 12 let.",
    body: "<p>Cena kurzu zahrnuje materiály i občerstvení po celou dobu trvání.</p>",
    price: "501 Kč",
    poster: {
      src: `${UPLOADS}/kurz-vedoucich-ministrantu-2026-03-06-plakat.webp`,
      alt: "Plakát: Kurz vedoucích ministrantů ve farnostech 6.–8. března 2026",
    },
    attachments: [
      { label: "Plakát", file: `${UPLOADS}/kurz-vedoucich-ministrantu-2026-03-06-plakat.jpg`, size: 318492 },
    ],
  },
  {
    id: "seminar-pro-katechety-2026",
    title: "Seminář pro katechety a lektory Vstupů do škol",
    start: "2026-03-12",
    time: "17:00",
    place: "Tišnov, fara",
    text: "Seminář na téma „Mučedníci totality“ P. Jan Bula a P. Václav Drbola. Otevřen je všem zájemcům.",
    body: "<p>Setkání s podtitulem „Věrnost pravdě, síla lásky a moc odpuštění“ povede lektorka Mgr. Veronika Chabičovská.</p>",
    poster: {
      src: `${UPLOADS}/seminar-pro-katechety-2026-pozvanka.webp`,
      alt: "Pozvánka: Seminář pro katechety a lektory Vstupů do škol 12. 3. 2026",
    },
    attachments: [{ label: "Pozvánka", file: `${UPLOADS}/seminar-pro-katechety-2026-pozvanka.png`, size: 992256 }],
  },
  {
    id: "petrklic-2026-1",
    title: "Petrklíč 1/2026",
    start: "2026-03-26",
    text: "Právě vyšlo nové vydání farního zpravodaje Petrklíč.",
    attachments: [{ label: "Petrklíč 1/2026", file: "/uploads/petrklic/2026-1/petrklic-2026-1.pdf", size: 22906328 }],
  },
];
