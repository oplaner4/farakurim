// Kronika farnosti (chronicle.ts, design/DESIGN.md §26).

/** One event of the chronicle. */
export type ChronicleEntry = {
  /** "1226", or a span "1766–1772" (en dash). */
  year: string;
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
