import type { NewsEvent } from "@/content/types/news";
import { UPLOADS } from "../uploads";

export const july: NewsEvent[] = [
  {
    id: "hody-jinacovice-2026",
    title: "Krojované hody v Jinačovicích",
    start: "2026-07-24",
    end: "2026-07-26",
    place: "Jinačovice, sokolské hřiště",
    text: "TJ Sokol Jinačovice, obec a stárci zvou na Mladé hody a Den obce Jinačovice.",
    body: "<p>Vstup ve společenském oblečení.</p>",
    program: [
      { time: "pá 18:00", title: "Stavění a hlídání máje" },
      { time: "so 19:00", title: "Hodová zábava s DH Šardičanka", note: "vstupné 200 Kč" },
      { time: "ne 11:00", title: "Slavnostní hodová mše svatá" },
      { time: "ne 14:00", title: "Den obce s CM Primáš z Boleradic" },
    ],
    poster: {
      src: `${UPLOADS}/hody-jinacovice-2026-plakat.webp`,
      alt: "Plakát: Krojované hody v Jinačovicích 24.–26. července 2026",
    },
    attachments: [{ label: "Plakát", file: `${UPLOADS}/hody-jinacovice-2026-plakat.jpg`, size: 5950526 }],
  },
  {
    id: "paray-le-monial-2026",
    title: "Paray-le-Monial s komunitou Emmanuel",
    start: "2026-07-26",
    end: "2026-07-31",
    place: "Paray-le-Monial, Francie",
    text: "Mezinárodní duchovní program s komunitou Emmanuel s mottem „Nebojte se… stát se mými učedníky!“.",
    body: "<p>Čeká vás čas naplněný chválami, radostnou liturgií, vyučováním i ztišením u Ježíšova Srdce a prostor pro sdílení s ostatními.</p>",
    registrationDeadline: "2026-04-20",
    poster: {
      src: `${UPLOADS}/paray-le-monial-2026-plakat.webp`,
      alt: "Plakát: Nebojte se… stát se mými učedníky! Paray-le-Monial 2026",
    },
    attachments: [{ label: "Plakát", file: `${UPLOADS}/paray-le-monial-2026-plakat.pdf`, size: 2323426 }],
    links: [{ label: "Informace a přihláška", href: "https://www.emmanuel.cz/nebojte-se/" }],
  },
];
