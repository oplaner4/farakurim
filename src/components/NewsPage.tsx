import { events } from "@/content/news";
import { BUILD_TIME } from "@/lib/build-time";
import { eventEnd, featuredEvent, type NewsFilter } from "@/lib/news";
import { pragueDate } from "@/lib/prague";
import { EventList } from "./EventList";
import { FeaturedEvent } from "./FeaturedEvent";
import { NewsArchivePanel } from "./NewsArchivePanel";
import { PageHeading } from "./PageHeading";
import { ShowUntil } from "./ShowUntil";
import { SiteHeader } from "./SiteHeader";
import { links } from "@/content/site";

const buildToday = pragueDate(BUILD_TIME);
const featured = featuredEvent(events, buildToday);
// Finished events only show under "Vše"; the other filters don't need them on the client.
const unfinished = events.filter((e) => eventEnd(e) >= buildToday);

/** The Aktuality page (design/DESIGN.md §11), prerendered once per filter. */
export function NewsPage({ filter }: { filter: NewsFilter }) {
  return (
    <>
      <SiteHeader currentHref={links.news} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-7 pt-5 pb-12 md:gap-9 md:pt-7 md:pb-14 lg:gap-12 lg:pt-9 lg:pb-20"
      >
        <PageHeading title="Aktuality" color="magenta" />
        {featured && (
          <ShowUntil date={eventEnd(featured)} renderedAt={BUILD_TIME}>
            <FeaturedEvent event={featured} />
          </ShowUntil>
        )}
        <EventList events={filter === "all" ? events : unfinished} filter={filter} renderedAt={BUILD_TIME} />
        {/* Without JS, every card is shown and there is nothing to load. */}
        <noscript>
          <style>{"[data-more]{display:flex}[data-load-more]{display:none}"}</style>
        </noscript>
        <NewsArchivePanel />
      </main>
    </>
  );
}
