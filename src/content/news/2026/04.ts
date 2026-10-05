import type { NewsEvent } from "@/content/types/news";
import { UPLOADS } from "../uploads";

export const april: NewsEvent[] = [
  {
    id: "velikonoce-v-altottingu-2026",
    title: "Velikonoce v Altöttingu",
    start: "2026-04-02",
    end: "2026-04-06",
    place: "Altötting, Německo",
    text: "Velikonoční setkání pro mladé v německém poutním místě: společné prožití největších křesťanských svátků.",
    poster: {
      src: `${UPLOADS}/velikonoce-v-altottingu-2026-plakat.webp`,
      alt: "Plakát: Velikonoce v Altöttingu 2.–6. 4. 2026",
    },
    attachments: [{ label: "Plakát", file: `${UPLOADS}/velikonoce-v-altottingu-2026-plakat.png`, size: 1747956 }],
    links: [{ label: "Velikonoce v Altöttingu", href: "https://mladi.emmanuel.cz/velikonoce/" }],
  },
  {
    id: "radostna-pout-na-vranov-2026",
    title: "Radostná pouť s Pannou Marií na Vranov",
    start: "2026-04-11",
    time: "11:30",
    place: "Kuřim, Lelekovice a Vranov u Brna",
    text: "Pouť s obědem v Kuřimi nebo společným putováním z Lelekovic, zakončená mší svatou na Vranově.",
    body: "<p>Trasa z Lelekovic měří 5 km, je vhodná i pro kočárky a pouť se koná za každého počasí.</p>",
    program: [
      { time: "11:30", title: "Oběd v Kuřimi" },
      { time: "13:30", title: "Putování z Lelekovic", note: "od kostela" },
      { time: "16:00", title: "Mše svatá", note: "kostel Narození Panny Marie na Vranově (přibližně)" },
    ],
    poster: {
      src: `${UPLOADS}/radostna-pout-na-vranov-2026-plakat.webp`,
      alt: "Plakát: Radostná pouť s Pannou Marií na Vranov 11. dubna 2026",
    },
    attachments: [{ label: "Plakát", file: `${UPLOADS}/radostna-pout-na-vranov-2026-plakat.jpg`, size: 519588 }],
  },
  {
    id: "kurz-evangelizace-2026",
    title: "Kurz evangelizace",
    start: "2026-04-18",
    end: "2026-05-23",
    text: "Kurz brněnské diecéze o tom, jak sdílet a předávat svou víru: vyučování, modlitba chval, skupinky a svědectví.",
    body: "<p>Setkání se konají v sobotu 18. 4., 25. 4. a 9. 5. a o víkendu 22.–23. 5. Témata: Pojď a uvidíš; Proč církev nemůže mlčet; Z Galileje až na konec země; Jděte a hlásejte!</p>",
    registrationDeadline: "2026-04-02",
    poster: {
      src: `${UPLOADS}/kurz-evangelizace-2026-plakat.webp`,
      alt: "Plakát: Kurz evangelizace brněnské diecéze 2026",
    },
    attachments: [{ label: "Plakát", file: `${UPLOADS}/kurz-evangelizace-2026-plakat.jpg`, size: 56345 }],
    links: [{ label: "Biskupství brněnské", href: "https://www.biskupstvi.cz/" }],
    sessions: 4,
  },
  {
    id: "setkani-katechetu-2026",
    title: "Setkání katechetů",
    start: "2026-04-28",
    time: "18:00",
    place: "Tišnov, fara",
    text: "Setkání katechetů tišnovského děkanství se vzájemným sdílením a za účasti pracovníků Diecézního katechetického centra.",
    poster: {
      src: `${UPLOADS}/setkani-katechetu-2026-plakat.webp`,
      alt: "Plakát: Setkání katechetů tišnovského děkanství 28. dubna 2026",
    },
    attachments: [{ label: "Plakát", file: `${UPLOADS}/setkani-katechetu-2026-plakat.png`, size: 3867086 }],
  },
];
