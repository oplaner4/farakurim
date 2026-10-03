"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CarouselSlide } from "@/content/types";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

const AUTOPLAY_MS = 6000;
const BASE = "/assets/img/pozadi";

const arrowClass =
  "pointer-events-auto flex size-11 cursor-pointer items-center justify-center rounded-full bg-overlay text-ink hover:bg-bg hover:text-blue-ink md:size-12";

export function HeroCarousel({ slides }: { slides: CarouselSlide[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  // Mirrors `active` for the resize observer; written only from the scroll handler.
  const activeRef = useRef(0);
  const [paused, setPaused] = useState(false);
  // Autoplay stops for good once the visitor takes control.
  const [stopped, setStopped] = useState(false);
  const count = slides.length;

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const target = (index + count) % count;
      track.scrollTo({ left: target * track.clientWidth });
    },
    [count],
  );

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    activeRef.current = Math.round(track.scrollLeft / track.clientWidth);
    setActive(activeRef.current);
  };

  // Keep the current slide in place when the track width changes (rotation, window resize).
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(() => {
      track.scrollTo({ left: activeRef.current * track.clientWidth, behavior: "instant" });
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (stopped || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") goTo(active + 1);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [active, paused, stopped, goTo]);

  const userGoTo = (index: number) => {
    setStopped(true);
    goTo(index);
  };

  return (
    <section
      className="relative isolate h-75 overflow-hidden bg-blue-tint-alt md:h-105 lg:h-135 lg:min-w-0 lg:grow-999 lg:basis-140 lg:rounded-32"
      aria-label="Fotografie z farnosti"
      aria-roledescription="carousel"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain motion-safe:scroll-smooth"
        onScroll={onScroll}
        onTouchStart={() => setStopped(true)}
        onWheel={(e) => {
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) setStopped(true);
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.file}
            className="h-full shrink-0 basis-full snap-start snap-always"
            role="group"
            aria-roledescription="snímek"
            aria-label={`${i + 1} z ${count}`}
            aria-hidden={i !== active}
          >
            <picture className="block h-full">
              <source media="(min-width: 75rem)" srcSet={`${BASE}/lg/${slide.file}`} />
              <source media="(min-width: 48rem)" srcSet={`${BASE}/md/${slide.file}`} />
              <img
                src={`${BASE}/sm/${slide.file}`}
                alt={slide.alt}
                width={768}
                height={576}
                className="size-full object-cover"
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                decoding="async"
              />
            </picture>
          </div>
        ))}
      </div>

      <span
        className="pointer-events-none absolute top-0 left-0 hidden h-27.5 w-35 bg-green shard-tl lg:block"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute top-0 left-0 hidden h-37.5 w-17.5 bg-orange shard-tl lg:block"
        aria-hidden="true"
      />

      {/* Mobile/tablet: arrows either side of the dots, above the overlapping card. Desktop: dots left, arrows right. */}
      <div className="pointer-events-none absolute inset-x-4 bottom-15 flex items-center justify-between gap-2 md:inset-x-8 md:bottom-25 lg:inset-x-6 lg:bottom-6">
        <button
          type="button"
          className={clsx(arrowClass, "lg:ml-auto")}
          aria-label="Předchozí fotografie"
          onClick={() => userGoTo(active - 1)}
        >
          <ChevronLeftIcon />
        </button>
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-full bg-overlay px-1.5 md:px-2 lg:-order-1 lg:px-2.5">
          {slides.map((slide, i) => (
            <button
              key={slide.file}
              type="button"
              className="group flex h-9 w-7 cursor-pointer items-center justify-center md:h-10 md:w-7.5 lg:h-11"
              aria-label={`Fotografie ${i + 1}`}
              aria-current={i === active ? "true" : undefined}
              onClick={() => userGoTo(i)}
            >
              <span className="h-2 w-2 rounded-4 bg-dot-off transition-[width,background-color] duration-250 group-hover:bg-blue-ink group-aria-[current=true]:w-6 group-aria-[current=true]:bg-dot-on" />
            </button>
          ))}
        </div>
        <button type="button" className={arrowClass} aria-label="Další fotografie" onClick={() => userGoTo(active + 1)}>
          <ChevronRightIcon />
        </button>
      </div>
    </section>
  );
}
