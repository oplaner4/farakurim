"use client";

import { useSyncExternalStore } from "react";
import { forgetPushedHash, HASH_EVENT } from "@/lib/shared/location-hash";

function subscribe(onChange: () => void) {
  const onPopState = () => {
    forgetPushedHash();
    onChange();
  };
  window.addEventListener("popstate", onPopState);
  window.addEventListener("hashchange", onChange);
  window.addEventListener(HASH_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onPopState);
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener(HASH_EVENT, onChange);
  };
}

/** The URL hash (`"#plakat"`, `""` without one); empty in the prerendered HTML and during hydration. */
export function useLocationHash(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => "",
  );
}
