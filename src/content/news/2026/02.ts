import type { NewsEvent } from "@/content/types/news";
import { UPLOADS } from "../uploads";

export const february: NewsEvent[] = [
  {
    id: "prvopatecni-setkani-2026",
    title: "Prvopáteční setkání",
    start: "2026-02-06",
    time: "19:00",
    place: "Brno, kostel sv. Tomáše, nebo Kuřim, kostel sv. Maří Magdalény",
    mapQuery: "kostel sv. Tomáše, Brno",
    text: "Prvopáteční setkání s tématem uzdravení: čas v adoraci, chvále i tichu.",
    body:
      "<p>Setkání se koná v pátek 6. února od 19:00 v Brně u sv. Tomáše, nebo v Kuřimi v kostele sv. Maří Magdalény. Program z Brna můžete sledovat také online.</p>" +
      "<p>Další setkání probíhají v Batelově v kostele sv. Petra a Pavla ve čtvrtek 5. 2., 5. 3., 2. 4., 7. 5. a 4. 6. od 19:30.</p>",
    poster: { src: `${UPLOADS}/prvopatecni-setkani-2026-plakat.webp`, alt: "Plakát: Prvopáteční setkání 6. 2. 2026" },
    attachments: [{ label: "Plakát", file: `${UPLOADS}/prvopatecni-setkani-2026-plakat.pdf`, size: 100188 }],
    links: [{ label: "Přenosy z kostela sv. Tomáše", href: "https://prenosy.svtomas.net/" }],
  },
];
