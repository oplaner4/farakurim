"use client";

import type { MouseEvent } from "react";
import { useFocusAfterChange } from "./use-focus-after-change";

/**
 * Click handler of a "Načíst další" link (`href="?strana=N"`): instead of navigating, it sets the next page with
 * `setPage` (the list's `?strana=` from nuqs) and focuses the first new item (`firstNewId`). Modified clicks still
 * open the link in a new tab or window, and so does a click before the list reads the URL (no `setPage`).
 */
export function useLoadMore(
  page: number,
  setPage?: (page: number) => unknown,
): (e: MouseEvent<HTMLAnchorElement>, firstNewId: string) => void {
  const focusAfterPaging = useFocusAfterChange(page);
  return (e, firstNewId) => {
    if (!setPage || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    focusAfterPaging(firstNewId);
    void setPage(page + 1);
  };
}
