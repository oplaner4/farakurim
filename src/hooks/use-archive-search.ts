"use client";

import type { SetValues } from "nuqs";
import { type ChangeEvent, type SubmitEvent, useRef } from "react";
import { useDebounce } from "use-debounce";
import type { archiveParams } from "@/lib/news/query-params";

const SEARCH_DELAY_MS = 250;

/**
 * The archive's search field, bound to `?q=` (`query` and `setParams` from nuqs; none in the prerendered list).
 * The field and the URL follow every keystroke; the list (`search`) only after a short pause, so its count isn't
 * announced on every letter. Enter and "Zrušit hledání" apply at once; typing also resets the page.
 */
export function useArchiveSearch(query: string, setParams?: SetValues<typeof archiveParams>) {
  const [debounced, { flush }] = useDebounce(query, SEARCH_DELAY_MS);
  const inputRef = useRef<HTMLInputElement>(null);

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    void setParams?.({ query: e.target.value || null, page: null });
  }

  function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    if (!setParams) return;
    e.preventDefault();
    flush();
  }

  function clear() {
    void setParams?.({ query: null, page: null });
    inputRef.current?.focus();
  }

  return { value: query, search: query === "" ? "" : debounced, inputRef, onChange, onSubmit, clear };
}
