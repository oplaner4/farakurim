import type { CalendarId, CarouselSlide, OfficeHours } from "./types";

/** Public origin of the site: absolute URLs in metadata, JSON-LD and calendar files. */
export const SITE_URL = "https://farakurim.cz";

export const links = {
  home: "/",
  news: "/aktuality/",
  newsArchive: "/aktuality/archiv/",
  services: "/porad_bohosluzeb/",
  gallery: "/fotogalerie/",
  petrklic: "/petrklic/aktualni/",
  petrklicArchive: "/petrklic/archiv/",
  contacts: "/kontakty/",
  calendar: "/kalendar/",
  /** Lapentor tour copied from the old site; it lives only on the server (see farnost-deploy). */
  virtualTour: "/virtualni_prohlidka/",
};

/** `color` is the section colour of the page, used for the current page's nav item. */
export const mainNav = [
  { label: "Úvod", href: links.home, color: "blue" },
  { label: "Aktuality", href: links.news, color: "magenta" },
  { label: "Bohoslužby", href: links.services, color: "blue" },
  { label: "Fotogalerie", href: links.gallery, color: "green" },
  { label: "Petrklíč", href: links.petrklic, color: "orange" },
  { label: "Kontakty", href: links.contacts, color: "blue" },
] as const;

/**
 * The parish's public Google Calendars (design/DESIGN.md §16.1). `subscribeUrl` adds the calendar to the visitor's
 * Google Calendar; it is the same link the old site used, so existing subscribers keep their calendars.
 */
export const parishCalendars: Record<CalendarId, { name: string; googleId: string; subscribeUrl: string }> = {
  services: {
    name: "Bohoslužby",
    googleId: "hho1ik2s8pu7742kv6eojt0tno@group.calendar.google.com",
    subscribeUrl:
      "https://calendar.google.com/calendar/u/0?cid=aGhvMWlrMnM4cHU3NzQya3Y2ZW9qdDB0bm9AZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ",
  },
  events: {
    name: "Události",
    googleId: "04gtmq4vqvu2jg624uiu2o0d18@group.calendar.google.com",
    subscribeUrl:
      "https://calendar.google.com/calendar/u/0?cid=MDRndG1xNHZxdnUyamc2MjR1aXUybzBkMThAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ",
  },
};

/**
 * Browser key for the Google Calendar API, restricted to the site's referrer. Without it, the calendars are
 * mock data generated from the schedule and Aktuality (`content/calendar.ts`).
 */
export const GOOGLE_CALENDAR_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY || undefined;

export const parish = {
  name: "Římskokatolická farnost Kuřim",
  villages: ["Kuřim", "Moravské Knínice", "Jinačovice", "Česká"],
  bankAccount: "247704317/0300",
};

const officeHours: OfficeHours[] = [
  { weekday: 1, from: "9:00", to: "10:00" },
  { weekday: 4, from: "19:00", to: "20:00", note: "mimo letní prázdniny", closed: { from: "07-01", to: "08-31" } },
];

export const contacts = {
  street: "Křížkovského 55/5",
  postalCode: "664 34",
  town: "Kuřim",
  /** Mapy.cz search for the parish office. */
  mapQuery: "Křížkovského 55/5 Kuřim",
  /** Mapy.com embed of the parish office (the share link mapy.com/s/lamepuvozu, resolved to Czech). */
  mapEmbed: "https://mapy.com/cs/turisticka?l=0&source=addr&id=11101983&x=16.5264040&y=49.2965974&z=17&frame=1",
  /** The parish office ("Fara") and the priest's mobile. */
  officePhone: "541 230 183",
  mobilePhone: "723 661 146",
  email: "fara.kurim@seznam.cz",
  officeHours,
  officeHoursOther: "jindy dle domluvy",
};

export const priest = {
  name: "PhDr. ThLic. Ing. Jaroslav Filka",
  // TODO: confirm the title with the parish (design/DESIGN.md §15.1).
  role: "duchovní správce farnosti",
};

export const socialLinks = [
  { label: "Facebook", href: "https://www.facebook.com/groups/803449889670805" },
  { label: "Instagram", href: "https://www.instagram.com/farnost_kurim/" },
  { label: "Linktree", href: "https://linktr.ee/FarnostKurim" },
] as const;

/** "Náměty a chyby na webu" (Kontakty). */
export const webmaster = { name: "Ondřej Planer", email: "oplaner4@gmail.com" };

export const carouselSlides: CarouselSlide[] = [
  { file: "1.webp", alt: "Kostel sv. Maří Magdalény v Kuřimi s věží a schodištěm v zeleni" },
  { file: "2.webp", alt: "Bílý kostel sv. Markéty v Moravských Knínicích" },
  { file: "3.webp", alt: "Presbytář kuřimského kostela nad kvetoucími šeříky" },
  { file: "4.webp", alt: "Boční vchod kostela sv. Maří Magdalény v jarní zeleni" },
  { file: "5.webp", alt: "Kuřimský kostel s kamenným křížem před presbytářem" },
  { file: "6.webp", alt: "Věž kostela sv. Maří Magdalény nad korunami stromů" },
  { file: "7.webp", alt: "Kaplička u kamenné zdi pod kostelem, nad ní kvetoucí šeřík" },
];
