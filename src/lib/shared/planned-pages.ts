import type { PlannedPage } from "@/content/types/planned";

// Placeholder pages ("Stránku připravujeme") at the old site's URLs, built by catch-all routes.

/** "/farni_tabor/2024/" → ["farni_tabor", "2024"] */
export const pathSegments = (path: string) => path.split("/").filter(Boolean);

/** The page at `segments` (the route's params joined), if any. */
export const findPlannedPage = (pages: PlannedPage[], segments: string[]) =>
  pages.find((page) => pathSegments(page.path).join("/") === segments.join("/"));

/**
 * The pages a route under `prefix` builds, as the segments after it: `prefix` ["aktivity"] with `depth` 1 gives the
 * one-segment pages (`[skupina]`), without `depth` every deeper page (a catch-all).
 */
export function plannedSegments(pages: PlannedPage[], prefix: string[], depth?: number): string[][] {
  return pages
    .map((page) => pathSegments(page.path))
    .filter((segments) => prefix.every((part, i) => segments[i] === part))
    .map((segments) => segments.slice(prefix.length))
    .filter((rest) => (depth === undefined ? rest.length > 0 : rest.length === depth));
}
