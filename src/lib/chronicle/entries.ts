import type { ChronicleEntry } from "@/content/types/chronicle";

// Kronika farnosti (design/DESIGN.md §26).

/** The first year of an entry: "1766–1772" → 1766. */
export const startYear = (entry: Pick<ChronicleEntry, "year">) => Number.parseInt(entry.year, 10);

/** The entries in chronological order (by the first year, then the shorter span first). */
export const byYear = <T extends Pick<ChronicleEntry, "year">>(entries: T[]): T[] =>
  entries.toSorted((a, b) => startYear(a) - startYear(b) || a.year.length - b.year.length);
