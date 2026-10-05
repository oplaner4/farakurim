"use client";

import { useEffect, useRef } from "react";

/**
 * Focuses an element once `value` has changed and rendered. "Načíst další" can't focus the first new card right
 * after the click (it isn't shown yet): it calls the returned function with the card's id, and the focus happens
 * after the next render with the new page.
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
