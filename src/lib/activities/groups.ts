import type { GroupLink, GroupPage } from "@/content/types/activities";
import type { AlbumPhoto } from "@/content/types/gallery";

// The group pages (design/DESIGN.md §27).

/** "2:22": a video length in seconds as minutes and seconds. */
export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The player, loaded only after a click: no cookies, starts at once. */
export const youtubeEmbedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;

/** The video on YouTube: the link without JS. */
export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** Hash of the N-th photo (1-based) open in the lightbox: "#foto-3". A group page has one set of photos. */
export const groupPhotoHash = (n: number) => `#foto-${n}`;

/** The photo (0-based) a hash opens, or `null` when it is not one of the `count` photos. */
export function groupPhotoFromHash(hash: string, count: number): number | null {
  const match = /^#foto-(\d+)$/.exec(hash);
  const n = match ? Number(match[1]) : 0;
  return n >= 1 && n <= count ? n - 1 : null;
}

/** Every photo the page's lightbox shows: the hero first, then the "Fotografie" grid's photos. */
export function groupPhotoSet(group: Pick<GroupPage, "hero" | "photos">): AlbumPhoto[] {
  const hero = group.hero ? [{ small: group.hero.small, large: group.hero.src }] : [];
  return [...hero, ...(group.photos ?? [])];
}

/** "Další skupiny": up to `size` other groups, starting after the current one so each page shows a different mix. */
export function otherGroups<T extends Pick<GroupLink, "id">>(groups: T[], currentId: string, size = 3): T[] {
  const at = groups.findIndex((g) => g.id === currentId);
  const rotated = [...groups.slice(at + 1), ...groups.slice(0, Math.max(at, 0))];
  return rotated.filter((g) => g.id !== currentId).slice(0, size);
}
