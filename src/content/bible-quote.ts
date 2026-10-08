import type { BibleQuote } from "@/content/types/layout";

// "Slovo na dnešek" (design/DESIGN.md §20.5): the verse shown when the day's one cannot be read
// (`server/bible-quote.ts`).

/** Shown when vira.cz cannot be reached at build time (the mockups' sample); the browser replaces it. */
export const FALLBACK_QUOTE: BibleQuote = {
  date: "",
  text: "Toto je den, který učinil Hospodin, jásejme a radujme se z něho!",
  reference: "Žalm 118,24",
};
