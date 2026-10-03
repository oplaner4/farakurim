"use client";

import { useSyncExternalStore } from "react";

// Query parameters of a statically exported page are unknown at build time. The prerendered HTML is built
// without them (server snapshot `null`); after hydration React switches to the real URL. Next's
// `useSearchParams` would instead turn the whole tree up to the nearest <Suspense> into client-only rendering.

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

export function useQueryParam(name: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  );
}

/** Adds a history entry with the parameter set (Next's router picks up `pushState`). */
export function pushQueryParam(name: string, value: string) {
  const url = new URL(window.location.href);
  url.searchParams.set(name, value);
  window.history.pushState(null, "", url);
  listeners.forEach((l) => l());
}

/** Sets (or, with `null`, removes) parameters without a new history entry, e.g. while typing a search. */
export function replaceQueryParams(params: Record<string, string | null>) {
  const url = new URL(window.location.href);
  for (const [name, value] of Object.entries(params)) {
    if (value === null) url.searchParams.delete(name);
    else url.searchParams.set(name, value);
  }
  window.history.replaceState(null, "", url);
  listeners.forEach((l) => l());
}
