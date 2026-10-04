import type { IsoDate } from "./shared";

// Shared page layout (bible-quote.ts): the footer's "Slovo na dnešek".

/** "Slovo na dnešek" (design/DESIGN.md §20.5): the day's verse from the vira.cz widget. */
export type BibleQuote = {
  /** The day it belongs to; empty for the fallback verse. */
  date: IsoDate | "";
  text: string;
  /** "Fp 4,7" */
  reference: string;
};
