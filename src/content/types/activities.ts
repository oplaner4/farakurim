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
  /** "1.–2.", "6.–9. (1. skupina)" */
  grade: string;
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

// The group pages (groups.ts, design/DESIGN.md §27): Schola and, later, Chrámový sbor, Společenství mládeže, …

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
  /** The wide photo under the breadcrumb; it opens the lightbox as the first of the page's photos. */
  hero?: { src: string; alt: string; /** 480 px square, for the lightbox's thumbnails. */ small: string };
  /** "O nás": paragraphs of plain text. */
  about?: string[];
  /** "Kdy": one or more lines ("Zpíváme" – "první neděli v měsíci v 9:30 při dětské mši"). */
  when?: { label: string; text: string }[];
  /** "Kde" */
  where?: { name: string; address?: string };
  contact?: ContactPerson;
  /** Uploaded photos (`small` 480 px square, `large` up to 1600 px). */
  photos?: AlbumPhoto[];
  videos?: GroupVideo[];
  /** The group's YouTube channel. */
  channel?: { label: string; href: string };
  /** "Ke stažení": shared folders, songbooks; `membersOnly` marks it "jen pro členy". */
  downloads?: { title: string; items: { label: string; href: string; membersOnly?: boolean }[] };
};
