import type { CarouselSlide } from "./types";

// Subpages are not rebuilt yet, so links point to the current live site.
const LIVE = "https://farakurim.cz";

export const links = {
  home: "/",
  news: `${LIVE}/aktuality/`,
  services: `${LIVE}/porad_bohosluzeb/`,
  gallery: `${LIVE}/fotogalerie`,
  petrklic: `${LIVE}/petrklic/`,
  contacts: `${LIVE}/kontakty`,
  virtualTour: `${LIVE}/virtualni_prohlidka/`,
};

export const mainNav = [
  { label: "Úvod", href: links.home },
  { label: "Aktuality", href: links.news },
  { label: "Bohoslužby", href: links.services },
  { label: "Fotogalerie", href: links.gallery },
  { label: "Petrklíč", href: links.petrklic },
  { label: "Kontakty", href: links.contacts },
];

export const parish = {
  name: "Římskokatolická farnost Kuřim",
  villages: ["Kuřim", "Moravské Knínice", "Jinačovice", "Česká"],
  bankAccount: "247704317/0300",
};

export const contacts = {
  street: "Křížkovského 55/5",
  city: "664 34 Kuřim",
  phones: ["541 230 183", "723 661 146"],
  email: "fara.kurim@seznam.cz",
  officeHours: [{ time: "Po 9:00–10:00" }, { time: "Čt 19:00–20:00", note: "mimo prázdniny" }],
  officeHoursOther: "jindy dle domluvy",
};

export const carouselSlides: CarouselSlide[] = [
  { file: "1.webp", alt: "Kostel sv. Maří Magdalény v Kuřimi s věží a schodištěm v zeleni" },
  { file: "2.webp", alt: "Bílý kostel sv. Markéty v Moravských Knínicích" },
  { file: "3.webp", alt: "Presbytář kuřimského kostela nad kvetoucími šeříky" },
  { file: "4.webp", alt: "Boční vchod kostela sv. Maří Magdalény v jarní zeleni" },
  { file: "5.webp", alt: "Kuřimský kostel s kamenným křížem před presbytářem" },
  { file: "6.webp", alt: "Věž kostela sv. Maří Magdalény nad korunami stromů" },
  { file: "7.webp", alt: "Kaplička u kamenné zdi pod kostelem, nad ní kvetoucí šeřík" },
];
