/**
 * Commands for the Matomo JavaScript tracker (`window._paq`), self-hosted at statistiky.farakurim.cz. Cookieless:
 * `disableCookies` comes first, so the tracker never writes cookies or storage. Pages are recorded by pathname only.
 */

export type MatomoCommand = [string, ...unknown[]];

export type MatomoConfig = { trackerUrl: string; scriptUrl: string; siteId: string };

/** The tracker's endpoints, or `undefined` (tracking off) when the URL or the site ID is missing or blank. */
export function matomoConfig(url: string | undefined, siteId: string | undefined): MatomoConfig | undefined {
  const base = url?.trim().replace(/\/+$/, "");
  const id = siteId?.trim();
  if (!base || !id) return undefined;
  return { trackerUrl: `${base}/matomo.php`, scriptUrl: `${base}/matomo.js`, siteId: id };
}

/** Queued once, before the first page view. */
export function setupCommands(config: MatomoConfig): MatomoCommand[] {
  return [["disableCookies"], ["setTrackerUrl", config.trackerUrl], ["setSiteId", config.siteId]];
}

/** The URL Matomo records for a page: no query string (filters, search) and no hash (the lightbox). */
export function trackedUrl(origin: string, pathname: string): string {
  return origin + pathname.replace(/[?#].*$/, "");
}

/**
 * One page view. `referrer` is the previous page's tracked URL on client-side navigations, `undefined` on the first
 * page (Matomo then reads `document.referrer`). `enableLinkTracking` again picks up the new page's download and
 * outlink links, as Matomo's SPA guide recommends.
 */
export function pageViewCommands(url: string, title: string, referrer: string | undefined): MatomoCommand[] {
  return [
    ...(referrer ? [["setReferrerUrl", referrer] as MatomoCommand] : []),
    ["setCustomUrl", url],
    ["setDocumentTitle", title],
    ["trackPageView"],
    ["enableLinkTracking"],
  ];
}
