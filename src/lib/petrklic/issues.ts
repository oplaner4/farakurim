import { links } from "@/content/site";
import type { PetrklicIssue, PetrklicRecord } from "@/content/types/petrklic";
import { slug } from "@/lib/shared/slug";

// Petrklíč issues (design/DESIGN.md §17–18).

/** The first volume (ročník I) came out in 2006. */
export const FIRST_YEAR = 2006;

const ROMAN: [number, string][] = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

export function toRoman(n: number): string {
  let rest = n;
  let out = "";
  for (const [value, digits] of ROMAN) {
    for (; rest >= value; rest -= value) out += digits;
  }
  return out;
}

/** "XXI" for 2026. */
export const volumeOf = (year: number) => toRoman(year - FIRST_YEAR + 1);

/** "1/2026", "1/2012 (2. část)". */
export const issueLabel = (issue: Pick<PetrklicIssue, "year" | "number" | "note">) =>
  `${issue.number}/${issue.year}${issue.note ? ` (${issue.note})` : ""}`;

/** "2026-2", or "2012-4-mimoradne" with a note: names the issue's upload folder and PDF. */
export const issueId = ({ year, number, note }: Pick<PetrklicRecord, "year" | "number" | "note">) =>
  `${year}-${number}${note ? `-${slug(note)}` : ""}`;

const issueDir = (id: string) => `/uploads/petrklic/${id}`;

/** The full issue of a stored record: its id and the URLs of its PDF and cover. */
export function toIssue(record: PetrklicRecord): PetrklicIssue {
  const id = issueId(record);
  return { id, ...record, pdfUrl: `${issueDir(id)}/petrklic-${id}.pdf`, cover: `${issueDir(id)}/cover.webp` };
}

/** The viewer's page images (only the current issue has them). */
export const pageImages = (issue: Pick<PetrklicIssue, "id" | "pageCount">) =>
  Array.from({ length: issue.pageCount }, (_, i) => `${issueDir(issue.id)}/pages/${i + 1}.webp`);

/** `a` is newer than `b`: a later year, or a higher number in the same year. */
export const isNewerIssue = (a: Pick<PetrklicRecord, "year" | "number">, b: Pick<PetrklicRecord, "year" | "number">) =>
  a.year > b.year || (a.year === b.year && a.number > b.number);

export type PetrklicYear = { year: number; volume: string; issues: PetrklicIssue[] };

/** Issues grouped by year, in the given order (newest first). */
export function groupByYear(issues: PetrklicIssue[]): PetrklicYear[] {
  const years: PetrklicYear[] = [];
  for (const issue of issues) {
    const last = years.at(-1);
    if (last?.year === issue.year) last.issues.push(issue);
    else years.push({ year: issue.year, volume: volumeOf(issue.year), issues: [issue] });
  }
  return years;
}

/** Years shown at first on the "Vše" archive page, and added by each "Načíst starší ročníky". */
export const ARCHIVE_YEARS_STEP = 5;

export type ViewerSpread = {
  /** Page numbers shown side by side: the cover alone, then pairs (2–3, 4–5, …). */
  pages: number[];
  /** "Strana 1 / 16", "Strany 2–3 / 16". */
  label: string;
};

/**
 * The pages the viewer shows for `page` (§17.1): one page, or on desktop a two-page spread after the cover.
 * In spread mode an odd page belongs to the spread starting one page before.
 */
export function viewerSpread(page: number, total: number, spread: boolean): ViewerSpread {
  const first = spread && page > 1 && page % 2 === 1 ? page - 1 : page;
  if (spread && first > 1 && first < total) {
    return { pages: [first, first + 1], label: `Strany ${first}–${first + 1} / ${total}` };
  }
  return { pages: [first], label: `Strana ${first} / ${total}` };
}

/** The first page after moving one step (`direction` ±1) from `page`. */
export function stepPage(page: number, direction: 1 | -1, total: number, spread: boolean): number {
  const [first] = viewerSpread(page, total, spread).pages;
  const next = spread
    ? first === 1 && direction > 0
      ? 2
      : first === 2 && direction < 0
        ? 1
        : first + 2 * direction
    : first + direction;
  return Math.max(1, Math.min(total, next));
}

/** "/petrklic/archiv/" for all years, "/petrklic/archiv/2025/" for one. */
export const archiveYearHref = (year?: number) => (year ? `${links.petrklicArchive}${year}/` : links.petrklicArchive);
