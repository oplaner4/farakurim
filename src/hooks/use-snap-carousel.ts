"use client";

import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";

/** The items in view, 0-based and inclusive. */
export type SnapView = { first: number; last: number };

/**
 * A scroll-snap track of equally wide items (the photo carousels of §4.5 and §19.1): swipe and scroll work
 * natively, `prev`/`next` move by one page (the track's width) and wrap around. `view` is measured from the
 * scroll position, so it is `null` until the track has rendered in the browser.
 */
export function useSnapCarousel<T extends HTMLElement>(count: number) {
  const trackRef = useRef<T>(null);
  const [view, setView] = useState<SnapView | null>(null);

  const measure = useCallback(() => {
    const track = trackRef.current;
    const item = track?.firstElementChild as HTMLElement | null;
    if (!track || !item || item.offsetWidth === 0) return;
    const first = Math.min(Math.round(track.scrollLeft / item.offsetWidth), count - 1);
    const perPage = Math.max(1, Math.round(track.clientWidth / item.offsetWidth));
    const last = Math.min(first + perPage, count) - 1;
    setView((v) => (v?.first === first && v.last === last ? v : { first, last }));
  }, [count]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure]);

  const go = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const end = track.scrollWidth - track.clientWidth;
    if (direction > 0 && track.scrollLeft >= end - 1) track.scrollTo({ left: 0 });
    else if (direction < 0 && track.scrollLeft <= 1) track.scrollTo({ left: end });
    else track.scrollBy({ left: direction * track.clientWidth });
  };

  /** Arrow keys anywhere in the carousel turn the page. */
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    go(event.key === "ArrowRight" ? 1 : -1);
  };

  return { trackRef, view, onScroll: measure, onKeyDown, prev: () => go(-1), next: () => go(1) };
}
