// Petrklíč (petrklic.json): the parish newsletter.

/** One issue of the Petrklíč newsletter (design/DESIGN.md §18.2). The volume (ročník) is computed from `year`. */
export type PetrklicIssue = {
  id: string;
  year: number;
  /** Issue number within the year: "1" in "1/2026". */
  number: number;
  /** Extra label for special issues: "1. část", "mimořádné". */
  note?: string;
  /** Revision of a released issue's corrected PDF, from 2: a new upload folder, as the server's files stay. */
  rev?: number;
  pdfUrl: string;
  /** Image of PDF page 1 (about 600 px wide, WebP); a tinted placeholder without it. */
  cover?: string;
  pageCount: number;
  /** Images of all pages, for the page viewer (§17.1); only the current issue needs them. */
  pageImages?: string[];
};

/**
 * One issue as stored in src/content/petrklic.json: what cannot be computed. The id, the file URLs and the viewer
 * pages are computed (toIssue() in src/lib/petrklic/issues.ts).
 */
export type PetrklicRecord = Pick<PetrklicIssue, "year" | "number" | "note" | "rev" | "pageCount">;

/** src/content/petrklic.json: the issues, newest first; the first is the current issue. */
export type PetrklicFile = {
  issues: PetrklicRecord[];
};
