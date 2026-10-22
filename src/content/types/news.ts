import type { ClockTime, IsoDate } from "./shared";

// News (news/): the events, their detail pages and the archive.

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
 * A meeting of a series: its day, or `{ date, end?, startTime?, endTime? }` when it lasts several days or keeps its own
 * time (its `startTime` and `endTime` replace the event's both).
 */
export type EventSession = IsoDate | ({ date: IsoDate; end?: IsoDate } & EventTimes);

/** The clock time of an event or meeting (Prague wall-clock): from `startTime`, until `endTime` when it is known. */
export type EventTimes = { startTime?: ClockTime; endTime?: ClockTime };

/** Colours of a free badge, from the design's tag colours (design/DESIGN.md §11.7); `blue` by default. */
export type TagColor = "blue" | "orange" | "magenta" | "grey";

/** A free badge on an event card. */
export type EventTag = { label: string; color?: TagColor };

/**
 * A cancelled or postponed event (design/DESIGN.md §11.9): its status, which every page listing it shows. The record
 * stays, as people may have saved, shared or imported it.
 */
export type EventChange = {
  /** The day the parish announced it (Prague date): "Oznámeno 12. 10. 2026" on the detail page. */
  announced?: IsoDate;
  /** One sentence for the reader: "Akce se ruší z důvodu nemoci přednášejícího." */
  note?: string;
} & (
  | { status: "cancelled" }
  /** `start`, `end`, `startTime` and `endTime` hold the new date; these the one before the move. */
  | { status: "moved"; previousStart: IsoDate; previousStartTime?: ClockTime; previousEndTime?: ClockTime }
);

/** The meetings of a series that do not take place, the other ones still do (design/DESIGN.md §11.9). */
export type CancelledMeetings = {
  /** Each a meeting's first day (`sessions`). */
  dates: IsoDate[];
  /** Added after "setkání 18. 10. odpadá, ostatní termíny platí.". */
  note?: string;
};

/**
 * One record of the Aktuality page (design/DESIGN.md §11.7) and its detail page (§13.4). The homepage shows
 * the nearest ones; the archive (§12) lists them from the day after they end.
 */
export type NewsEvent = {
  /** Also the URL part of the detail page (`/aktuality/<id>/`). */
  id: string;
  title: string;
  start: IsoDate;
  /** Last day of a multi-day event; omit for single-day events. */
  end?: IsoDate;
  /** "18:00"; omit for an all-day event. */
  startTime?: ClockTime;
  /** "20:30"; only with `startTime`, and after it. */
  endTime?: ClockTime;
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
  /** Free badges after the computed ones ("Pro rodiny"); a cancelled event is a `change`, not a tag. */
  tags?: EventTag[];
  /** Cancelled or postponed. */
  change?: EventChange;
  /** A series' meetings that do not take place. */
  cancelledMeetings?: CancelledMeetings;
  /**
   * Long-term series, listed under "Dlouhodobé akce" until `end`, which it needs. `weeklyAt` means it meets every
   * week on the weekday of `start` at that time.
   */
  longTerm?: true | { weeklyAt: ClockTime };
  /**
   * Shown in the "Doporučujeme" panel while it is not finished. At most one record is pinned: set it with
   * `pnpm pin-event` (scripts/lib/news/pin-event.ts), never by hand.
   */
  pinned?: boolean;
  /** Hidden by an admin from the archive; the detail page stays reachable by its URL. */
  archiveHidden?: boolean;
  /**
   * The day the record was added to the site (Prague date), the shared link's `article:published_time`. Set by
   * `parish-create-event` from October 2026; older records have none.
   */
  published?: IsoDate;
};
