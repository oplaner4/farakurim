import { decodeHTML } from "entities";
import * as z from "zod";
import type { BibleQuote } from "@/content/types/layout";
import type { IsoDate } from "@/content/types/shared";

// "Slovo na dnešek" (design/DESIGN.md §20.5): the vira.cz widget, read at build time and, in the browser,
// through `public/biblicky-citat.php` (vira.cz sends no CORS headers).

/** The vira.cz widget: HTML with the day's verse. */
export const VIRA_QUOTE_URL = "https://www.vira.cz/biblicky-citat.php";

/** Our PHP proxy on the web host: the day's verse as JSON (`BibleQuote`), cached until midnight. */
export const QUOTE_ENDPOINT = "/biblicky-citat.php";

/** Text of the widget's element `id`, without tags, entities decoded, whitespace collapsed. */
function widgetField(html: string, id: string): string {
  const match = new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)</span>`).exec(html);
  return match
    ? decodeHTML(match[1].replace(/<[^>]*>/g, ""))
        .replace(/\s+/g, " ")
        .trim()
    : "";
}

/** The verse in the widget HTML, the reference without brackets ("(Fp 4,7)" → "Fp 4,7"); none if it is missing. */
export function parseViraQuote(html: string, date: IsoDate): BibleQuote | undefined {
  const text = widgetField(html, "biblicky-citat-text");
  const reference = widgetField(html, "biblicky-citat-citace")
    .replace(/^\((.*)\)$/, "$1")
    .trim();
  return text && reference ? { date, text, reference } : undefined;
}

/** What the proxy answers: the `BibleQuote` of a day. */
const quoteJson = z.object({ date: z.iso.date(), text: z.string().min(1), reference: z.string().min(1) });

/** The proxy's JSON as a quote; none for anything else (an error page, the PHP source on a dev server). */
export function parseQuoteJson(value: unknown): BibleQuote | undefined {
  const quote = quoteJson.safeParse(value);
  return quote.success ? quote.data : undefined;
}
