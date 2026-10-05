"use client";

import { clsx } from "clsx";
import { type RefObject, useRef } from "react";
import { useController, useLightboxState, type RenderSlideProps } from "yet-another-react-lightbox";
import type { PhotoSet } from "@/content/types/gallery";
import { photoAlt } from "@/lib/gallery/albums";
import { formatLongDate } from "@/lib/shared/czech";
import { thumbStart } from "@/lib/shared/lightbox";
import { NEW_TAB } from "@/lib/shared/links";
import { ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon } from "@/components/ui/icons";
import {
  LightboxButton,
  LightboxControls,
  LightboxShell,
  LightboxTopBar,
  lightboxButton,
} from "@/components/ui/Lightbox";
import { AlbumPhotoTile } from "./AlbumPhotoTile";

/** Thumbnails in the desktop strip. */
const THUMBS = 9;

type Props = {
  album: PhotoSet;
  /** The photo to show, 0-based. */
  index: number;
  /** Shifts the placeholder tints like the album's strip. */
  position: number;
  onView: (index: number) => void;
  onClose: () => void;
};

/**
 * The photo lightbox (design/DESIGN.md §21.2): the album's large photos with prev/next (wrapping around, also by
 * swipe and the arrow keys), the date and title, and on desktop a strip of thumbnails. A group page's photos have
 * no date and no Zonerama album, so those parts are left out.
 */
export function PhotoLightbox({ album, index, position, onView, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const count = album.photoCount;
  const slides = Array.from({ length: count }, (_, i) => ({
    src: album.photos?.[i]?.large ?? "",
    alt: photoAlt(album, i + 1),
  }));

  // An album without photo URLs (the mock data) shows the strip's placeholders, 4:3 in the free space.
  const renderSlide = ({ slide, rect }: RenderSlideProps) => {
    if (slide.src) return undefined;
    const width = Math.min(rect.width, (rect.height * 4) / 3);
    const i = slides.indexOf(slide as (typeof slides)[number]);
    return (
      <div style={{ width }} className="aspect-4/3 max-w-full overflow-hidden rounded-4 md:rounded-8">
        <AlbumPhotoTile
          size="large"
          index={i + position}
          alt={slide.alt ?? ""}
          iconSize={48}
          shardClassName="h-20 w-28 lg:h-28 lg:w-40"
        />
      </div>
    );
  };

  return (
    <LightboxShell
      variant="photo"
      label={album.date ? `Fotografie z alba ${album.title}` : `Fotografie: ${album.title}`}
      closeRef={closeRef}
      slides={slides}
      index={index}
      close={onClose}
      on={{ view: ({ index: i }) => onView(i) }}
      render={{
        slide: renderSlide,
        // The photo is at most 760 px wide on tablet and 1040 px on desktop (§21.1).
        slideContainer: ({ children }) => (
          <div className="mx-auto flex size-full items-center justify-center md:max-w-190 lg:max-w-260">{children}</div>
        ),
        controls: () => <PhotoControls album={album} position={position} closeRef={closeRef} />,
      }}
    />
  );
}

type ControlsProps = { album: PhotoSet; position: number; closeRef: RefObject<HTMLButtonElement | null> };

function PhotoControls({ album, position, closeRef }: ControlsProps) {
  const { currentIndex } = useLightboxState();
  const { prev, next } = useController();
  const count = album.photoCount;
  const date = album.date && formatLongDate(album.date);
  const go = (k: number) => {
    if (k > currentIndex) next({ count: k - currentIndex });
    else if (k < currentIndex) prev({ count: currentIndex - k });
  };
  const from = thumbStart(currentIndex, count, THUMBS);

  const prevButton = (className: string) => (
    <LightboxButton aria-label="Předchozí fotografie" className={className} onClick={() => prev()}>
      <ChevronLeftIcon size={24} />
    </LightboxButton>
  );
  const nextButton = (className: string) => (
    <LightboxButton aria-label="Další fotografie" className={className} onClick={() => next()}>
      <ChevronRightIcon size={24} />
    </LightboxButton>
  );

  return (
    <LightboxControls>
      <LightboxTopBar
        heading={`${currentIndex + 1} / ${count}`}
        live
        title={album.title}
        closeRef={closeRef}
        actions={
          album.href && (
            <a
              href={album.href}
              {...NEW_TAB}
              aria-label="Otevřít album na Zonerama (nové okno)"
              className={clsx(lightboxButton({ size: "pill" }), "max-md:size-12 max-md:p-0")}
            >
              <span className="max-md:hidden">Album na Zonerama</span>
              <ExternalLinkIcon size={18} />
            </a>
          )
        }
      />

      {/* Tablet and desktop: the arrows beside the photo. */}
      <div className="relative flex-1 max-md:hidden">
        {prevButton("absolute top-1/2 left-6 -translate-y-1/2 lg:left-8")}
        {nextButton("absolute top-1/2 right-6 -translate-y-1/2 lg:right-8")}
      </div>

      <div className="flex flex-col gap-3.5 px-4 pt-4 pb-7 max-md:mt-auto md:px-6 md:pb-8 lg:px-8 lg:pb-6">
        <p className="text-center text-15 text-lightbox-ink-2 max-md:hidden">
          {date ? `${date} · ${album.title}` : album.title}
        </p>
        <div className="flex items-center justify-between gap-3 md:hidden">
          {prevButton("")}
          <span className="text-14 text-lightbox-ink-2">{date ?? album.title}</span>
          {nextButton("")}
        </div>
        <p className="text-center text-13 text-lightbox-hint md:hidden">Přejeďte prstem pro další fotografii</p>
        <ul aria-label="Náhledy" className="flex justify-center gap-2 max-lg:hidden">
          {Array.from({ length: Math.min(THUMBS, count) }, (_, k) => {
            const i = from + k;
            const current = i === currentIndex;
            return (
              <li key={i}>
                <button
                  type="button"
                  aria-label={`Fotografie ${i + 1}`}
                  aria-current={current || undefined}
                  className={clsx(
                    "pointer-events-auto block h-13.5 w-18 cursor-pointer overflow-hidden rounded-8 border-2 p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                    current ? "border-white" : "border-transparent opacity-60 hover:opacity-100",
                  )}
                  onClick={() => go(i)}
                >
                  <AlbumPhotoTile
                    photo={album.photos?.[i]}
                    size="small"
                    index={i + position}
                    alt=""
                    iconSize={20}
                    shardClassName="h-4 w-5"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </LightboxControls>
  );
}
