"use client";

import dynamic from "next/dynamic";
import type { Album } from "@/content/types/gallery";
import { formatLongDate } from "@/lib/shared/czech";
import {
  albumElementId,
  photoAlt,
  photoCounter,
  photoCountLabel,
  photoFromHash,
  photoHash,
} from "@/lib/gallery/albums";
import { externalLinkAttrs, isModifiedClick } from "@/lib/shared/links";
import { clearHash, pushHash, replaceHash } from "@/lib/shared/location-hash";
import { useLocationHash } from "@/hooks/use-location-hash";
import { useSnapCarousel } from "@/hooks/use-snap-carousel";
import { ArrowButton } from "@/components/ui/ArrowButton";
import { AlbumPhotoTile } from "./AlbumPhotoTile";
import { ArrowLink } from "@/components/ui/ArrowLink";

// The lightbox library loads with the first photo opened (or hovered).
const loadLightbox = () => import("./PhotoLightbox");
const PhotoLightbox = dynamic(() => loadLightbox().then((m) => m.PhotoLightbox), { ssr: false });

type Props = {
  album: Album;
  /** The album's place on the page: shifts the placeholder tints from one album to the next; 0 loads eagerly. */
  position: number;
};

/**
 * One album of the Fotogalerie page (design/DESIGN.md §19.1): date, title, photo count and a link to Zonerama, then
 * a strip of 1 / 2 / 3 photos per screen that the arrows page through (wrapping around) and that turns a page every
 * few seconds until the visitor takes over (not while the lightbox is open). Each photo opens the
 * lightbox at that photo (§21, `#album-<id>-foto-3`); without JS it links to the album on Zonerama.
 */
export function AlbumStrip({ album, position }: Props) {
  const count = album.photoCount;
  const id = albumElementId(album);
  const open = photoFromHash(album, useLocationHash());
  const { view, regionProps, trackProps, prev, next } = useSnapCarousel<HTMLUListElement>(count, {
    paused: open !== null,
  });
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
        <ArrowLink href={album.href} tone="green">
          Otevřít album
        </ArrowLink>
      </div>
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={`Fotografie z alba ${album.title}`}
        className="flex flex-col gap-2.5"
        {...regionProps}
      >
        {/* The gaps are the items' padding, so a page is exactly the track's width. */}
        <ul
          {...trackProps}
          // Focusable, so the arrow keys work without reaching for the buttons.
          tabIndex={0}
          aria-label="Fotografie"
          className="-mx-1.5 no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain motion-safe:scroll-smooth md:-mx-1.75 lg:-mx-2"
        >
          {Array.from({ length: count }, (_, i) => (
            <li key={i} className="shrink-0 basis-full snap-start px-1.5 md:basis-1/2 md:px-1.75 lg:basis-1/3 lg:px-2">
              <a
                href={album.href}
                {...externalLinkAttrs(album.href)}
                className="group block aspect-4/3 overflow-hidden rounded-18 lg:rounded-20"
                onPointerEnter={loadLightbox}
                onClick={(e) => {
                  if (isModifiedClick(e)) return;
                  e.preventDefault();
                  pushHash(photoHash(album, i + 1));
                }}
              >
                <AlbumPhotoTile
                  photo={album.photos?.[i]}
                  size="small"
                  sizes="(min-width: 75rem) 400px, (min-width: 48rem) 50vw, calc(100vw - 32px)"
                  index={i + position}
                  alt={photoAlt(album, i + 1)}
                  // Only the first album is in view on load; the strips below wait until scrolled to.
                  eager={position === 0 && i < 3}
                  iconSize={40}
                  shardClassName="h-16 w-22"
                  // A slight zoom on hover: the photo opens (§5).
                  className="motion-safe:group-hover:scale-103"
                />
              </a>
            </li>
          ))}
        </ul>
        <div data-js-only className="flex items-center justify-between gap-3">
          <ArrowButton
            direction="prev"
            variant="outline"
            tone="green"
            aria-label="Předchozí fotografie"
            onClick={prev}
          />
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
          <ArrowButton direction="next" variant="outline" tone="green" aria-label="Další fotografie" onClick={next} />
        </div>
      </div>
      {open !== null && (
        <PhotoLightbox
          album={album}
          index={open}
          position={position}
          onView={(i) => replaceHash(photoHash(album, i + 1))}
          onClose={clearHash}
        />
      )}
    </section>
  );
}
