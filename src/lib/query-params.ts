// Query parameters (`?strana=2`, `?q=pout`) are read with Next's `useSearchParams`. The pages are prerendered,
// so each list reads them inside a <Suspense> whose fallback is the same list with the defaults: the static
// HTML stays complete, and after hydration the list switches to the real URL.

/** `?strana=2`: the "Načíst další" page of a list. */
export const PAGE_PARAM = "strana";
/** `?q=pout`: the archive search. */
export const QUERY_PARAM = "q";

/**
 * Sets parameters (`null` removes one) through the History API, which Next.js syncs with `useSearchParams`.
 * `replace` updates the current entry instead of adding one (e.g. while typing a search).
 */
export function updateQueryParams(params: Record<string, string | null>, { replace = false } = {}) {
  const url = new URL(window.location.href);
  for (const [name, value] of Object.entries(params)) {
    if (value === null) url.searchParams.delete(name);
    else url.searchParams.set(name, value);
  }
  if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}
