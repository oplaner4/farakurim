"use client";

import { useCallback } from "react";

/**
 * A ref for an `<img>` that fades in when it has loaded instead of popping in (design/DESIGN.md §5). An image none of
 * which has arrived yet gets `data-loading` until its `load` (or `error`), which the image's classes turn into
 * `opacity-0`. Images already loaded, cached or partly drawn (a slow connection at hydration) are left alone, so
 * nothing visible ever disappears; without JavaScript nothing changes either.
 */
export function useFadeInOnLoad() {
  return useCallback((img: HTMLImageElement | null) => {
    if (!img || img.complete || img.naturalWidth > 0) return;
    img.dataset.loading = "";
    const done = () => delete img.dataset.loading;
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
    return () => {
      img.removeEventListener("load", done);
      img.removeEventListener("error", done);
    };
  }, []);
}
