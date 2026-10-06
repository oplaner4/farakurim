import type { AlbumPhoto } from "./gallery";

// Seznam aktivit (activities.ts, design/DESIGN.md §25).

/** One activity of the parish and whom to ask. Contacts are names only (GDPR). */
export type Activity = {
  name: string;
  /** How often, when known: "každou neděli po mši v 10:30". */
  when?: string;
  /** "Michal Císař, Standa Krčma (MK)"; "hledáme" where nobody is responsible yet. */
  contacts: string;
  /** The activity's own page (a group page, Výuka náboženství): "Více o skupině". */
  href?: string;
};

export type ActivityGroup = {
  id: string;
  /** "Pravidelné" */
  title: string;
  /** The shard of the group's heading: Pravidelné green, Správa blue, Jednorázové magenta. */
  color: "green" | "blue" | "magenta";
  activities: Activity[];
};

/** A contact person of a page (Výuka náboženství, a group page). */
export type ContactPerson = {
  name: string;
  /** "pastorační asistentka" */
  role: string;
  /** "736 529 285" */
  phone?: string;
  /** "jen v naléhavých případech" */
  phoneNote?: string;
  email?: string;
};

// Výuka náboženství (religious-education.ts, design/DESIGN.md §24).

/** One class of the timetable. */
export type TimetableRow = {
  /** "1.–2.", "6.–9." */
  grade: string;
  /** "1. skupina", when one grade range has more groups. */
  group?: string;
  /** "pátek" */
  day: string;
  /** "12:15–13:00", or a note ("podle rozpisu skupin"). */
  time: string;
  room: string;
  teacher: string;
};

export type SchoolTimetable = {
  id: string;
  /** "ZŠ Tyršova" */
  name: string;
  rows: TimetableRow[];
};

export type ReligiousEducation = {
  /** "2026/2027": edit each September with the new timetable. */
  schoolYear: string;
  schools: SchoolTimetable[];
  /** The application form and the rules, uploaded to /uploads/. */
  applicationForm: string;
  rules: string;
  contact: ContactPerson;
};

// The group pages (groups.ts, design/DESIGN.md §27): Schola, Chrámový sbor, Společenství mládeže, Katecheze.

/** A YouTube video, played from youtube-nocookie.com only after a click. */
export type GroupVideo = {
  youtubeId: string;
  title: string;
  /** Length in seconds. */
  seconds: number;
  /** The thumbnail, uploaded to /uploads/ so the page loads nothing from YouTube before a click. */
  thumbnail: string;
};

/** A group of the parish, listed under "Další skupiny" and in its own page's breadcrumb. */
export type GroupLink = {
  id: string;
  name: string;
  /** One line under the name: "každou neděli 18:30". */
  note: string;
  href: string;
};

/** A group page; every block but the heading is optional, a group fills only what it has. */
export type GroupPage = GroupLink & {
  /** One sentence under the H1. */
  tagline: string;
  /** The meta description; the tagline when omitted. */
  description?: string;
  /**
   * The wide photo under the breadcrumb; it opens the lightbox as the first of the page's photos. `poster` shows a
   * square poster whole on a tint instead of filling the box.
   */
  hero?: {
    src: string;
    alt: string;
    /** 480 px square, for the lightbox's thumbnails. */
    small: string;
    poster?: boolean;
    /** Where the wide box crops the photo: the vertical focal point in % (50, the centre, when omitted). */
    focusY?: number;
  };
  /** The heading of `about`: "O nás" when omitted ("Pro rodiče" for Katecheze). */
  aboutTitle?: string;
  /** "O nás": paragraphs of plain text. */
  about?: string[];
  /** "Kdy": one or more lines ("Zpíváme" – "první neděli v měsíci v 9:30 při dětské mši"). */
  when?: { label: string; text: string }[];
  /** "Kde" */
  where?: { name: string; address?: string };
  /** "Kontakt": one or more people; the buttons call and e-mail the first one with a phone or e-mail. */
  contacts?: ContactPerson[];
  /**
   * "Příští setkání": the next entry of the parish calendars whose title contains `calendarTitle` (case and
   * diacritics ignored); hidden when there is none.
   */
  nextMeeting?: { calendarTitle: string };
  /** "Jak to probíhá": numbered steps. */
  steps?: { title: string; text: string }[];
  /** Uploaded photos (`small` 480 px square, `large` up to 1600 px). */
  photos?: AlbumPhoto[];
  videos?: GroupVideo[];
  /** The group's YouTube channel. */
  channel?: { label: string; href: string };
  /**
   * "Ke stažení": shared folders, songbooks. Items with a `note` are cards with a music icon (the choir's voices).
   * `restricted` is the magenta lock pill next to the heading ("Jen pro vnitřní potřebu sboru").
   */
  downloads?: {
    title: string;
    intro?: string;
    restricted?: string;
    items: { label: string; href: string; note?: string }[];
  };
  /** A highlighted link to a related page (Katecheze → Mimořádné katecheze). */
  linkCard?: { title: string; text: string; href: string };
};
