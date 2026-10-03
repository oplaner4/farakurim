"use client";

import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { PAGE_PARAM, QUERY_PARAM, updateQueryParams } from "@/lib/query-params";

const SEARCH_DELAY_MS = 250;

/**
 * The archive's search field. Typing updates `?q=` after a short pause (and resets the page); the input shows
 * what is typed until the search reaches the URL, and any change of the URL's query (the search itself,
 * "Zrušit hledání", back/forward) hands the input back to it.
 */
export function useArchiveSearch(rawQuery: string) {
  const [draft, setDraft] = useState<string | null>(null);
  const [seenQuery, setSeenQuery] = useState(rawQuery);
  if (rawQuery !== seenQuery) {
    setSeenQuery(rawQuery);
    setDraft(null);
  }
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  function search(value: string) {
    clearTimeout(timer.current);
    updateQueryParams({ [QUERY_PARAM]: value || null, [PAGE_PARAM]: null }, { replace: true });
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const { value } = e.target;
    setDraft(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(value), SEARCH_DELAY_MS);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    search(draft ?? rawQuery);
  }

  function clear() {
    setDraft("");
    search("");
    inputRef.current?.focus();
  }

  return { value: draft ?? rawQuery, inputRef, onChange, onSubmit, clear };
}
