"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { MATOMO_SITE_ID, MATOMO_URL } from "@/content/site";
import { type MatomoCommand, matomoConfig, pageViewCommands, setupCommands, trackedUrl } from "@/lib/layout/analytics";

declare global {
  interface Window {
    _paq?: MatomoCommand[];
  }
}

const config = matomoConfig(MATOMO_URL, MATOMO_SITE_ID);

/**
 * Anonymous, cookieless statistics (Matomo on statistiky.farakurim.cz): one page view per App Router navigation,
 * downloads and outlinks through link tracking. Does nothing when the Matomo variables are not set.
 */
export function MatomoTracker() {
  const pathname = usePathname();
  const previousUrl = useRef<string | undefined>(undefined);

  // matomo.js creates its tracker only from the setup commands already queued when it loads, so it is injected
  // here, after them (next/script could load it first). The check keeps StrictMode's second run from adding it twice.
  useEffect(() => {
    if (!config || document.querySelector(`script[src="${config.scriptUrl}"]`)) return;
    (window._paq ??= []).push(...setupCommands(config));
    const script = document.createElement("script");
    script.async = true;
    script.src = config.scriptUrl;
    document.head.append(script);
  }, []);

  useEffect(() => {
    if (!config) return;
    // A task after the commit, so document.title is the new page's (a timeout, not an animation frame: frames don't
    // run in background tabs). Cancelled on cleanup, so StrictMode's second run in dev doesn't count the page twice.
    const timer = setTimeout(() => {
      const url = trackedUrl(window.location.origin, pathname);
      (window._paq ??= []).push(...pageViewCommands(url, document.title, previousUrl.current));
      previousUrl.current = url;
    });
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
