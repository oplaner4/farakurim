"use client";

import { useSyncExternalStore } from "react";
import { guessCalendarApp, isCalendarApp, type CalendarApp } from "@/lib/calendar/subscribe";

const STORAGE_KEY = "calendar-app";
const listeners = new Set<() => void>();
/** This page's choice, for a browser that blocks storage. */
let chosen: CalendarApp | null = null;

function readStored(): CalendarApp | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isCalendarApp(stored) ? stored : null;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // A choice made in another tab.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

const snapshot = () => readStored() ?? chosen ?? guessCalendarApp(navigator.userAgent);

function choose(app: CalendarApp) {
  chosen = app;
  try {
    localStorage.setItem(STORAGE_KEY, app);
  } catch {
    // Storage blocked: `chosen` keeps the choice until the page is left.
  }
  for (const listener of listeners) listener();
}

/**
 * The calendar app of "Kalendář v telefonu" (design/DESIGN.md §16.6) and its setter: the visitor's remembered choice,
 * otherwise a guess from the device. Google in the prerendered HTML and during hydration.
 */
export function useCalendarApp(): [CalendarApp, (app: CalendarApp) => void] {
  return [useSyncExternalStore(subscribe, snapshot, () => "google" as const), choose];
}
