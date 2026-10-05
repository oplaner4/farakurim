"use client";

import { type KeyboardEvent, type WheelEvent, useCallback, useEffect, useRef, useState } from "react";

const AUTOPLAY_MS = 6000;

/** The items in view, 0-based and inclusive. */
export type SnapView = { first: number; last: number };

/**
 * A scroll-snap track of equally wide items (the photo carousels of §4.5 and §19.1): swipe and scroll work
 * natively, `prev`/`next` move by one page (the track's width) and wrap around. `view` is measured from the
 * scroll position, so it is `null` until the track has rendered in the browser; `goTo` scrolls to one item (the
 * hero's dots). The first item in view stays in place when the track's width changes (rotation, window resize).
 *
 * It turns a page every few seconds while it is on screen, unless `paused`, hovered or focused, and never under
 * `prefers-reduced-motion`; autoplay stops for good once the visitor swipes or uses the arrows. Spread
 * `regionProps` on the carousel and `trackProps` on the track.
 */
export function useSnapCarousel<T extends HTMLElement>(count: number, { paused = false } = {}) {
  const trackRef = useRef<T>(null);
  const [view, setView] = useState<SnapView | null>(null);
  // Mirrors `view.first` for the resize observer; written only from `measure`.
  const firstRef = useRef(0);
  const [onScreen, setOnScreen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [stopped, setStopped] = useState(false);

  const measure = useCallback(() => {
    const track = trackRef.current;
    const item = track?.firstElementChild as HTMLElement | null;
    if (!track || !item || item.offsetWidth === 0) return;
    const first = Math.min(Math.round(track.scrollLeft / item.offsetWidth), count - 1);
    const perPage = Math.max(1, Math.round(track.clientWidth / item.offsetWidth));
    const last = Math.min(first + perPage, count) - 1;
    firstRef.current = first;
    setView((v) => (v?.first === first && v.last === last ? v : { first, last }));
  }, [count]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    measure();
    const observer = new ResizeObserver(() => {
      const item = track.firstElementChild as HTMLElement | null;
      if (item) track.scrollTo({ left: firstRef.current * item.offsetWidth, behavior: "instant" });
      measure();
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.5 });
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  const go = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const end = track.scrollWidth - track.clientWidth;
    if (direction > 0 && track.scrollLeft >= end - 1) track.scrollTo({ left: 0 });
    else if (direction < 0 && track.scrollLeft <= 1) track.scrollTo({ left: end });
    else track.scrollBy({ left: direction * track.clientWidth });
  }, []);

  // Restarted on every page turn, so each page stays the full interval.
  const first = view?.first;
  useEffect(() => {
    if (count < 2 || stopped || paused || hovered || focused || !onScreen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") go(1);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [count, stopped, paused, hovered, focused, onScreen, first, go]);

  const userGo = (direction: 1 | -1) => {
    setStopped(true);
    go(direction);
  };

  const goTo = (index: number) => {
    const track = trackRef.current;
    const item = track?.firstElementChild as HTMLElement | null;
    if (!track || !item) return;
    setStopped(true);
    track.scrollTo({ left: index * item.offsetWidth });
  };

  /** Arrow keys anywhere in the carousel turn the page. */
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    userGo(event.key === "ArrowRight" ? 1 : -1);
  };

  const regionProps = {
    onKeyDown,
    onPointerEnter: () => setHovered(true),
    onPointerLeave: () => setHovered(false),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };

  const trackProps = {
    ref: trackRef,
    onScroll: measure,
    onTouchStart: () => setStopped(true),
    onWheel: (event: WheelEvent) => {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) setStopped(true);
    },
  };

  return { view, regionProps, trackProps, prev: () => userGo(-1), next: () => userGo(1), goTo };
}
