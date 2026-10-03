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

export type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  start: IsoDate;
  /** Last day of a multi-day event; omit for single-day events. */
  end?: IsoDate;
  time?: ClockTime;
  href: string;
  image?: { src: string; alt: string };
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
