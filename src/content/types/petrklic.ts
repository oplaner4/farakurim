// Petrklíč (petrklic.ts): the parish newsletter.

/** One issue of the Petrklíč newsletter (design/DESIGN.md §18.2). The volume (ročník) is computed from `year`. */
export type PetrklicIssue = {
  id: string;
  year: number;
  /** Issue number within the year: "1" in "1/2026". */
  number: number;
  /** Extra label for special issues: "1. část", "mimořádné". */
  note?: string;
  pdfUrl: string;
  /** Image of PDF page 1 (about 600 px wide, WebP); a tinted placeholder without it. */
  cover?: string;
  pageCount: number;
  /** Images of all pages, for the page viewer (§17.1); only the current issue needs them. */
  pageImages?: string[];
};
