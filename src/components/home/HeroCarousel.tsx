"use client";

import { clsx } from "clsx";
import type { CarouselSlide } from "@/content/types/home";
import { useSnapCarousel } from "@/hooks/use-snap-carousel";
import { ArrowButton } from "@/components/ui/ArrowButton";

const BASE = "/assets/img/pozadi";

/** The homepage photos one at a time (design/DESIGN.md §4.2): swipe, the arrows, the dots, and autoplay. */
export function HeroCarousel({ slides }: { slides: CarouselSlide[] }) {
  const count = slides.length;
  const { view, regionProps, trackProps, prev, next, goTo } = useSnapCarousel<HTMLDivElement>(count);
  const active = view?.first ?? 0;

  return (
    <section
      className="relative isolate h-75 overflow-hidden bg-blue-tint-alt md:h-105 lg:h-135 lg:min-w-0 lg:grow-999 lg:basis-140 lg:rounded-32"
      aria-label="Fotografie z farnosti"
      aria-roledescription="carousel"
      {...regionProps}
    >
      <div
        {...trackProps}
        className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain motion-safe:scroll-smooth"
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

      {/*
       * Mobile: one small dark pill centred above the overlapping card, the dots only an indicator (§4.2). Tablet:
       * arrows either side of the dot pill. Desktop: dots left, arrows right.
       */}
      <div className="absolute flex items-center max-md:bottom-14 max-md:left-1/2 max-md:-translate-x-1/2 max-md:gap-0.5 max-md:rounded-full max-md:bg-scrim max-md:px-0.5 max-md:backdrop-blur-6 md:pointer-events-none md:inset-x-8 md:bottom-25 md:justify-between md:gap-2 lg:inset-x-6 lg:bottom-6">
        <ArrowButton
          direction="prev"
          variant="hero"
          size="hero"
          className="pointer-events-auto lg:ml-auto"
          aria-label="Předchozí fotografie"
          onClick={prev}
        />
        <span aria-hidden="true" className="flex items-center gap-1.25 md:hidden">
          {slides.map((slide, i) => (
            <span
              key={slide.file}
              className={clsx(
                "h-1.5 rounded-3 transition-[width,background-color] duration-250",
                i === active ? "w-4 bg-white" : "w-1.5 bg-white/50",
              )}
            />
          ))}
        </span>
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-full bg-overlay px-2 max-md:hidden lg:-order-1 lg:px-2.5">
          {slides.map((slide, i) => (
            <button
              key={slide.file}
              type="button"
              className="group flex h-10 w-7.5 cursor-pointer items-center justify-center lg:h-11"
              aria-label={`Fotografie ${i + 1}`}
              aria-current={i === active ? "true" : undefined}
              onClick={() => goTo(i)}
            >
              <span className="h-2 w-2 rounded-4 bg-dot-off transition-[width,background-color] duration-250 group-hover:bg-blue-ink group-aria-[current=true]:w-6 group-aria-[current=true]:bg-dot-on" />
            </button>
          ))}
        </div>
        <ArrowButton
          direction="next"
          variant="hero"
          size="hero"
          className="pointer-events-auto"
          aria-label="Další fotografie"
          onClick={next}
        />
      </div>
    </section>
  );
}
