import type { NewsEvent } from "@/content/types/news";
import { UPLOADS } from "../uploads";

export const january: NewsEvent[] = [
  {
    id: "trikralovy-koncert-2026",
    title: "Tříkrálový koncert",
    start: "2026-01-13",
    time: "18:00",
    place: "Kuřim, kostel sv. Maří Magdalény",
    text: "Základní umělecká škola a Klub přátel ZUŠ Kuřim zvou na Tříkrálový koncert.",
    poster: { src: `${UPLOADS}/trikralovy-koncert-2026-plakat.webp`, alt: "Plakát: Tříkrálový koncert 13. 1. 2026" },
    attachments: [{ label: "Plakát", file: `${UPLOADS}/trikralovy-koncert-2026-plakat.pdf`, size: 1893689 }],
  },
  {
    id: "farni-ples-2026",
    title: "Farní ples",
    start: "2026-01-16",
    time: "19:00",
    place: "Kuřim, Společenské a kulturní centrum",
    text: "První farní ples v roce oslav 800 let města. K tanci zahraje kapela 9K BAND a Cimbálová muzika Kyničan, připravena je i tombola.",
    body:
      "<p>Místenky lze koupit v kulturním centru, na faře nebo v Moravských Knínicích. S dotazy a rezervacemi skupin se můžete obrátit na Tomáše Večeřu.</p>" +
      "<p>Na ples jsou zváni všichni. Pořadatelé uvítají pomoc s šířením plakátů a příspěvky do tomboly.</p>",
    price: "místenka 350 Kč, večeře 150 Kč",
    poster: { src: `${UPLOADS}/farni-ples-2026-plakat.webp`, alt: "Plakát: Farní ples 16. ledna 2026" },
    attachments: [{ label: "Plakát", file: `${UPLOADS}/farni-ples-2026-plakat.png`, size: 445524 }],
  },
  {
    id: "kurz-mission-possible-2026",
    title: "Kurz Mission Possible",
    start: "2026-01-17",
    end: "2026-04-14",
    place: "Brno, komunita Emmanuel",
    text: "Kurz dialogu a misie pro angažované křesťany: jak předávat víru a hledat odpovědi na otázky misie v dnešní době.",
    body: "<p>Kurz probíhá ve dvě soboty (17. ledna a 21. března 2026) a ve čtyři úterní večery (27. ledna, 10. a 24. února a 14. dubna 2026) v komunitě Emmanuel v Brně.</p>",
    registrationDeadline: "2026-01-09",
    poster: {
      src: `${UPLOADS}/kurz-mission-possible-2026-plakat-1.webp`,
      alt: "Plakát: Mission Possible, kurz dialogu a misie",
    },
    attachments: [
      { label: "Plakát, 1. část", file: `${UPLOADS}/kurz-mission-possible-2026-plakat-1.jpg`, size: 885953 },
      { label: "Plakát, 2. část", file: `${UPLOADS}/kurz-mission-possible-2026-plakat-2.jpg`, size: 705064 },
    ],
    links: [{ label: "Přihláška na kurz", href: "https://www.emmanuel.cz/MP" }],
    sessions: ["2026-01-17", "2026-01-27", "2026-02-10", "2026-02-24", "2026-03-21", "2026-04-14"],
  },
  {
    id: "obnova-pro-manzele-2026",
    title: "Obnova pro manžele",
    start: "2026-01-24",
    end: "2026-03-21",
    place: "Kuřim, fara",
    text: "Tři sobotní setkání pro manžele: povzbuzení, sdílení zkušeností, oživení a nová naděje.",
    body: "<p>Setkání obsahují společné chvály, přednášky, adoraci, vzájemné sdílení a mši svatou. Termíny: 24. ledna, 28. února a 21. března 2026. Pořádá farnost Kuřim s komunitou Emmanuel.</p>",
    poster: {
      src: `${UPLOADS}/obnova-pro-manzele-2026-plakat.webp`,
      alt: "Plakát: Obnova pro manžele na faře v Kuřimi",
    },
    attachments: [{ label: "Plakát", file: `${UPLOADS}/obnova-pro-manzele-2026-plakat.pdf`, size: 263447 }],
    links: [
      { label: "laskaapravdakurim@seznam.cz", href: "mailto:laskaapravdakurim@seznam.cz" },
      { label: "Komunita Emmanuel", href: "https://www.emmanuel.cz/" },
    ],
    sessions: ["2026-01-24", "2026-02-28", "2026-03-21"],
  },
  {
    id: "laska-a-pravda-2026",
    title: "Láska a pravda",
    start: "2026-01-24",
    end: "2026-03-21",
    place: "Kuřim, fara",
    mapQuery: "Křížkovského 55/5, Kuřim",
    text: "Osvětově-vzdělávací program pro život manželů v lásce a pravdě: cyklus tří sobotních celodenních seminářů.",
    body: "<p>Semináře se konají <strong>24. ledna</strong>, <strong>28. února</strong> a <strong>21. března</strong> na faře v Kuřimi (Křížkovského 55/5). Lektoruje tým Komunity Emmanuel.</p>",
    poster: { src: `${UPLOADS}/laska-a-pravda-2026-plakat.webp`, alt: "Plakát: Láska a pravda, program pro manžele" },
    attachments: [{ label: "Plakát", file: `${UPLOADS}/laska-a-pravda-2026-plakat.png`, size: 270672 }],
    links: [{ label: "Program Láska a pravda", href: "https://www.emmanuel.cz/manzele/" }],
    sessions: ["2026-01-24", "2026-02-28", "2026-03-21"],
  },
];
