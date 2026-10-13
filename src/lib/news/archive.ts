import { links } from "@/content/site";
import type { NewsEvent } from "@/content/types/news";
import type { IsoDate } from "@/content/types/shared";
import { eventCount, foundCount, fold } from "@/lib/shared/czech";
import { eventEnd } from "./timing";

// Archiv aktualit (design/DESIGN.md §12): finished events by year, searched and paged in the browser.

/** Rows per "page" of the archive; "Načíst další" shows the next batch. */
export const ARCHIVE_PAGE_SIZE = 20;

const startYear = (event: Pick<NewsEvent, "start">) => Number(event.start.slice(0, 4));

/** The fields the archive works with; the client gets only these (`ArchiveItem`). */
type Archivable = Pick<NewsEvent, "start" | "end" | "archiveHidden">;

/** Finished events (from the day after the end) not hidden by an admin, newest first. */
export function archivedEvents<T extends Archivable>(events: T[], today: IsoDate): T[] {
  return events
    .filter((e) => !e.archiveHidden && eventEnd(e) < today)
    .sort((a, b) => b.start.localeCompare(a.start) || eventEnd(b).localeCompare(eventEnd(a)));
}

/** Years with an archived event, newest first (§12.2); the current year when the archive is empty. */
export function archiveYearList(events: Archivable[], today: IsoDate): number[] {
  const years = [...new Set(archivedEvents(events, today).map(startYear))];
  return years.length > 0 ? years : [Number(today.slice(0, 4))];
}

/**
 * The year buttons "2026 · 2025 · … · 2019", each a static page (`/aktuality/archiv/<year>/`). The newest also
 * takes events of a newer year, which a visitor may see archived before the next build adds its button.
 */
export function archiveYears(years: number[]) {
  return years.map((year, i) => ({
    slug: String(year),
    label: String(year),
    matches: (e: Archivable) => (i === 0 ? startYear(e) >= year : startYear(e) === year),
  }));
}

export type ArchiveYear = ReturnType<typeof archiveYears>[number];

/** Search in the title and place, ignoring case and diacritics. */
export function searchEvents<T extends Pick<NewsEvent, "title" | "place">>(events: T[], query: string): T[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return events.filter((e) => {
    const haystack = fold(`${e.title} ${e.place ?? ""}`);
    return words.every((w) => haystack.includes(w));
  });
}

/** Consecutive events of one start month ("Srpen 2026"); keeps the order of `events`. */
export function groupByMonth<T extends Pick<NewsEvent, "start">>(events: T[]): { month: IsoDate; events: T[] }[] {
  const groups: { month: IsoDate; events: T[] }[] = [];
  for (const e of events) {
    const month = `${e.start.slice(0, 7)}-01`;
    const last = groups.at(-1);
    if (last?.month === month) last.events.push(e);
    else groups.push({ month, events: [e] });
  }
  return groups;
}

export type ArchiveListing<T> = {
  /** Year buttons with the number of their events, or of the matching ones while searching. */
  years: (ArchiveYear & { count: number })[];
  /** The number of matching events in all years ("Všechny roky"), while searching. */
  allCount: number;
  /** The page's year; none on the default page (`/aktuality/archiv/`), which lists the newest year. */
  year?: ArchiveYear;
  /** The year before the listed one, offered as "Rok 2025" once it is fully shown; none while searching. */
  previous?: ArchiveYear;
  matching: T[];
  /** Matching events by month; rows (and whole months) after the shown pages are marked `more`. */
  groups: { month: IsoDate; more: boolean; events: { item: T; more: boolean }[] }[];
  /** How many rows the shown pages hold. */
  shownCount: number;
  /** "Zobrazeno 20 z 34 akcí", "Zobrazeno 21 akcí", "Nalezeny 3 akce" */
  countLabel: string;
};

/**
 * What the archive shows (§12): the year's finished events (the newest year's on the default page), or the search
 * results in the page's year (in all years on the default page), the first `page` pages of them visible.
 */
export function archiveListing<T extends Archivable & Pick<NewsEvent, "id" | "title" | "place">>(
  items: T[],
  {
    years: yearList,
    yearSlug,
    query,
    page,
    today,
  }: { years: number[]; yearSlug: string; query: string; page: number; today: IsoDate },
): ArchiveListing<T> {
  const archived = archivedEvents(items, today);
  const found = query ? searchEvents(archived, query) : archived;
  const years = archiveYears(yearList).map((y) => ({ ...y, count: found.filter(y.matches).length }));
  const year = years.find((y) => y.slug === yearSlug);
  const listed = year ?? years[0];
  const matching = query && !year ? found : found.filter(listed.matches);
  const shownCount = Math.min(matching.length, page * ARCHIVE_PAGE_SIZE);
  let row = 0;
  const groups = groupByMonth(matching).map(({ month, events }) => ({
    month,
    more: row >= shownCount,
    events: events.map((item) => ({ item, more: row++ >= shownCount })),
  }));
  const total = matching.length;
  const countLabel = query
    ? foundCount(total, shownCount, year?.label)
    : eventCount("Zobrazen", shownCount, shownCount < total ? total : undefined);
  const previous = query ? undefined : years[years.indexOf(listed) + 1];
  return { years, allCount: query ? found.length : 0, year, previous, matching, groups, shownCount, countLabel };
}

/** "/aktuality/archiv/" (the default page, empty slug), "/aktuality/archiv/2025/" */
export const archiveYearHref = (slug: string) => (slug ? `${links.newsArchive}${slug}/` : links.newsArchive);
