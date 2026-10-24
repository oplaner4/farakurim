import type { ClockTime, IsoDate, Weekday, YearlyBreak } from "./shared";

// Services (masses.ts, service-sheets.json, schedule-exceptions.json): the parish churches, the weekly schedule,
// the service sheets and the changes announced for later.

/** The parish churches' places, the one list of PlaceId (the schema checks the content against it). */
export const PLACE_IDS = ["kurim", "moravske-kninice", "jinacovice"] as const;
export type PlaceId = (typeof PLACE_IDS)[number];

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
  /** Yearly break, e.g. the summer holidays: the service does not take place from `from` to `to` (inclusive). */
  closed?: YearlyBreak;
};

/**
 * Replaces the whole regular schedule for one day with the public services of that day (masses, adoration and other
 * mass-like services; never funerals, baptisms or weddings). An empty list cancels the day.
 */
export type ScheduleException = {
  date: IsoDate;
  services: ServiceEntry[];
  reason?: string;
};

/** The service sheets (src/content/service-sheets.json): the sheets by `validFrom`. */
export type ServiceSheetsFile = {
  sheets: ServiceSheetRecord[];
};

/**
 * The changes announced for days no sheet covers (src/content/schedule-exceptions.json), by date: a sheet that covers
 * one replaces it.
 */
export type ScheduleExceptionsFile = {
  exceptions: ScheduleException[];
};

/** Category of an announcement in a service sheet (design/DESIGN.md §14.5); it sets the label and its colour. */
export type AnnouncementCategory = "change" | "confession" | "invitation" | "thanks" | "info";

/** One announcement from a service sheet, word for word (§14.5). */
export type Announcement = {
  category: AnnouncementCategory;
  /**
   * The text as HTML (bold, links). It is rendered as is, so it must come from a trusted source (the content
   * files) or be sanitised first.
   */
  html: string;
  /** ID of the related event record: adds "Více v aktualitách". */
  newsId?: string;
};

/** A row of the weekly schedule in a service sheet (§14.6): "8:00 | Kuřim | Mše sv. – za …". */
export type SheetRow = {
  time: ClockTime;
  /** A parish church, or free text for other places ("Vranov"). */
  place: PlaceId | (string & {});
  /** "Mše sv.", "Adorace", "Pohřeb". */
  title: string;
  /** The mass intention or the name after the title: "za Komunitu Emmanuel". */
  detail?: string;
  /** A mass: in a parish place (`PlaceId`), it counts for the next-mass countdown and the services calendar. */
  mass?: boolean;
  /**
   * A mass-like public service (adoration, "Velikonoční obřady"): in a parish place, it counts for the countdown as the
   * next "bohoslužba". Never for funerals, baptisms or weddings.
   */
  service?: boolean;
  /**
   * Shows the "změna" tag. Computed for masses that are not in the regular schedule (`markChanges`); set it by hand
   * only for a change the PDF marks that the schedule cannot tell (the sheet's masses replace the regular ones anyway).
   */
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
 * One week's service sheet as structured content (§14.7): the "Tento týden" panel, the weekly schedule and,
 * through the changed rows, the schedule exceptions for the next mass and the calendar.
 */
export type ServiceSheet = {
  /** The printed service sheet, computed from `validFrom` and `rev` (toSheet() in src/lib/services/service-sheet.ts). */
  pdfUrl: string;
  validFrom: IsoDate;
  validTo: IsoDate;
  /** Revision of a released week's corrected PDF, from 2: a new file name, as a released upload is never replaced. */
  rev?: number;
  days: SheetDay[];
  /** In the editor's order; changes are shown first. */
  announcements: Announcement[];
};

/** One sheet as stored in src/content/service-sheets.json: the PDF's URL is computed. */
export type ServiceSheetRecord = Omit<ServiceSheet, "pdfUrl">;

/** The Intence card (§14.1, 3a): how to have a mass said for one's intention. */
export type Intentions = {
  /** The intro sentence; `emphasis` is shown in bold between `before` and `after`. */
  intro: { before: string; emphasis: string; after: string };
  why: string;
  /** Shown as pills. */
  reasons: string[];
  note: string;
};
