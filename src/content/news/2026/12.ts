import type { NewsEvent } from "@/content/types/news";
import { UPLOADS } from "../uploads";

export const december: NewsEvent[] = [
  {
    id: "pout-lukov-trebic",
    title: "Farní pouť do Lukova a adventní Třebíče",
    start: "2026-12-19",
    place: "Lukov a Třebíč",
    text: "Pouť do Lukova u Moravských Budějovic, rodiště blahoslaveného Jana Buly, a na adventní trhy do Třebíče.",
    price: "300 Kč",
    registrationDeadline: "2026-10-10",
    poster: {
      src: `${UPLOADS}/pout-lukov-trebic-plakat.webp`,
      alt: "Plakát: Farní pouť do Lukova a adventní Třebíče 19. 12. 2026",
    },
    attachments: [{ label: "Plakát", file: `${UPLOADS}/pout-lukov-trebic-plakat.png`, size: 4393631 }],
    links: [{ label: "poutnicimkk@seznam.cz", href: "mailto:poutnicimkk@seznam.cz" }],
  },
];
