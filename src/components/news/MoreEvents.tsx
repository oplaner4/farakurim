"use client";

import type { NewsEvent } from "@/content/types";
import { links } from "@/content/site";
import type { DateBlock } from "@/lib/czech";
import { otherEvents } from "@/lib/news";
import { useToday } from "@/hooks/use-now";
import { ArrowRightIcon, ChevronLeftIcon } from "@/components/ui/icons";

/** What a card needs; the page passes only these fields to the client. */
export type MoreEventItem = Pick<NewsEvent, "id" | "title" | "start" | "end" | "time" | "place" | "longTerm"> & {
  href: string;
  date: DateBlock;
};

const LIMIT = 3;

/**
 * "Další akce" (design/DESIGN.md §13.1): the next events after today, by the visitor's date.
 * Mobile: a list and "Všechny aktuality" below. Tablet: 2 cards. Desktop: 3 cards.
 */
export function MoreEvents({
  items,
  currentId,
  renderedAt,
}: {
  items: MoreEventItem[];
  currentId: string;
  renderedAt: number;
}) {
  const today = useToday(renderedAt);
  const list = otherEvents(items, { id: currentId }, today, LIMIT);
  if (list.length === 0) return null;

  return (
    <section
      aria-labelledby="dalsi-akce"
      className="flex flex-col gap-3 border-t border-line pt-2 md:gap-4 md:pt-8 lg:gap-5 lg:pt-10"
    >
      <div className="flex items-end justify-between gap-4 max-md:mt-4">
        <h2 id="dalsi-akce" className="text-22 leading-heading font-bold md:text-26 lg:text-32">
          Další akce
        </h2>
        <a
          href={links.news}
          className="flex min-h-11 items-center gap-1.5 font-bold text-magenta-ink hover:text-magenta-ink max-md:hidden"
        >
          Všechny aktuality
          <ArrowRightIcon size={18} />
        </a>
      </div>
      <ul className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-fit-280 lg:gap-4">
        {list.map((item) => (
          <li key={item.id} className="md:max-lg:nth-3:hidden">
            <a
              href={item.href}
              className="flex h-full items-center gap-3.5 rounded-16 bg-surface p-3 text-ink no-underline hover:bg-magenta-tint hover:text-ink md:rounded-18 md:p-3.5 lg:gap-4 lg:rounded-20 lg:p-4"
            >
              <span className="flex h-14 w-13 shrink-0 flex-col items-center justify-center rounded-12 bg-raised leading-display text-magenta-ink md:h-15.5 md:w-14 lg:h-17.5 lg:w-16 lg:rounded-14">
                <strong className="text-18 md:text-20 lg:text-22">{item.date.top}</strong>
                <span className="text-12 lg:text-13">{item.date.bottom}</span>
              </span>
              <span className="flex min-w-0 flex-col">
                <strong className="leading-card">{item.title}</strong>
                <span className="text-14 text-muted lg:text-15">
                  {[item.place, item.time].filter(Boolean).join(" · ")}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <a href={links.news} className="flex min-h-11 items-center gap-2 self-start font-bold md:hidden">
        <ChevronLeftIcon size={18} />
        Všechny aktuality
      </a>
    </section>
  );
}
