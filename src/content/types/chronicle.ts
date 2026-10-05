// Kronika farnosti (chronicle.ts, design/DESIGN.md §26).

/** One event of the chronicle. */
export type ChronicleEntry = {
  /** The year, or the first year of a span ("1766–1772" is `year: 1766, until: 1772`). */
  year: number;
  until?: number;
  text: string;
  /** The big milestones: a larger year and dot, the text in a tinted bubble. */
  milestone?: boolean;
  /** A source to read more ("Více na vscr.cz"). */
  link?: { label: string; href: string };
};

/** A period of the chronicle with its filter pill ("13.–18. století"). */
export type ChronicleEra = {
  id: string;
  title: string;
  entries: ChronicleEntry[];
};
