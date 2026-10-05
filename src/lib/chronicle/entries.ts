import type { ChronicleEntry } from "@/content/types/chronicle";

// Kronika farnosti (design/DESIGN.md §26).

type Years = Pick<ChronicleEntry, "year" | "until">;

/** "1226", or a span with an en dash: "1766–1772". */
export const formatYears = ({ year, until }: Years) => (until ? `${year}–${until}` : String(year));

/** The entries in chronological order (by the first year, then the shorter span first). */
export const byYear = <T extends Years>(entries: T[]): T[] =>
  entries.toSorted((a, b) => a.year - b.year || (a.until ?? a.year) - (b.until ?? b.year));
