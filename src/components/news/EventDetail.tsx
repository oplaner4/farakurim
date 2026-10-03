import { events } from "@/content/news";
import { links, SITE_URL } from "@/content/site";
import type { NewsEvent } from "@/content/types";
import { BUILD_TIME } from "@/lib/build-time";
import { eventDateBlock } from "@/lib/czech";
import { eventEnd, eventHref } from "@/lib/news";
import { pragueDate } from "@/lib/prague";
import { eventJsonLd, jsonLdScript } from "@/lib/structured-data";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { DetailBlock } from "./DetailBlock";
import { EventDetailLabels } from "./EventDetailLabels";
import { EventFiles } from "./EventFiles";
import { EventHighlights } from "./EventHighlights";
import { EventPoster } from "./EventPoster";
import { EventProgram } from "./EventProgram";
import { EventWhenWhere } from "./EventWhenWhere";
import { type MoreEventItem, MoreEvents } from "./MoreEvents";

// "Další akce" filters by the visitor's date, so the client gets the events unfinished at build time,
// as slim cards.
const buildToday = pragueDate(BUILD_TIME);
const moreItems: MoreEventItem[] = events
  .filter((e) => eventEnd(e) >= buildToday)
  .map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    time: e.time,
    place: e.place,
    longTerm: e.longTerm,
    href: eventHref(e),
    date: eventDateBlock(e),
  }));

/**
 * Detail akce (design/DESIGN.md §13). Mobile: everything stacked. Tablet: "Kdy a kde" beside the poster.
 * Desktop: content on the left; "Kdy a kde" and the poster in a right column. The left column is `contents`
 * below desktop, so the "Kdy a kde" block (`order-1`) goes between the title and the content (`order-2`).
 */
export function EventDetail({ event }: { event: NewsEvent }) {
  const url = `${SITE_URL}${eventHref(event)}`;
  const attachments = event.attachments ?? [];
  const eventLinks = event.links ?? [];
  const posterFile = attachments.find((a) => a.label === "Plakát");
  const posterHref = event.poster?.src ?? posterFile?.file;

  return (
    <>
      <SiteHeader currentHref={links.news} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-7 pt-5 pb-12 md:gap-8 md:pt-7 md:pb-14 lg:gap-10 lg:pt-9 lg:pb-20"
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(eventJsonLd(event, url)) }}
        />
        <Breadcrumbs
          parents={[
            { label: "Úvod", href: links.home },
            { label: "Aktuality", href: links.news },
          ]}
          current={event.title}
        />

        <article
          aria-labelledby="nazev-akce"
          className="flex flex-col gap-7 md:gap-9 md:leading-loose lg:flex-row lg:items-start lg:gap-14 lg:text-18"
        >
          <div className="max-lg:contents lg:flex lg:min-w-0 lg:shrink lg:grow-999 lg:basis-140 lg:flex-col lg:gap-10">
            <header className="flex flex-col gap-3.5 lg:gap-4">
              <EventDetailLabels
                event={{ start: event.start, end: event.end, pinned: event.pinned }}
                renderedAt={BUILD_TIME}
              />
              <h1
                id="nazev-akce"
                className="text-32 leading-title font-bold tracking-title md:text-44 md:leading-display lg:text-56 lg:leading-hero lg:tracking-hero"
              >
                {event.title}
              </h1>
              <p className="text-18 text-ink-2 md:text-20 md:leading-normal lg:max-w-170 lg:text-22">
                {event.lead ?? event.text}
              </p>
            </header>

            <div className="flex flex-col gap-7 max-lg:order-2 md:gap-9 lg:gap-10">
              <DetailBlock id="o-akci" title="O akci" className="lg:max-w-175">
                {/* Trusted HTML from the content source (see `NewsEvent.body`). */}
                {event.body ? (
                  <div className="rich-text" dangerouslySetInnerHTML={{ __html: event.body }} />
                ) : (
                  <p>{event.text}</p>
                )}
              </DetailBlock>
              {event.program && event.program.length > 0 && <EventProgram items={event.program} />}
              {event.highlights && <EventHighlights highlights={event.highlights} />}
              {(attachments.length > 0 || eventLinks.length > 0) && (
                <EventFiles attachments={attachments} links={eventLinks} />
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-7 max-lg:order-1 md:flex-row md:gap-6 lg:shrink lg:grow lg:basis-90 lg:flex-col">
            <EventWhenWhere event={event} />

            {posterHref && <EventPoster poster={event.poster} href={posterHref} />}
          </div>
        </article>

        <MoreEvents items={moreItems} currentId={event.id} renderedAt={BUILD_TIME} />
        <noscript>
          <style>{"[data-js-only]{display:none}"}</style>
        </noscript>
      </main>
    </>
  );
}
