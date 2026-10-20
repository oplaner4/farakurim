import type { ContactPerson } from "./activities";
import type { AlbumPhoto } from "./gallery";
import type { IsoDate } from "./shared";

// Tábor (camp.ts, design/DESIGN.md §29): O táboru, Vedoucí, Kontakt and Ročníky.

/** The next camp's panel on O táboru (§29.2): "Tábor 2027 – připravujeme" until its page exists. */
export type NextCamp = {
  year: number;
  /** Set once the dates are known; until then the panel says "upřesníme". */
  start?: IsoDate;
  end?: IsoDate;
  /** "zveřejníme zde a v aktualitách" until the applications open. */
  applications: string;
  /** The year's own page, once it exists: the panel's main button becomes "Více o táboru <year>". */
  href?: string;
};

/** "Co pro nás tábor znamená": a participant's own words (§29.2, 6). */
export type CampQuote = { name: string; text: string };

/** A team member's badge; the role also puts the card in its group (§29.3). */
export type CampRole = "Hlavní vedoucí" | "Zdravotnice" | "Zdravotník" | "Vedoucí" | "Praktikant" | "Praktikantka";

/**
 * One member of the team (§29.3). Many are minors: first name only, the age and photo optional, a photo published
 * only with consent (the parents' for under-18s). The photo is 4:5, uploaded to tabor/vedouci/.
 */
export type CampTeamMember = {
  /** First name only: "Honza", "Kuba D." */
  name: string;
  age?: number;
  role: CampRole;
  /** One or two sentences. */
  bio: string;
  photo?: AlbumPhoto;
};

/** The team of one year, in page order (the order within each group). */
export type CampTeam = { year: number; members: CampTeamMember[] };

/** A past camp on Ročníky (§29.5). */
export type CampYear = {
  year: number;
  /** The camp game's theme ("Piráti z Ostrova"), when known. */
  theme?: string;
  start: IsoDate;
  end: IsoDate;
  /** "fara v Ostrově u Macochy" */
  place: string;
  /** The year's album on Zonerama, once published. */
  album?: string;
  /** A landscape photo of the year, uploaded to tabor/rocniky/<year>.webp, shown on the year's tint. */
  cover?: string;
};

/** Kontakt (§29.4): the only people to ask, and the note about reaching them during the camp. */
export type CampContacts = {
  people: ContactPerson[];
  duringCamp: string;
};
