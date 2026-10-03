"use client";

import { clsx } from "clsx";
import type { Album } from "@/content/types";
import { photoAlt } from "@/lib/gallery";
import { useSnapCarousel } from "@/lib/use-snap-carousel";
import { AlbumPhotoTile } from "@/components/gallery/AlbumPhotoTile";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

const arrowClass =
  "absolute top-1/2 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-overlay text-ink hover:bg-bg hover:text-green-ink";

/**
 * The newest album's photos one at a time (design/DESIGN.md §4.5): swipe, the arrows (wrapping around) or the
 * arrow keys, and a "3 / 12" counter. No autoplay.
 */
export function AlbumCarousel({ album }: { album: Album }) {
  const count = album.photoCount;
  const { trackRef, view, onScroll, onKeyDown, prev, next } = useSnapCarousel<HTMLUListElement>(count);
  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={`Fotografie z alba ${album.title}`}
      className="relative overflow-hidden rounded-20 md:rounded-24 lg:rounded-28"
      onKeyDown={onKeyDown}
    >
      <ul
        ref={trackRef}
        // Focusable, so the arrow keys work without reaching for the buttons.
        tabIndex={0}
        aria-label="Fotografie"
        className="no-scrollbar flex aspect-4/3 snap-x snap-mandatory overflow-x-auto overscroll-x-contain motion-safe:scroll-smooth md:aspect-16/9 lg:aspect-16/10"
        onScroll={onScroll}
      >
        {Array.from({ length: count }, (_, i) => (
          <li
            key={i}
            className="h-full shrink-0 basis-full snap-start snap-always"
            aria-roledescription="snímek"
            aria-label={`${i + 1} z ${count}`}
          >
            <AlbumPhotoTile
              photo={album.photos?.[i]}
              size="large"
              index={i}
              alt={photoAlt(album, i + 1)}
              eager={i === 0}
              iconSize={48}
              shardClassName="h-24 w-32 md:h-32 md:w-44"
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        data-js-only
        className={clsx(arrowClass, "left-3")}
        aria-label="Předchozí fotografie"
        onClick={prev}
      >
        <ChevronLeftIcon size={20} />
      </button>
      <button
        type="button"
        data-js-only
        className={clsx(arrowClass, "right-3")}
        aria-label="Další fotografie"
        onClick={next}
      >
        <ChevronRightIcon size={20} />
      </button>
      <span
        aria-live="polite"
        className="absolute right-3 bottom-3 rounded-full bg-overlay px-3 py-1 text-14 font-bold text-ink"
      >
        {(view?.first ?? 0) + 1} / {count}
      </span>
    </div>
  );
}
