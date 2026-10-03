"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { NewsEvent } from "@/content/types";
import { links } from "@/content/site";
import { formatMonthYear, plural } from "@/lib/czech";
import {
  type EventGroup,
  eventStatus,
  filterEvents,
  groupEvents,
  NEWS_FILTER_META,
  NEWS_FILTERS,
  NEWS_PAGE_SIZE,
  type NewsFilter,
  parsePage,
} from "@/lib/news";
import { useToday } from "@/lib/use-now";
import { PAGE_PARAM } from "@/lib/query-params";
import { useLoadMore } from "@/lib/use-load-more";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EventCard, eventAnchor } from "./EventCard";

const groupHeading = (group: EventGroup) =>
  group.kind === "month"
    ? { label: formatMonthYear(group.month), color: "text-magenta-ink" }
    : group.kind === "long"
      ? { label: "Dlouhodobé akce", color: "text-blue-ink" }
      : { label: "Proběhlo", color: "text-muted" };

const filterHref = (filter: NewsFilter) => {
  const { slug } = NEWS_FILTER_META[filter];
  return slug ? `${links.news}${slug}/` : links.news;
};

type Props = {
  events: NewsEvent[];
  filter: NewsFilter;
  renderedAt: number;
};

/**
 * Filters (links to the static filter pages), count, grouped cards and paging (design/DESIGN.md §11.3–11.6).
 * The prerendered HTML is page 1 (the Suspense fallback); the page from `?strana=` replaces it after hydration.
 */
export function EventList(props: Props) {
  return (
    <Suspense fallback={<EventListView {...props} page={1} />}>
      <EventListFromUrl {...props} />
    </Suspense>
  );
}

function EventListFromUrl(props: Props) {
  const page = parsePage(useSearchParams().get(PAGE_PARAM));
  return <EventListView {...props} page={page} />;
}

/**
 * Every matching card is in the HTML; the ones beyond `page` are hidden, so "Načíst další" only reveals them,
 * and without JS a <noscript> style (NewsPage) shows them all.
 */
function EventListView({ events, filter, renderedAt, page }: Props & { page: number }) {
  const today = useToday(renderedAt);
  const loadMore = useLoadMore(page);
  const groups = groupEvents(filterEvents(events, filter, today), today);
  const flat = groups.flatMap((g) => g.events);
  const position = new Map(flat.map((event, i) => [event.id, i]));
  const shownCount = Math.min(flat.length, page * NEWS_PAGE_SIZE);

  return (
    <section aria-labelledby="seznam-akci" className="flex flex-col gap-4 md:gap-4.5 lg:gap-5">
      <h2 id="seznam-akci" className="sr-only">
        Seznam akcí
      </h2>

      <div className="max-md:contents md:flex md:flex-wrap md:items-center md:justify-between md:gap-3">
        {/* Mobile: one scrollable row bleeding to the screen edges. */}
        <nav aria-label="Filtr akcí" className="-mx-4 no-scrollbar overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 md:pb-0">
          <ul className="flex gap-2 md:flex-wrap">
            {NEWS_FILTERS.map((f) => {
              const active = f === filter;
              return (
                <li key={f} className="flex-none">
                  <Link
                    href={filterHref(f)}
                    scroll={false}
                    aria-current={active ? "true" : undefined}
                    className={clsx(
                      "flex min-h-11 items-center rounded-full border-thin px-4 text-15 font-bold no-underline md:px-4.5 lg:min-h-11.5 lg:px-5 lg:text-16",
                      active
                        ? "border-magenta bg-magenta text-white hover:text-white"
                        : "border-line bg-surface text-ink hover:border-magenta hover:text-ink",
                    )}
                  >
                    {NEWS_FILTER_META[f].label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <p aria-live="polite" className="text-14 text-muted md:text-15">
          Zobrazeno {shownCount} {plural(shownCount, ["akce", "akce", "akcí"])}
        </p>
      </div>

      {flat.length === 0 ? (
        <p className="rounded-20 bg-surface px-5 py-8 text-center text-ink-2 md:rounded-24 md:px-6 md:py-10 lg:py-12">
          V tomto období nejsou žádné akce.
        </p>
      ) : (
        groups.map((group) => {
          const groupMore = position.get(group.events[0].id)! >= shownCount;
          const heading = groupHeading(group);
          return (
            <div
              key={group.kind === "month" ? group.month : group.kind}
              data-more={groupMore || undefined}
              className={clsx("flex flex-col gap-3 pt-2 md:gap-3.5 md:pt-2.5 lg:gap-4 lg:pt-4", groupMore && "hidden")}
            >
              <div className="flex items-center gap-3 md:gap-3.5 lg:gap-4">
                <h3 className={clsx("text-18 font-bold md:text-20 lg:text-24", heading.color)}>{heading.label}</h3>
                <span aria-hidden="true" className="h-px flex-1 bg-line" />
              </div>
              {group.events.map((event) => {
                const index = position.get(event.id)!;
                return (
                  <EventCard
                    key={event.id}
                    event={event}
                    status={eventStatus(event, today)}
                    today={today}
                    index={index}
                    more={index >= shownCount}
                  />
                );
              })}
            </div>
          );
        })
      )}

      {shownCount < flat.length && (
        <ButtonLink
          href={`?${PAGE_PARAM}=${page + 1}`}
          variant="outline-magenta"
          onClick={(e) => loadMore(e, eventAnchor(flat[shownCount].id))}
          data-load-more
          className="mt-2 md:self-center md:px-7 lg:mt-3 lg:px-8"
        >
          Načíst další aktuality
        </ButtonLink>
      )}
    </section>
  );
}
