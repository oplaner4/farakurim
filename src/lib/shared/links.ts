import { SITE_URL } from "@/content/site";

/** `tel:` link of a Czech phone number written with spaces ("541 230 183"). */
export const telHref = (phone: string) => `tel:+420${phone.replace(/\s/g, "")}`;

/** Mapy.cz search. */
export const mapHref = (query: string) => `https://mapy.cz/zakladni?q=${encodeURIComponent(query)}`;

const SITE_HOST = new URL(SITE_URL).hostname;

/** An absolute http(s) link to another site; the parish's own domain, relative links, mailto: and tel: are not. */
export function isExternalHref(href: string | undefined): boolean {
  if (!href || !/^https?:\/\//i.test(href)) return false;
  return new URL(href).hostname.replace(/^www\./, "") !== SITE_HOST;
}

/** Spread on an `<a>` that always leads to another site (Mapy.cz): it opens in a new tab. */
export const NEW_TAB = { target: "_blank", rel: "noopener noreferrer" } as const;

/** Spread on an `<a>` whose href may lead elsewhere: external links open in a new tab. */
export const externalLinkAttrs = (href: string | undefined) => (isExternalHref(href) ? NEW_TAB : {});

/** The same for links inside content HTML (Aktuality, ohlášky). */
export const withExternalLinkTargets = (html: string) =>
  html.replace(/<a\s([^>]*?)href="([^"]*)"([^>]*)>/g, (tag, before: string, href: string, after: string) =>
    isExternalHref(href) && !/\starget=/.test(tag)
      ? `<a ${before}href="${href}"${after} target="_blank" rel="noopener noreferrer">`
      : tag,
  );
