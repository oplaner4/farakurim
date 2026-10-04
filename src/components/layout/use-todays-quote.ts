"use client";

import { useEffect, useState } from "react";
import type { BibleQuote } from "@/content/types";
import { parseQuoteJson, QUOTE_ENDPOINT } from "@/lib/bible-quote";
import { pragueDate } from "@/lib/prague";

/**
 * The verse of the visitor's day: `initial` (the build day's) until `/biblicky-citat.php` answers with a newer
 * one. Without the proxy (`pnpm dev`, `pnpm preview`) or when it fails, `initial` stays.
 */
export function useTodaysQuote(initial: BibleQuote): BibleQuote {
  const [quote, setQuote] = useState(initial);
  useEffect(() => {
    if (initial.date === pragueDate(Date.now())) return;
    const controller = new AbortController();
    fetch(QUOTE_ENDPOINT, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : undefined))
      .then((json) => {
        const fetched = parseQuoteJson(json);
        if (fetched && fetched.date > initial.date) setQuote(fetched);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [initial.date]);
  return quote;
}
