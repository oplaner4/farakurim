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

export type MassEntry = {
  time: ClockTime;
  place: PlaceId;
  note?: string;
};

/**
 * Which weeks of the month a regular service takes place in: `first-in-month` is the first such weekday of the
 * month ("1. pátek v měsíci"), `not-first-in-month` the others (it gives way to a first-in-month variant).
 */
export type ServiceRule = "every" | "first-in-month" | "not-first-in-month";

/** One row of the weekly schedule (§14.4). Masses also feed the homepage "next mass". */
export type RegularService = MassEntry & {
  weekday: Weekday;
  /** "Adorace", "Modlitební večer"; omitted for a mass ("Mše svatá"). Only masses count as the next mass. */
  title?: string;
  /** Defaults to `every`. */
  rule?: ServiceRule;
};

/** Replaces the whole regular schedule (masses) for one day. An empty `masses` list cancels the day. */
export type ScheduleException = {
  date: IsoDate;
  masses: MassEntry[];
  reason?: string;
};

/** This week's ohlášky (§14.1 "Tento týden"). */
export type ServiceSheet = {
  pdfUrl: string;
  validFrom: IsoDate;
  validTo: IsoDate;
  /**
   * "Změny tento týden", as written in the ohlášky. Display text only: the changed masses themselves are
   * `scheduleExceptions`, which the next-mass countdown uses.
   */
  changes: { date: IsoDate; text: string }[];
  /** "Svátost smíření tento týden": "Čt 17:30 Kuřim". */
  confession: string[];
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
};

export type Album = {
  id: string;
  title: string;
  date: IsoDate;
  href: string;
  cover?: string;
};

export type PetrklicIssue = {
  issue: string;
  description: string;
  pdfUrl: string;
  archiveUrl: string;
  cover?: string;
};

export type CarouselSlide = {
  file: string;
  alt: string;
};
