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
};

/** An external link or e-mail (`mailto:`) for an event. */
export type EventLink = {
  label: string;
  href: string;
};

/** One record of the Aktuality page (design/DESIGN.md §11.7). The homepage shows the nearest ones. */
export type NewsEvent = {
  id: string;
  title: string;
  start: IsoDate;
  /** Last day of a multi-day event; omit for single-day events. */
  end?: IsoDate;
  /** Free text: "9:30", "18:00–20:30". */
  time?: string;
  place: string;
  /** Short description, 1–2 sentences. */
  text: string;
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
