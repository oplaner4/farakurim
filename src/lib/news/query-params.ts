import { createParser, createSerializer, parseAsString, type UrlKeys } from "nuqs";

// Query parameters (`?strana=2`, `?q=pout`) are read and written with nuqs (`useQueryState(s)`), which updates the
// URL through the History API without a navigation. The pages are prerendered, so each list reads them inside a
// <Suspense> whose fallback is the same list with the defaults: the static HTML stays complete, and after
// hydration the list switches to the real URL.

/** `?strana=2`: the "Načíst další" page of a list. */
export const PAGE_PARAM = "strana";
/** `?q=pout`: the archive search. */
export const QUERY_PARAM = "q";

/** "?strana=3" → 3; anything invalid → 1. */
export function parsePage(value: string | null): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 1 ? n : 1;
}

/** `?strana=`: page 1 (the default) leaves the URL. */
export const pageParser = createParser({ parse: parsePage, serialize: String }).withDefault(1);

/** `?q=` and `?strana=` of the news archive. */
export const archiveParams = { query: parseAsString.withDefault(""), page: pageParser };
export const archiveUrlKeys: UrlKeys<typeof archiveParams> = { query: QUERY_PARAM, page: PAGE_PARAM };

/** `{ query: "pout", page: 2 }` → `"?q=pout&strana=2"`, for the "Načíst další" links. */
export const archiveHref = createSerializer(archiveParams, { urlKeys: archiveUrlKeys });
