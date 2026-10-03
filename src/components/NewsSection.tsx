"use client";

import { clsx } from "clsx";
import type { NewsItem } from "@/content/types";
import { links } from "@/content/site";
import { formatEventDate } from "@/lib/czech";
import { currentNews, isOngoing } from "@/lib/news";
import { pragueDate } from "@/lib/prague";
import { useNow } from "@/lib/use-now";
import { CalendarIcon } from "./icons";
import { SectionHeading } from "./SectionHeading";

/** Mobile shows the first 3 (the 4th is hidden); tablet and desktop show 4. */
const LIMIT = 4;
const POSTER_TINTS = [
  "bg-magenta-tint-alt text-magenta-ink",
  "bg-orange-tint-alt text-orange-ink-deep",
  "bg-blue-tint-alt text-blue-ink",
  "bg-green-tint text-green-ink",
];

type Props = {
  items: NewsItem[];
  renderedAt: number;
};

export function NewsSection({ items, renderedAt }: Props) {
  const today = pragueDate(useNow(renderedAt));
  const visible = currentNews(items, today, LIMIT);

  if (visible.length === 0) return null;

  return (
    <section
      aria-labelledby="aktuality"
      className="flex flex-col gap-4 pt-12 pb-2 md:gap-5 md:pt-14 lg:gap-6 lg:pt-20 lg:pb-0"
    >
      <SectionHeading
        id="aktuality"
        title="Aktuality"
        color="magenta"
        link={{ href: links.news, label: "Všechny aktuality", shortLabel: "Všechny" }}
      />
      <ul className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-[repeat(auto-fit,minmax(min(250px,100%),1fr))] lg:gap-5">
        {visible.map((item, i) => {
          const date = formatEventDate(item.start, item.end);
          const chip = item.time ? `${date.label} · ${item.time}` : date.label;
          const ongoing = isOngoing(item, today);
          return (
            <li key={item.id} className="nth-[n+4]:hidden md:nth-[n+4]:block">
              {/* Mobile/tablet: horizontal card with a date block. Desktop: vertical card with a poster. */}
              <a
                href={item.href}
                className={clsx(
                  "group flex h-full gap-3.5 rounded-18 p-3.5 text-ink no-underline hover:text-ink md:gap-4 md:rounded-20 md:p-4",
                  "lg:flex-col lg:gap-3 lg:rounded-none lg:bg-transparent lg:p-0",
                  ongoing ? "bg-magenta-tint" : "bg-surface",
                )}
              >
                <span className="sr-only">{chip}: </span>
                <span
                  aria-hidden="true"
                  className={clsx(
                    "flex h-18 flex-[0_0_64px] flex-col items-center justify-center rounded-12 px-0.5 text-center leading-[1.1] md:h-20 md:basis-18 md:rounded-14 lg:hidden",
                    ongoing ? "bg-magenta text-white" : "bg-white text-magenta-ink",
                  )}
                >
                  <span className={clsx("font-bold", date.isRange ? "text-17 md:text-19" : "text-22 md:text-24")}>
                    {date.days}
                  </span>
                  <span className="text-12 md:text-13">{date.months}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={clsx(
                    "relative hidden h-52.5 items-center justify-center overflow-hidden rounded-24 lg:flex",
                    POSTER_TINTS[i % POSTER_TINTS.length],
                  )}
                >
                  {item.image ? (
                    <img src={item.image.src} alt="" className="size-full object-cover" loading="lazy" />
                  ) : (
                    <>
                      <span className="absolute right-0 bottom-0 h-16 w-24 bg-current opacity-18 shard-br" />
                      <CalendarIcon size={44} />
                    </>
                  )}
                  <span
                    className={clsx(
                      "absolute top-3.5 left-3.5 rounded-12 px-3 py-1.5 text-14 font-bold",
                      ongoing ? "bg-magenta text-white" : "bg-white text-magenta-ink",
                    )}
                  >
                    {chip}
                  </span>
                </span>
                <span className="flex min-w-0 flex-col items-start gap-1 lg:gap-3">
                  {ongoing && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-12 font-bold text-magenta-ink lg:bg-magenta-tint lg:px-2.5 lg:text-13">
                      Právě probíhá
                    </span>
                  )}
                  <h3 className="text-17 leading-[1.3] font-bold underline-offset-3 group-hover:text-magenta-ink group-hover:underline md:text-18 lg:text-20">
                    {item.title}
                  </h3>
                  <span className="text-14 text-ink-2 md:text-15 lg:text-16">{item.excerpt}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
