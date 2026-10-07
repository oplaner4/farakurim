"use client";

import { useEffect, useState } from "react";

/**
 * True once the page has loaded and the browser is idle, false on the server and during hydration. A heavy
 * third-party embed waits for it, so it doesn't compete with the page's own content (the Kontakty map, about 1.8 MB).
 */
export function useAfterPageLoad(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let idle: number | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      // Safari has no requestIdleCallback.
      if ("requestIdleCallback" in window) idle = requestIdleCallback(() => setReady(true), { timeout: 2000 });
      else timeout = setTimeout(() => setReady(true), 200);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      window.removeEventListener("load", schedule);
      if (idle !== undefined) cancelIdleCallback(idle);
      clearTimeout(timeout);
    };
  }, []);
  return ready;
}
