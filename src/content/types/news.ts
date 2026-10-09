import type { ClockTime, IsoDate } from "./shared";

// Aktuality (news/): the events, their detail pages and the archive.

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
 * A meeting of a series: its day, or `{ date, end?, time? }` when it lasts several days or keeps its own time
 * (`time` replaces the event's `time`).
 */
export type EventSession = IsoDate | { date: IsoDate; end?: IsoDate; time?: string };

/** Colours of a free badge, from the design's tag colours (design/DESIGN.md §11.7); `blue` by default. */
export type TagColor = "blue" | "orange" | "magenta" | "grey";

/** A free badge on an event card. */
export type EventTag = { label: string; color?: TagColor };

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
  /** Omitted for announcements without a venue (letters, online broadcasts). */
  place?: string;
  /** Short description, 1–2 sentences. */
  text: string;
  /** One sentence under the detail page's title; also the page description. Defaults to `text`. */
  lead?: string;
  /**
   * Detail page body as HTML (paragraphs, bold, links, lists). It is rendered as is, so it must come
   * from a trusted source (the content files) or be sanitised first. Defaults to `text` as one paragraph.
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
  /**
   * The meetings of a series, in order, from `start` to `end`: listed by its first date with "N setkání", and
   * one Kalendář entry and .ics event per meeting.
   */
  sessions?: EventSession[];
  /** Free badges after the computed ones ("Zrušeno", "Pro rodiny"). */
  tags?: EventTag[];
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
   * The day the record was added to the site (Prague date), the shared link's `article:published_time`. Set by
   * `farnost-create-aktualita` from October 2026; older records have none.
   */
  published?: IsoDate;
};
