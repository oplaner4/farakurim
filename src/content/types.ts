/** Calendar date in Europe/Prague, ISO format `YYYY-MM-DD`. */
export type IsoDate = string;

/** Wall-clock time in Europe/Prague, `H:MM` or `HH:MM`. */
export type ClockTime = string;

export type PlaceId = "kurim" | "moravske-kninice";

export type Place = {
  name: string;
  church: string;
};

export type MassEntry = {
  time: ClockTime;
  place: PlaceId;
  note?: string;
};

export type RegularMass = MassEntry & {
  /** 0 = neděle … 6 = sobota (same as `Date.getDay()`). */
  weekday: number;
};

/** Replaces the whole regular schedule for one day. An empty `masses` list cancels the day. */
export type ScheduleException = {
  date: IsoDate;
  masses: MassEntry[];
  reason?: string;
};

export type ServiceSheet = {
  pdfUrl: string;
  validFrom: IsoDate;
  validTo: IsoDate;
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
