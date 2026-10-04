"use client";

import type { BibleQuote } from "@/content/types/layout";
import { links } from "@/content/site";
import { NEW_TAB } from "@/lib/shared/links";
import { BookIcon, ExternalLinkIcon } from "@/components/ui/icons";
import { useTodaysQuote } from "@/hooks/use-todays-quote";

/**
 * "Slovo na dnešek" (design/DESIGN.md §20.5) at the top of the footer: the day's verse from vira.cz. The
 * "Zdroj: www.vira.cz" link is vira.cz's condition of use and must stay visible.
 */
export function BibleQuoteCard({ quote: initial }: { quote: BibleQuote }) {
  const quote = useTodaysQuote(initial);
  return (
    <figure
      aria-labelledby="slovo-na-dnesek"
      className="relative flex flex-col gap-3 overflow-hidden rounded-24 bg-raised px-5 pt-6 pb-5 md:px-8 md:pt-7 md:pb-6 lg:px-12 lg:pt-8 lg:pb-7"
    >
      <span aria-hidden="true" className="absolute top-0 right-0 size-12 bg-green shard-tr" />
      <span
        id="slovo-na-dnesek"
        className="relative flex items-center gap-2 text-13 font-bold tracking-caps text-green-ink uppercase"
      >
        <BookIcon size={18} />
        Slovo na dnešek
      </span>
      <blockquote className="relative max-w-205 text-19 leading-verse font-light text-ink md:text-22 lg:text-26">
        {quote.text}
      </blockquote>
      <figcaption className="relative flex flex-wrap items-center justify-between gap-x-5 gap-y-1">
        <cite className="font-bold text-green-ink not-italic">{quote.reference}</cite>
        <a href={links.viraCz} {...NEW_TAB} className="flex min-h-11 items-center gap-1.5 text-15 font-bold">
          Zdroj: www.vira.cz
          <ExternalLinkIcon size={16} />
        </a>
      </figcaption>
    </figure>
  );
}
