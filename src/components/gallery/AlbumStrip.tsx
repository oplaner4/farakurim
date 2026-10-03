"use client";

import type { Album } from "@/content/types";
import { formatLongDate } from "@/lib/czech";
import { albumElementId, photoAlt, photoCounter, photoCountLabel } from "@/lib/gallery";
import { useSnapCarousel } from "@/hooks/use-snap-carousel";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { AlbumPhotoTile } from "./AlbumPhotoTile";

const arrowClass =
  "flex size-12 flex-none cursor-pointer items-center justify-center rounded-full border-thin border-line bg-raised text-ink hover:border-green-ink hover:text-green-ink";

type Props = {
  album: Album;
  /** The album's place on the page: shifts the placeholder tints from one album to the next. */
  position: number;
};

/**
 * One album of the Fotogalerie page (design/DESIGN.md §19.1): date, title, photo count and a link to Zonerama, then
 * a strip of 1 / 2 / 3 photos per screen that the arrows page through (wrapping around). Each photo opens the album.
 */
export function AlbumStrip({ album, position }: Props) {
  const count = album.photoCount;
  const { trackRef, view, onScroll, onKeyDown, prev, next } = useSnapCarousel<HTMLUListElement>(count);
  const id = albumElementId(album);
  return (
    <section
      id={id}
      aria-labelledby={`${id}-nazev`}
      className="flex scroll-mt-4 flex-col gap-3.5 border-t border-line pt-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1.5">
        <div className="flex min-w-0 flex-col gap-1">
          <time
            dateTime={album.date}
            className="self-start rounded-full bg-green-tint px-2.5 py-0.5 text-13 font-bold text-green-ink"
          >
            {formatLongDate(album.date)}
          </time>
          <h2 id={`${id}-nazev`} className="text-20 leading-snug font-bold md:text-24 lg:text-28">
            {album.title}
          </h2>
          <span className="text-14 text-muted">{photoCountLabel(count)}</span>
        </div>
        <a
          href={album.href}
          className="inline-flex min-h-11 items-center gap-1.5 font-bold text-green-ink hover:text-ink"
        >
          Otevřít album
          <ArrowRightIcon size={18} />
        </a>
      </div>
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={`Fotografie z alba ${album.title}`}
        className="flex flex-col gap-2.5"
        onKeyDown={onKeyDown}
      >
        {/* The gaps are the items' padding, so a page is exactly the track's width. */}
        <ul
          ref={trackRef}
          // Focusable, so the arrow keys work without reaching for the buttons.
          tabIndex={0}
          aria-label="Fotografie"
          className="-mx-1.5 no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain motion-safe:scroll-smooth md:-mx-1.75 lg:-mx-2"
          onScroll={onScroll}
        >
          {Array.from({ length: count }, (_, i) => (
            <li key={i} className="shrink-0 basis-full snap-start px-1.5 md:basis-1/2 md:px-1.75 lg:basis-1/3 lg:px-2">
              <a href={album.href} className="block aspect-4/3 overflow-hidden rounded-18 lg:rounded-20">
                <AlbumPhotoTile
                  photo={album.photos?.[i]}
                  size="small"
                  index={i + position}
                  alt={photoAlt(album, i + 1)}
                  eager={i < 3}
                  iconSize={40}
                  shardClassName="h-16 w-22"
                />
              </a>
            </li>
          ))}
        </ul>
        <div data-js-only className="flex items-center justify-between gap-3">
          <button type="button" className={arrowClass} aria-label="Předchozí fotografie" onClick={prev}>
            <ChevronLeftIcon size={20} />
          </button>
          <span aria-live="polite" className="text-15 font-bold text-ink-2">
            {view ? (
              photoCounter(view.first + 1, view.last + 1, count)
            ) : (
              // Before the strip is measured: the first page at each breakpoint.
              <>
                <span className="md:hidden">{photoCounter(1, 1, count)}</span>
                <span className="hidden md:inline lg:hidden">{photoCounter(1, Math.min(2, count), count)}</span>
                <span className="hidden lg:inline">{photoCounter(1, Math.min(3, count), count)}</span>
              </>
            )}
          </span>
          <button type="button" className={arrowClass} aria-label="Další fotografie" onClick={next}>
            <ChevronRightIcon size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}
