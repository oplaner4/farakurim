import { BUILD_TIME } from "@/lib/build-time";
import { parseViraQuote, VIRA_QUOTE_URL } from "@/lib/bible-quote";
import { pragueDate } from "@/lib/prague";
import type { BibleQuote } from "./types";

// "Slovo na dnešek" (design/DESIGN.md §20.5), read at build time; the browser asks `/biblicky-citat.php` for a
// newer day's verse.

/** Shown when vira.cz cannot be reached at build time (the mockups' sample); the browser replaces it. */
export const FALLBACK_QUOTE: BibleQuote = {
  date: "",
  text: "Toto je den, který učinil Hospodin, jásejme a radujme se z něho!",
  reference: "Žalm 118,24",
};

let quote: Promise<BibleQuote> | undefined;

/** The build day's verse, fetched once per build process. vira.cz being down never fails the build. */
export function loadBibleQuote(): Promise<BibleQuote> {
  quote ??= fetch(VIRA_QUOTE_URL, { signal: AbortSignal.timeout(10_000) })
    .then((response) => (response.ok ? response.text() : ""))
    .then((html) => parseViraQuote(html, pragueDate(BUILD_TIME)) ?? FALLBACK_QUOTE)
    .catch(() => FALLBACK_QUOTE);
  return quote;
}
