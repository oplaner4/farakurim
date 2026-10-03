"use client";

import { clsx } from "clsx";
import type { NewsEvent } from "@/content/types";
import { links } from "@/content/site";
import { formatEventDate } from "@/lib/czech";
import { currentNews, eventHref, eventStatus } from "@/lib/news";
import { useToday } from "@/hooks/use-now";
import { CalendarIcon } from "@/components/ui/icons";
import { POSTER_TINTS } from "@/components/ui/PosterPlaceholder";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** Mobile shows the first 3 (the 4th is hidden); tablet and desktop show 4. */
const LIMIT = 4;

type Props = {
  events: NewsEvent[];
  renderedAt: number;
};

export function NewsSection({ events, renderedAt }: Props) {
  const today = useToday(renderedAt);
  const visible = currentNews(events, today, LIMIT);

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
      <ul className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 lg:grid-fit-250 lg:gap-5">
        {visible.map((item, i) => {
          // A series of meetings is listed by its first date.
          const date = formatEventDate(item.start, item.sessions ? undefined : item.end);
          const chip = item.time ? `${date.label} · ${item.time}` : date.label;
          const ongoing = eventStatus(item, today) === "now";
          return (
            <li key={item.id} className="nth-[n+4]:hidden md:nth-[n+4]:block">
              {/* Mobile/tablet: horizontal card with a date block. Desktop: vertical card with a poster. */}
              <a
                href={eventHref(item)}
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
                    "flex h-18 shrink-0 basis-16 flex-col items-center justify-center rounded-12 px-0.5 text-center leading-display md:h-20 md:basis-18 md:rounded-14 lg:hidden",
                    ongoing ? "bg-magenta text-white" : "bg-raised text-magenta-ink",
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
                    /* Dark: posters (often white paper) sit on a raised card instead of glaring. */
                    item.poster && "dark:bg-raised dark:p-2.5",
                  )}
                >
                  {item.poster ? (
                    <img
                      src={item.poster.src}
                      alt=""
                      className="size-full object-cover dark:rounded-16"
                      loading="lazy"
                    />
                  ) : (
                    <>
                      <span className="absolute right-0 bottom-0 h-16 w-24 bg-current opacity-18 shard-br" />
                      <CalendarIcon size={44} />
                    </>
                  )}
                  <span
                    className={clsx(
                      "absolute top-3.5 left-3.5 rounded-12 px-3 py-1.5 text-14 font-bold",
                      ongoing ? "bg-magenta text-white" : "bg-raised text-magenta-ink",
                    )}
                  >
                    {chip}
                  </span>
                </span>
                <span className="flex min-w-0 flex-col items-start gap-1 lg:gap-3">
                  {ongoing && (
                    <span className="rounded-full bg-raised px-2 py-0.5 text-12 font-bold text-magenta-ink lg:bg-magenta-tint lg:px-2.5 lg:text-13">
                      Právě probíhá
                    </span>
                  )}
                  <h3 className="text-17 leading-card font-bold underline-offset-3 group-hover:text-magenta-ink group-hover:underline md:text-18 lg:text-20">
                    {item.title}
                  </h3>
                  <span className="line-clamp-2 text-14 text-ink-2 md:text-15 lg:text-16">{item.text}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
