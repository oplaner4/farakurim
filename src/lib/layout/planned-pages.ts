import type { PlannedPage } from "@/content/types/planned";

// Placeholder pages ("Stránku připravujeme") at the old site's URLs, built by the `[...stranka]` route.

/** "/farni_tabor/2024/" → ["farni_tabor", "2024"] */
export const pathSegments = (path: string) => path.split("/").filter(Boolean);

/** The page at `segments` (the route's params joined), if any. */
export const findPlannedPage = (pages: PlannedPage[], segments: string[]) =>
  pages.find((page) => pathSegments(page.path).join("/") === segments.join("/"));
