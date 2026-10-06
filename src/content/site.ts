import { BUILD_TIME } from "@/lib/shared/build-time";
import { pragueDate } from "@/lib/shared/prague";
import type { CalendarId } from "@/content/types/calendar";
import type { OfficeHours } from "@/content/types/contacts";
import type { CarouselSlide } from "@/content/types/home";

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
  support: "/financni_podpora/aktualne/",
  supportArchive: "/financni_podpora/starsi/",
  religiousEducation: "/vyuka_nabozenstvi/",
  activities: "/aktivity/",
  chronicle: "/kronika_prehled_udalosti/",
  /** Group pages live under Seznam aktivit (`/aktivity/<group id>/`), like their breadcrumb. */
  schola: "/aktivity/schola/",
  choir: "/aktivity/chramovy_sbor/",
  youth: "/aktivity/spolecenstvi_mladych/",
  catechesis: "/aktivity/katecheze_pro_deti/",
  priestsFromParish: "/knezi_rodaci/",
  webLinks: "/odkazy/",
  privacy: "/ochrana-osobnich-udaju/",
  /** Lapentor tour copied from the old site; it lives only on the server (see the farnost-release skill). */
  virtualTour: "/virtualni_prohlidka/",
  viraCz: "https://www.vira.cz/",
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

/** Year of the build in Prague: the current Farní tábor and the footer copyright. */
export const BUILD_YEAR = Number(pragueDate(BUILD_TIME).slice(0, 4));

/**
 * Secondary pages, grouped for the "Více" menu and the sitemap footer (design/DESIGN.md §20.1). `color` is the
 * group's shard colour; the main menu items are not repeated here.
 */
export const navGroups = [
  {
    title: "Farnost",
    color: "blue",
    links: [
      { label: "Kalendář", href: links.calendar },
      { label: "Finanční podpora", href: links.support },
      { label: "Pastorační rada – členové", href: "/pastoracni_rada/clenove/" },
      { label: "Zápisy pastorační rady", href: "/pastoracni_rada/zapisy/" },
      { label: "Kronika farnosti", href: links.chronicle },
      { label: "Kněží – rodáci", href: links.priestsFromParish },
      { label: "Odkazy", href: links.webLinks },
    ],
  },
  {
    title: "Život ve farnosti",
    color: "green",
    links: [
      { label: "Schola", href: links.schola },
      { label: "Chrámový sbor", href: links.choir },
      { label: "Katecheze pro děti", href: links.catechesis },
      { label: "Výuka náboženství", href: links.religiousEducation },
      { label: "Společenství mladých", href: links.youth },
      { label: "Seznam aktivit", href: links.activities },
    ],
  },
  {
    title: "Farní tábor",
    color: "magenta",
    links: [
      { label: `Tábor ${BUILD_YEAR}`, href: `/farni_tabor/${BUILD_YEAR}/` },
      { label: "O táboru", href: "/farni_tabor/informace/" },
      { label: "Vedoucí", href: "/farni_tabor/vedouci/" },
      { label: "Kontakt", href: "/farni_tabor/kontakt/" },
      { label: "Ročníky", href: "/farni_tabor/rocniky/" },
    ],
  },
  {
    title: "Petrklíč a archivy",
    color: "orange",
    links: [
      { label: "Petrklíč – aktuální číslo", href: links.petrklic },
      { label: "Archiv Petrklíče", href: links.petrklicArchive },
      { label: "Archiv aktualit", href: links.newsArchive },
    ],
  },
] as const;

export type NavGroup = (typeof navGroups)[number];

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

/**
 * The self-hosted Matomo (`https://statistiky.farakurim.cz`) and the site's ID in it. Without both, no statistics
 * are collected (local and dev builds). Public in the built JS, like the calendar key.
 */
export const MATOMO_URL = process.env.NEXT_PUBLIC_MATOMO_URL || undefined;
export const MATOMO_SITE_ID = process.env.NEXT_PUBLIC_MATOMO_SITE_ID || undefined;

export const parish = {
  name: "Římskokatolická farnost Kuřim",
  /** The municipalities of the parish, linked to their websites in the footer and on Odkazy. */
  villages: [
    { name: "Kuřim", href: "https://www.kurim.cz/", description: "Oficiální stránky města Kuřimi" },
    { name: "Moravské Knínice", href: "https://www.moravskekninice.cz/", description: "Oficiální stránky obce" },
    { name: "Jinačovice", href: "https://www.obecjinacovice.cz/", description: "Oficiální stránky obce" },
    { name: "Česká", href: "https://www.ceska.cz/", description: "Oficiální stránky obce" },
  ],
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
