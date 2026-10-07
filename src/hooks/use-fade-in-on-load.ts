"use client";

import { useCallback } from "react";

/**
 * A ref for an `<img>` or `<iframe>` that fades in when it has loaded instead of popping in (design/DESIGN.md §5).
 * An image none of which has arrived yet, or an iframe just added, gets `data-loading` until its `load` (or `error`),
 * which the element's classes turn into `opacity-0` and a sibling skeleton into a pulse (`peer-data-loading:`).
 * Images already loaded, cached or partly drawn (a slow connection at hydration) are left alone, so nothing visible
 * ever disappears; without JavaScript nothing changes either.
 */
export function useFadeInOnLoad() {
  return useCallback((el: HTMLImageElement | HTMLIFrameElement | null) => {
    if (!el || (el instanceof HTMLImageElement && (el.complete || el.naturalWidth > 0))) return;
    el.dataset.loading = "";
    const done = () => delete el.dataset.loading;
    el.addEventListener("load", done, { once: true });
    el.addEventListener("error", done, { once: true });
    return () => {
      el.removeEventListener("load", done);
      el.removeEventListener("error", done);
    };
  }, []);
}
