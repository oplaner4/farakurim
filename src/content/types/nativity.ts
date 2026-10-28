import type { ClockTime, IsoDate } from "./shared";

// Betlémy (design/DESIGN.md §30): one record per season. The exhibition's opening days decide what the page shows
// (before, during or after the exhibition) and when the seasonal main-menu item says "Betlémy" (§4.1a).

/** One day the exhibition is open, with an optional note ("zahájení výstavy", "poslední den"). */
export type NativityOpeningDay = { date: IsoDate; from: ClockTime; to: ClockTime; note?: string };

/** A place of the exhibition ("Kde výstavu najdete"): a card in its tint with the parts of the place. */
export type NativityPlace = {
  name: string;
  /** The line under the name: the town or the street. */
  address: string;
  notes: string[];
  color: "blue" | "green";
  /** "Bezbariérový vstup" */
  accessible?: boolean;
};

/** "Vystavují také": who lent a nativity scene, where from and what it is. */
export type NativityExhibitor = { name: string; place: string; work: string };

/** The year's guest collection, the featured panel of "Co uvidíte". */
export type NativityGuestCollection = {
  /** The pill above the title: "Novinka na faře". */
  label: string;
  title: string;
  text: string;
  /** The material chips. */
  materials: string[];
  tour?: { title: string; date: IsoDate; from: ClockTime; to: ClockTime; place: string };
  exhibitors: NativityExhibitor[];
};

/** One of the three places on the podium of "Soutěž o nej betlém". */
export type NativityContestPlace = { className: string; school: string; teacher: string; votes: number };

export type NativityContest = {
  /** The entrants, after "Betlémy vyrobené": "třetími třídami". */
  entrants: string;
  /** The number tiles before the results: classes and villages taking part. */
  classes: number;
  villages: number;
  /** After the exhibition: one line on the voting, then the podium, 1st to 3rd. */
  summary?: string;
  results?: NativityContestPlace[];
};

/** "Společný kuřimský betlém": the figures visitors bring. */
export type NativitySharedScene = {
  /** The year it began. */
  since: number;
  maxHeight: string;
  from: IsoDate;
  to: IsoDate;
  where: string;
  /** "Dotazy" */
  phone: string;
};

/** "Betlémské putování Kuřimí" */
export type NativityWalk = {
  /** The number of nativity scenes on the way. */
  stops: number;
  /** After the number: "předposlední zastávkou je venkovní betlém ZŠ DiviZna". */
  note?: string;
  /** "Termín a začátek trasy"; "upřesníme" until set. */
  schedule?: string;
};

export type NativitySeason = {
  year: number;
  /** "7. ročník" */
  edition: number;
  /** In date order; the first and the last day bound the exhibition. */
  openingDays: NativityOpeningDay[];
  /** The line under the opening hours. */
  hoursNote?: string;
  places: NativityPlace[];
  /** "Orientační plánek (PDF)" */
  planUrl: string;
  /** Mapy.cz search of "Navigovat". */
  mapQuery: string;
  guest?: NativityGuestCollection;
  /** The small cards under the guest collection. */
  highlights: { title: string; text: string }[];
  contest: NativityContest;
  sharedScene: NativitySharedScene;
  walk: NativityWalk;
  /** The mass for the intentions written at the exhibition. */
  intentionsMass: { date: IsoDate; time: ClockTime };
};

/** A past year's exhibition album on Zonerama. */
export type NativityAlbum = { year: number; url: string };
