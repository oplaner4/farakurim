/** Calendar date in Europe/Prague, ISO format `YYYY-MM-DD`. */
export type IsoDate = string;

/** Wall-clock time in Europe/Prague, `H:MM` or `HH:MM`. */
export type ClockTime = string;

/** Calendar day that repeats every year, `MM-DD`. */
export type MonthDay = string;

/** 0 = neděle … 6 = sobota (same as `Date.getDay()`). */
export type Weekday = number;

export type PlaceId = "kurim" | "moravske-kninice" | "jinacovice";

/** A church's colour from the logo (design/DESIGN.md §14.3): card border, map button, day names. */
export type ChurchColor = "blue" | "green" | "orange";

export type Place = {
  name: string;
  /** Full name on the schedule cards and Kontakty: "Chrám Páně sv. Maří Magdaleny". */
  church?: string;
  /** Short form after the place on the homepage: "kostel sv. Maří Magdalény". */
  churchShort?: string;
  color: ChurchColor;
  /** Mapy.cz search. */
  mapQuery: string;
  /** No regular services: "Bohoslužby dle domluvy na faře." */
  byAgreement?: boolean;
};

/** A service in a parish church: a mass, or a mass-like service when it has a `title`. */
export type ServiceEntry = {
  time: ClockTime;
  place: PlaceId;
  /** "Adorace", "Velikonoční obřady"; omitted for a mass ("Mše svatá"). */
  title?: string;
  note?: string;
};

/**
 * Which weeks of the month a regular service takes place in: `first-in-month` is the first such weekday of the
 * month ("1. pátek v měsíci"), `not-first-in-month` the others (it gives way to a first-in-month variant).
 */
export type ServiceRule = "every" | "first-in-month" | "not-first-in-month";

/** One row of the weekly schedule (§14.4). Every row also feeds the homepage "next service". */
export type RegularService = ServiceEntry & {
  weekday: Weekday;
  /** Defaults to `every`. */
  rule?: ServiceRule;
};

/** Replaces the whole regular schedule (masses and other services) for one day. An empty list cancels the day. */
export type ScheduleException = {
  date: IsoDate;
  services: ServiceEntry[];
  reason?: string;
};

/** Category of an announcement in the ohlášky (design/DESIGN.md §14.5); it sets the label and its colour. */
export type AnnouncementCategory = "zmena" | "smireni" | "pozvanka" | "podekovani" | "info";

/** One announcement from the ohlášky, word for word (§14.5). */
export type Announcement = {
  category: AnnouncementCategory;
  /**
   * The text as HTML (bold, links). It is rendered as is, so the API that replaces the mock content must
   * sanitise it.
   */
  html: string;
  /** ID of the related Aktuality record: adds "Více v aktualitách". */
  newsId?: string;
};

/** A row of the weekly schedule in the ohlášky (§14.6): "8:00 | Kuřim | Mše sv. – za …". */
export type SheetRow = {
  time: ClockTime;
  /** A parish church, or free text for other places ("Vranov"). */
  place: PlaceId | (string & {});
  /** "Mše sv.", "Adorace", "Pohřeb". */
  title: string;
  /** The mass intention or the name after the title: "za Komunitu Emmanuel". */
  detail?: string;
  /**
   * `false` keeps `detail` off the website (only in the PDF): intentions and funerals name private people.
   * Defaults to `true`. Which rows are public is up to the parish (§14.6).
   */
  public?: boolean;
  /** A mass: it counts for the next-mass countdown and the services calendar. */
  mass?: boolean;
  /**
   * A mass-like public service (adoration, "Velikonoční obřady"): it counts for the countdown as the next
   * "bohoslužba". Never for funerals, baptisms or weddings.
   */
  service?: boolean;
  /** Differs from the regular schedule: shows the "změna" tag (the sheet's masses replace the regular ones anyway). */
  changed?: boolean;
};

export type SheetDay = {
  date: IsoDate;
  /** "27. neděle v mezidobí", "sv. Václav". */
  feast?: string;
  /** Sunday or solemnity: blue day name, magenta feast line. */
  solemnity?: boolean;
  rows: SheetRow[];
};

/**
 * The ohlášky of one week as structured content (§14.7): the "Tento týden" panel, the weekly schedule and,
 * through the changed rows, the schedule exceptions for the next mass and the calendar.
 */
export type ServiceSheet = {
  /** Optional: the printed ohlášky. */
  pdfUrl: string;
  validFrom: IsoDate;
  validTo: IsoDate;
  days: SheetDay[];
  /** In the editor's order; changes are shown first. */
  announcements: Announcement[];
};

/** A weekly office-hours slot (§15.2). */
export type OfficeHours = {
  weekday: Weekday;
  from: ClockTime;
  to: ClockTime;
  note?: string;
  /** Yearly break, e.g. the summer holidays: the slot does not apply from `from` to `to` (inclusive). */
  closed?: { from: MonthDay; to: MonthDay };
};

/** A file attached to an event; the type label ("PNG", "PDF") comes from the file extension. */
export type EventAttachment = {
  label: string;
  file: string;
  /** File size in bytes, shown on the detail page ("PNG · 1,2 MB"). */
  size?: number;
};

/** An external link or e-mail (`mailto:`) for an event. */
export type EventLink = {
  label: string;
  href: string;
};

/** A row of an event's programme: "9:30 | Slavnostní mše svatá – zpívá dětská schola". */
export type ProgramItem = {
  /** Free text: "9:30", "po mši". */
  time: string;
  title: string;
  note?: string;
};

/** A key fact on a highlight tile: a big value and a short label ("1226" / "založení kostela"). */
export type Highlight = {
  value: string;
  label: string;
};

/**
 * One record of the Aktuality page (design/DESIGN.md §11.7) and its detail page (§13.4). The homepage shows
 * the nearest ones; the archive (§12) lists them from the day after they end.
 */
export type NewsEvent = {
  id: string;
  /** URL part of the detail page (`/aktuality/<slug>/`); generated from the title when omitted. */
  slug?: string;
  title: string;
  start: IsoDate;
  /** Last day of a multi-day event; omit for single-day events. */
  end?: IsoDate;
  /** Free text: "9:30", "18:00–20:30". */
  time?: string;
  place: string;
  /** Short description, 1–2 sentences. */
  text: string;
  /** One sentence under the detail page's title; also the page description. Defaults to `text`. */
  lead?: string;
  /**
   * Detail page body as HTML (paragraphs, bold, links, lists). It is rendered as is, so the API that
   * replaces the mock content must sanitise it. Defaults to `text` as one paragraph.
   */
  body?: string;
  program?: ProgramItem[];
  /** Up to 3 tiles under their own heading ("800 let v datech"); only for real key facts. */
  highlights?: { title: string; items: Highlight[] };
  /** Mapy.cz search for "Zobrazit na mapě"; defaults to `place`. */
  mapQuery?: string;
  poster?: { src: string; alt: string };
  attachments?: EventAttachment[];
  links?: EventLink[];
  /** Tags */
  price?: string;
  registrationDeadline?: IsoDate;
  /** A series of meetings from `start` to `end`: listed by its first date with "N setkání". */
  sessions?: number;
  label?: string;
  /**
   * Long-term series, listed under "Dlouhodobé akce". `weeklyAt` means it meets every week
   * on the weekday of `start` at that time.
   */
  longTerm?: true | { weeklyAt: ClockTime };
  /** Shown in the "Doporučujeme" panel while it is not finished (at most one). */
  pinned?: boolean;
  /** Hidden by an admin from the archive; the detail page stays reachable by its URL. */
  archiveHidden?: boolean;
  /**
   * ID of the matching event in the Události Google Calendar (for a recurring event, the series' ID), so the
   * Kalendář links the event to this detail page (design/DESIGN.md §16.4).
   */
  calendarEventId?: string;
};

/** The parish's two Google Calendars (design/DESIGN.md §16.1): "Bohoslužby" and "Události" (names in `parishCalendars`). */
export type CalendarId = "services" | "events";

/**
 * One occurrence in a parish calendar, as Google Calendar returns it with recurring events expanded
 * (`singleEvents=true`). Exceptions and cancellations are already applied.
 */
export type CalendarEntry = {
  /** Unique within its calendar (Google's instance ID). */
  id: string;
  calendar: CalendarId;
  title: string;
  date: IsoDate;
  /** Last day of a multi-day entry (inclusive). */
  end?: IsoDate;
  /** Start time; omitted for all-day entries ("celý den"). */
  time?: ClockTime;
  place?: string;
  /** Detail page of the matching Aktuality record. */
  href?: string;
};

/** One photo of an album, in the two sizes Zonerama serves (design/DESIGN.md §19.2). */
export type AlbumPhoto = {
  /** Thumbnail for the album strips and the "Další alba" rows. */
  small: string;
  /** Larger size for the homepage carousel (and a later lightbox). */
  large: string;
};

/** A Zonerama album (design/DESIGN.md §19.2). The alt text of a photo is "<title>, fotografie N". */
export type Album = {
  id: string;
  title: string;
  date: IsoDate;
  /** The album on Zonerama ("Otevřít album"). */
  href: string;
  photoCount: number;
  /** Omitted in the mock data: the strips then show `photoCount` designed placeholders. */
  photos?: AlbumPhoto[];
};

/** One issue of the Petrklíč newsletter (design/DESIGN.md §18.2). The volume (ročník) is computed from `year`. */
export type PetrklicIssue = {
  id: string;
  year: number;
  /** Issue number within the year: "1" in "1/2026". */
  number: number;
  /** Extra label for special issues: "1. část", "mimořádné". */
  note?: string;
  pdfUrl: string;
  /** Image of PDF page 1 (about 600 px wide, WebP); a tinted placeholder without it. */
  cover?: string;
  pageCount: number;
  /** Images of all pages, for the page viewer (§17.1); only the current issue needs them. */
  pageImages?: string[];
};

export type CarouselSlide = {
  file: string;
  alt: string;
};
