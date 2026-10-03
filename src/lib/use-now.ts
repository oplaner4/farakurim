"use client";

import { useSyncExternalStore } from "react";

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

const noopSubscribe = () => () => {};

/** False in the prerendered HTML and during hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
