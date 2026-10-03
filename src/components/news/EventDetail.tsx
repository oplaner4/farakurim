import { clsx } from "clsx";
import type { ReactNode } from "react";
import { events } from "@/content/news";
import { links, SITE_URL } from "@/content/site";
import type { NewsEvent } from "@/content/types";
import { BUILD_TIME } from "@/lib/build-time";
import { capitalize, eventDateBlock, fileType, formatEventWhen, formatFileSize } from "@/lib/czech";
import { eventCalendarHref, eventEnd, eventHref } from "@/lib/news";
import { pragueDate } from "@/lib/prague";
import { eventJsonLd, jsonLdScript } from "@/lib/structured-data";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EventActions } from "./EventActions";
import { EventDetailLabels } from "./EventDetailLabels";
import { CalendarIcon, ExternalLinkIcon, FileIcon, PinIcon } from "@/components/ui/icons";
import { type MoreEventItem, MoreEvents } from "./MoreEvents";
import { PosterPlaceholder } from "@/components/ui/PosterPlaceholder";
import { SiteHeader } from "@/components/layout/SiteHeader";

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

/** Highlight tiles cycle through the brand tints (§13.3). */
const tiles = [
  { tile: "bg-green-tint", shard: "bg-green", value: "text-green-ink" },
  { tile: "bg-blue-tint", shard: "bg-blue", value: "text-blue-ink" },
  { tile: "bg-orange-tint", shard: "bg-orange", value: "text-orange-ink" },
];

const mapHref = (query: string) => `https://mapy.cz/zakladni?q=${encodeURIComponent(query)}`;

/** Heading and gap of the content blocks: O akci, Program, highlights, Přílohy. */
const block = "flex flex-col gap-3 lg:gap-3.5";
const blockHeading = "text-22 leading-heading font-bold md:text-26 lg:text-28";

/**
 * Detail akce (design/DESIGN.md §13). Mobile: everything stacked. Tablet: "Kdy a kde" beside the poster.
 * Desktop: content on the left; "Kdy a kde" and the poster in a right column. The left column is `contents`
 * below desktop, so the "Kdy a kde" block (`order-1`) goes between the title and the content (`order-2`).
 */
export function EventDetail({ event }: { event: NewsEvent }) {
  const url = `${SITE_URL}${eventHref(event)}`;
  const when = formatEventWhen(event, { longMonth: true });
  const attachments = event.attachments ?? [];
  const eventLinks = event.links ?? [];
  const posterFile = attachments.find((a) => a.label === "Plakát");
  const posterHref = event.poster?.src ?? posterFile?.file;
  const filesHeading = attachments.length === 0 ? "Odkazy" : eventLinks.length > 0 ? "Přílohy a odkazy" : "Přílohy";

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
              <section aria-labelledby="o-akci" className={clsx(block, "lg:max-w-175")}>
                <h2 id="o-akci" className={blockHeading}>
                  O akci
                </h2>
                {/* Trusted HTML from the content source (see `NewsEvent.body`). */}
                {event.body ? (
                  <div className="rich-text" dangerouslySetInnerHTML={{ __html: event.body }} />
                ) : (
                  <p>{event.text}</p>
                )}
              </section>

              {event.program && event.program.length > 0 && (
                <section aria-labelledby="program" className={clsx(block, "lg:max-w-175")}>
                  <h2 id="program" className={blockHeading}>
                    Program
                  </h2>
                  <ol className="flex flex-col border-b border-line">
                    {event.program.map((item) => (
                      <li
                        key={`${item.time} ${item.title}`}
                        className="flex gap-3 border-t border-line py-3 md:gap-4 md:py-3.5 lg:gap-5 lg:py-4"
                      >
                        <strong className="w-19 shrink-0 text-magenta-ink md:w-25 lg:w-30">{item.time}</strong>
                        <p className="min-w-0 flex-1">
                          <strong>{item.title}</strong>
                          {item.note && (
                            <>
                              <br />
                              <span className="text-ink-2">{item.note}</span>
                            </>
                          )}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {event.highlights && (
                <section aria-labelledby="v-datech" className={block}>
                  <h2 id="v-datech" className={blockHeading}>
                    {event.highlights.title}
                  </h2>
                  <ul className="grid grid-cols-3 gap-2 md:gap-3 lg:gap-4">
                    {event.highlights.items.slice(0, tiles.length).map((item, i) => (
                      <li
                        key={item.label}
                        className={clsx(
                          "relative flex flex-col gap-0.5 overflow-hidden rounded-16 px-3 pt-4 pb-3.5 leading-normal",
                          "md:rounded-20 md:px-4.5 md:py-5 lg:gap-1 lg:rounded-24 lg:px-5.5 lg:py-6",
                          tiles[i].tile,
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={clsx(
                            "absolute top-0 right-0 size-7 shard-tr md:size-9 lg:size-12",
                            tiles[i].shard,
                          )}
                        />
                        <span
                          className={clsx("text-24 font-bold md:text-32 md:leading-display lg:text-40", tiles[i].value)}
                        >
                          {item.value}
                        </span>
                        <span className="text-13 text-ink-2 md:text-15 lg:text-16">{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {(attachments.length > 0 || eventLinks.length > 0) && (
                <section aria-labelledby="prilohy" className={block}>
                  <h2 id="prilohy" className={blockHeading}>
                    {filesHeading}
                  </h2>
                  <ul className="flex flex-col gap-2 md:items-start">
                    {attachments.map((a) => (
                      <FileRow
                        key={a.file}
                        href={a.file}
                        label={a.label}
                        detail={a.size ? `${fileType(a.file)} · ${formatFileSize(a.size)}` : fileType(a.file)}
                        icon={<FileIcon size={20} className="shrink-0 text-magenta-ink lg:size-5.5" />}
                      />
                    ))}
                    {eventLinks.map((l) => (
                      <FileRow
                        key={l.href}
                        href={l.href}
                        label={l.label}
                        detail={l.href.startsWith("mailto:") ? "E-mail" : new URL(l.href).hostname}
                        icon={<ExternalLinkIcon size={20} className="shrink-0 text-blue-ink lg:size-5.5" />}
                      />
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-7 max-lg:order-1 md:flex-row md:gap-6 lg:shrink lg:grow lg:basis-90 lg:flex-col">
            <section
              aria-label="Kdy a kde"
              className="relative flex flex-col gap-4 overflow-hidden rounded-24 bg-magenta-tint px-5 py-5.5 md:min-w-0 md:flex-1 md:rounded-28 md:p-6 md:leading-compact lg:flex-none lg:gap-4.5 lg:p-7"
            >
              <span
                aria-hidden="true"
                className="absolute top-0 right-0 size-16 bg-magenta shard-tr md:size-19 lg:size-21"
              />
              <span
                aria-hidden="true"
                className="absolute top-0 right-12.5 hidden h-11 w-8.5 bg-orange shard-tr lg:block"
              />
              <p className="flex gap-3 pr-12 lg:gap-3.5">
                <CalendarIcon size={22} strokeWidth={2} className="mt-0.5 shrink-0 text-magenta-ink lg:size-6" />
                <span className="flex flex-col">
                  <span className="text-13 text-muted md:text-14">Kdy</span>
                  <strong>
                    {capitalize(when.date)}
                    {when.time && (
                      <>
                        <span className="lg:hidden">, </span>
                        <span className="lg:block">{when.time}</span>
                      </>
                    )}
                  </strong>
                </span>
              </p>
              <p className="flex gap-3 lg:gap-3.5">
                <PinIcon size={22} className="mt-0.5 shrink-0 text-magenta-ink lg:size-6" />
                <span className="flex flex-col items-start">
                  <span className="text-13 text-muted md:text-14">Kde</span>
                  <strong>{event.place}</strong>
                  <a href={mapHref(event.mapQuery ?? event.place)} className="text-15 font-bold lg:text-16">
                    Zobrazit na mapě
                  </a>
                </span>
              </p>
              <EventActions
                title={event.title}
                end={eventEnd(event)}
                calendarHref={eventCalendarHref(event)}
                renderedAt={BUILD_TIME}
              />
            </section>

            {posterHref && (
              <div className="flex flex-col items-center gap-2.5 md:w-59 md:shrink-0 md:items-stretch md:gap-2 lg:w-auto lg:gap-2.5">
                <span
                  className={clsx(
                    "relative flex h-85 w-60 items-center justify-center overflow-hidden rounded-16 bg-magenta-tint-alt text-magenta-ink",
                    "md:h-83.5 md:w-auto md:rounded-18 lg:h-115 lg:rounded-20",
                    /* Dark: posters (often white paper) get a margin of the tint around them. */
                    event.poster && "dark:p-3",
                  )}
                >
                  {event.poster ? (
                    <img src={event.poster.src} alt={event.poster.alt} className="size-full object-contain" />
                  ) : (
                    <PosterPlaceholder iconSize={40} className="h-20 w-28 lg:h-28 lg:w-40" />
                  )}
                </span>
                <a href={posterHref} className="flex min-h-11 items-center font-bold md:text-15 lg:text-16">
                  Plakát v plné velikosti
                  {/* The tablet column is narrow. */}
                  <span className="md:max-lg:hidden">&nbsp;({fileType(posterHref)})</span>
                </a>
              </div>
            )}
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

type FileRowProps = { href: string; label: string; detail: string; icon: ReactNode };

function FileRow({ href, label, detail, icon }: FileRowProps) {
  return (
    <li>
      <a
        href={href}
        className="flex min-h-14 items-center gap-3 rounded-14 bg-surface px-4 text-ink no-underline hover:bg-magenta-tint hover:text-ink md:px-4.5 lg:min-h-15 lg:gap-3.5 lg:rounded-16 lg:px-5"
      >
        {icon}
        <span className="flex flex-col leading-card">
          <strong>{label}</strong>
          <span className="text-13 text-muted md:text-14">{detail}</span>
        </span>
      </a>
    </li>
  );
}
