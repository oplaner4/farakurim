import type { IsoDate, NewsItem } from "@/content/types";

/** Upcoming or ongoing items (end ≥ today), soonest first. ISO dates compare correctly as strings. */
export function currentNews(items: NewsItem[], today: IsoDate, limit: number): NewsItem[] {
  return items
    .filter((item) => (item.end ?? item.start) >= today)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, limit);
}

export function isOngoing(item: NewsItem, today: IsoDate): boolean {
  return item.start <= today && (item.end ?? item.start) >= today;
}
