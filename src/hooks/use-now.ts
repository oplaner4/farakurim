"use client";

import { useSyncExternalStore } from "react";
import type { IsoDate } from "@/content/types/shared";
import { pragueDate } from "@/lib/shared/prague";

// One shared clock for every time-dependent component. The prerendered HTML is built with the
// build-time timestamp; after hydration React switches to the visitor's real time without a
// hydration mismatch (getServerSnapshot vs getSnapshot).

const TICK_MS = 20_000;

let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function tick() {
  now = Date.now();
  listeners.forEach((l) => l());
}

function onVisibility() {
  if (document.visibilityState === "visible") tick();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    now = Date.now();
    timer = setInterval(tick, TICK_MS);
    document.addEventListener("visibilitychange", onVisibility);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    }
  };
}

/** Current time in ms; equals `renderedAt` during prerender and hydration. */
export function useNow(renderedAt: number): number {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => renderedAt,
  );
}

// The date only changes once a day; cache it so each tick doesn't re-format it.
let todayFor = NaN;
let today = "";
function getToday(): IsoDate {
  if (todayFor !== now) {
    todayFor = now;
    today = pragueDate(now);
  }
  return today;
}

/**
 * Today's Prague date. A derived snapshot: subscribers re-render when the date changes,
 * not on every clock tick.
 */
export function useToday(renderedAt: number): IsoDate {
  return useSyncExternalStore(subscribe, getToday, () => pragueDate(renderedAt));
}

const noopSubscribe = () => () => {};

/** False in the prerendered HTML and during hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
