import "server-only";
import { FALLBACK_QUOTE } from "@/content/bible-quote";
import { BUILD_TIME } from "@/lib/shared/build-time";
import { parseViraQuote, VIRA_QUOTE_URL } from "@/lib/layout/bible-quote";
import { pragueDate } from "@/lib/shared/prague";
import type { BibleQuote } from "@/content/types/layout";

// "Slovo na dnešek" (design/DESIGN.md §20.5), read at build time; the browser asks `/biblicky-citat.php` for a
// newer day's verse.

let quote: Promise<BibleQuote> | undefined;

/** The build day's verse, fetched once per build process. vira.cz being down never fails the build. */
export function loadBibleQuote(): Promise<BibleQuote> {
  quote ??= fetch(VIRA_QUOTE_URL, { signal: AbortSignal.timeout(10_000) })
    .then((response) => (response.ok ? response.text() : ""))
    .then((html) => parseViraQuote(html, pragueDate(BUILD_TIME)) ?? FALLBACK_QUOTE)
    .catch(() => FALLBACK_QUOTE);
  return quote;
}
