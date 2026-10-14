import { describe, expect, it } from "vitest";
import { ARCHIVE_YEARS } from "@/components/news/ArchivePage";
import { groupPages } from "@/content/groups";
import { events } from "@/content/news";
import { plannedPages } from "@/content/planned-pages";
import { links, SITE_URL } from "@/content/site";
import { archiveYearHref, archiveYears } from "@/lib/news/archive";
import { eventHref } from "@/lib/news/events";
import sitemap from "./sitemap";

const urls = sitemap().map(({ url }) => url);
const paths = urls.map((url) => url.slice(SITE_URL.length));

/** Routes in `links` that are no page of the sitemap: noindex, served only by the server, or another site. */
const NOT_LISTED = [links.petrklicArchive, links.virtualTour, links.viraCz];

describe("sitemap", () => {
  it("lists every page of the site's own routes once, as absolute URLs", () => {
    const routes = Object.values(links).filter((href) => !NOT_LISTED.includes(href));
    expect(paths).toEqual(expect.arrayContaining(routes));
    expect(new Set(paths).size).toBe(paths.length);
    for (const url of urls) expect(url.startsWith(`${SITE_URL}/`), url).toBe(true);
  });

  it("lists every event detail page, archive year and group page", () => {
    expect(paths).toEqual(
      expect.arrayContaining([
        ...events.map(eventHref),
        ...archiveYears(ARCHIVE_YEARS).map((y) => archiveYearHref(y.slug)),
        ...groupPages.map((group) => group.href),
      ]),
    );
  });

  it("leaves out the noindex pages: the placeholders and the Archiv Petrklíče", () => {
    for (const page of plannedPages) expect(paths).not.toContain(page.path);
    expect(paths.filter((path) => path.startsWith(links.petrklicArchive))).toEqual([]);
  });
});
