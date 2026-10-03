"use client";

import { useEffect, useRef } from "react";

// Query parameters (`?strana=2`, `?q=pout`) are read with Next's `useSearchParams`. The pages are prerendered,
// so each list reads them inside a <Suspense> whose fallback is the same list with the defaults: the static
// HTML stays complete, and after hydration the list switches to the real URL.

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

/**
 * Focuses an element once `value` has changed and rendered. Next applies a pushed URL in a transition, so
 * "Načíst další" can't focus the first new card right after the click: it calls the returned function with
 * the card's id, and the focus happens after the next render with the new page.
 */
export function useFocusAfterChange(value: unknown): (id: string) => void {
  const pending = useRef<string | null>(null);
  useEffect(() => {
    if (pending.current === null) return;
    document.getElementById(pending.current)?.focus();
    pending.current = null;
  }, [value]);
  return (id) => {
    pending.current = id;
  };
}
