import type { MetadataRoute } from "next";
import { ARCHIVE_YEARS } from "@/components/news/ArchivePage";
import { PETRKLIC_YEARS } from "@/components/petrklic/ArchivePage";
import { events } from "@/content/news";
import { links, SITE_URL } from "@/content/site";
import { archiveYears, archiveYearHref } from "@/lib/news/archive";
import { eventHref } from "@/lib/news/events";
import { archiveYearHref as petrklicYearHref } from "@/lib/petrklic/issues";

// `/sitemap.xml`, written by `next build` like the pages. Every indexable page, as absolute URLs on SITE_URL.
// The Aktuality filter pages (`/aktuality/tyden/`, …) are left out: they re-list the events of `/aktuality/`.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    links.home,
    links.news,
    ...events.map(eventHref),
    ...archiveYears(ARCHIVE_YEARS).map((y) => archiveYearHref(y.slug)),
    links.services,
    links.calendar,
    links.gallery,
    links.petrklic,
    petrklicYearHref(),
    ...PETRKLIC_YEARS.map((y) => petrklicYearHref(y.year)),
    links.contacts,
  ];
  return paths.map((path) => ({ url: `${SITE_URL}${path}` }));
}
