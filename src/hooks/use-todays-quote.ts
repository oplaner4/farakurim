"use client";

import { useQuery } from "@tanstack/react-query";
import type { BibleQuote } from "@/content/types/layout";
import { parseQuoteJson, QUOTE_ENDPOINT } from "@/lib/layout/bible-quote";
import { pragueDate } from "@/lib/shared/prague";

/** The proxy's verse; `null` when the build's verse is already today's or the proxy has none. */
async function readTodaysQuote(buildDate: string): Promise<BibleQuote | null> {
  if (buildDate === pragueDate(Date.now())) return null;
  const response = await fetch(QUOTE_ENDPOINT);
  return (response.ok && parseQuoteJson(await response.json().catch(() => undefined))) || null;
}

/**
 * The verse of the visitor's day: `initial` (the build day's) until `/biblicky-citat.php` answers with a newer
 * one. Without the proxy (`pnpm dev`, `pnpm preview`) or when it fails, `initial` stays.
 */
export function useTodaysQuote(initial: BibleQuote): BibleQuote {
  const { data } = useQuery({
    queryKey: ["bible-quote", initial.date],
    queryFn: () => readTodaysQuote(initial.date),
  });
  return data && data.date > initial.date ? data : initial;
}
