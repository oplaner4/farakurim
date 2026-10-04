import { links } from "@/content/site";
import type { NewsEvent } from "@/content/types/news";
import type { IsoDate } from "@/content/types/shared";
import { fold, plural } from "@/lib/shared/czech";
import { eventEnd } from "./events";

// Archiv aktualit (design/DESIGN.md §12): finished events by year, searched and paged in the browser.

/** Rows per "page" of the archive; "Načíst další" shows the next batch. */
export const ARCHIVE_PAGE_SIZE = 10;

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
 * The year buttons "2026 · 2025 · … · 2019", each a static page (`/aktuality/archiv/<slug>/`, empty slug for
 * the newest, the default). The default also takes events of a newer year, which a visitor may see archived
 * before the next build adds its button.
 */
export function archiveYears(years: number[]) {
  return years.map((year, i) => ({
    slug: i === 0 ? "" : String(year),
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

/** "/aktuality/archiv/", "/aktuality/archiv/2025/" */
export type ArchiveListing<T> = {
  /** Year buttons with the number of their events. */
  years: (ArchiveYear & { count: number })[];
  /** The page's year (ignored while searching). */
  year: ArchiveYear & { count: number };
  /** The year before, offered as "Rok 2025" once the page's year is fully shown; none while searching. */
  previous?: ArchiveYear;
  matching: T[];
  /** Matching events by month; rows (and whole months) after the shown pages are marked `more`. */
  groups: { month: IsoDate; more: boolean; events: { item: T; more: boolean }[] }[];
  /** How many rows the shown pages hold. */
  shownCount: number;
  /** "Zobrazeno 10 z 21 akcí", "Zobrazeno 21 akcí", "Nalezeno 3 akce" */
  countLabel: string;
};

/**
 * What the archive shows (§12): the year's finished events, or the search results across all years, the first
 * `page` pages of them visible.
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
  const years = archiveYears(yearList).map((y) => ({ ...y, count: archived.filter(y.matches).length }));
  const index = Math.max(
    0,
    years.findIndex((y) => y.slug === yearSlug),
  );
  const year = years[index];
  const matching = query ? searchEvents(archived, query) : archived.filter(year.matches);
  const shownCount = Math.min(matching.length, page * ARCHIVE_PAGE_SIZE);
  let row = 0;
  const groups = groupByMonth(matching).map(({ month, events }) => ({
    month,
    more: row >= shownCount,
    events: events.map((item) => ({ item, more: row++ >= shownCount })),
  }));
  const events = (n: number) => `${n} ${plural(n, ["akce", "akce", "akcí"])}`;
  const total = matching.length;
  const shown = shownCount < total ? `${shownCount} z ${events(total)}` : events(total);
  const countLabel = `${query ? "Nalezeno" : "Zobrazeno"} ${shown}`;
  const previous = query ? undefined : years[index + 1];
  return { years, year, previous, matching, groups, shownCount, countLabel };
}

export const archiveYearHref = (slug: string) => (slug ? `${links.newsArchive}${slug}/` : links.newsArchive);
