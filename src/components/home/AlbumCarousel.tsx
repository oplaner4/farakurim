"use client";

import type { Album } from "@/content/types/gallery";
import { photoAlt } from "@/lib/gallery/albums";
import { useSnapCarousel } from "@/hooks/use-snap-carousel";
import { AlbumPhotoTile } from "@/components/gallery/AlbumPhotoTile";
import { ArrowButton } from "@/components/ui/ArrowButton";

/**
 * The newest album's photos one at a time (design/DESIGN.md §4.5): swipe, the arrows (wrapping around) or the
 * arrow keys, and a "3 / 12" counter. Turns a photo every few seconds until the visitor takes over.
 */
export function AlbumCarousel({ album }: { album: Album }) {
  const count = album.photoCount;
  const { view, regionProps, trackProps, prev, next } = useSnapCarousel<HTMLUListElement>(count);
  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={`Fotografie z alba ${album.title}`}
      className="relative overflow-hidden rounded-20 md:rounded-24 lg:rounded-28"
      {...regionProps}
    >
      <ul
        {...trackProps}
        // Focusable, so the arrow keys work without reaching for the buttons.
        tabIndex={0}
        aria-label="Fotografie"
        className="no-scrollbar flex aspect-4/3 snap-x snap-mandatory overflow-x-auto overscroll-x-contain motion-safe:scroll-smooth md:aspect-16/9 lg:aspect-16/10"
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
              // Full width up to the desktop, then beside the 340 px "Další alba" (design/DESIGN.md §4.5).
              sizes="(min-width: 75rem) 836px, (min-width: 48rem) calc(100vw - 64px), calc(100vw - 32px)"
              index={i}
              alt={photoAlt(album, i + 1)}
              eager={i === 0}
              iconSize={48}
              shardClassName="h-24 w-32 md:h-32 md:w-44"
            />
          </li>
        ))}
      </ul>
      <ArrowButton
        direction="prev"
        tone="green"
        data-js-only
        className="absolute top-1/2 left-3 -translate-y-1/2"
        aria-label="Předchozí fotografie"
        onClick={prev}
      />
      <ArrowButton
        direction="next"
        tone="green"
        data-js-only
        className="absolute top-1/2 right-3 -translate-y-1/2"
        aria-label="Další fotografie"
        onClick={next}
      />
      <span
        aria-live="polite"
        className="absolute right-3 bottom-3 rounded-full bg-overlay px-3 py-1 text-14 font-bold text-ink"
      >
        {(view?.first ?? 0) + 1} / {count}
      </span>
    </div>
  );
}
