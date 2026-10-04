"use client";

import type { MouseEvent } from "react";
import { PAGE_PARAM, updateQueryParams } from "@/lib/shared/query-params";
import { useFocusAfterChange } from "./use-focus-after-change";

/**
 * Click handler of a "Načíst další" link (`href="?strana=N"`): instead of navigating, it pushes the next page
 * and focuses the first new item (`firstNewId`). Modified clicks still open the link in a new tab or window.
 */
export function useLoadMore(page: number): (e: MouseEvent<HTMLAnchorElement>, firstNewId: string) => void {
  const focusAfterPaging = useFocusAfterChange(page);
  return (e, firstNewId) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    focusAfterPaging(firstNewId);
    updateQueryParams({ [PAGE_PARAM]: String(page + 1) });
  };
}
