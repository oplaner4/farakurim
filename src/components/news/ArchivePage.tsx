import { events } from "@/content/news";
import { links } from "@/content/site";
import { BUILD_TIME } from "@/lib/shared/build-time";
import { fileType } from "@/lib/shared/czech";
import { archiveYearList } from "@/lib/news/archive";
import { eventHref } from "@/lib/news/events";
import { pragueDate } from "@/lib/shared/prague";
import type { ArchiveItem } from "./ArchiveRow";
import { NewsArchive } from "./NewsArchive";
import { PageHeading } from "@/components/ui/PageHeading";
import { SiteHeader } from "@/components/layout/SiteHeader";

/** The year buttons (newest first), fixed by the build: each is a static page. */
export const ARCHIVE_YEARS = archiveYearList(events, pragueDate(BUILD_TIME));

// Only the fields of a row go to the client. Unfinished events are included: they move into the
// archive in the visitor's browser the day after they end.
const items: ArchiveItem[] = events.map((e) => {
  const file = e.attachments?.[0];
  return {
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    time: e.time,
    place: e.place,
    archiveHidden: e.archiveHidden,
    href: eventHref(e),
    file: file && { label: file.label, type: fileType(file.file) },
  };
});

/** Archiv aktualit (design/DESIGN.md §12), prerendered once per year button. */
export function ArchivePage({ yearSlug }: { yearSlug: string }) {
  return (
    <>
      <SiteHeader currentHref={links.news} pageHref={links.newsArchive} />
      <main
        id="obsah"
        className="container-page flex flex-col gap-6 pt-5 pb-12 md:gap-8 md:pt-7 md:pb-14 lg:gap-10 lg:pt-9 lg:pb-20"
      >
        <PageHeading
          title="Archiv aktualit"
          crumb="Archiv"
          parents={[{ label: "Aktuality", href: links.news }]}
          intro="Proběhlé akce, pozvánky a plakáty farnosti."
          size="medium"
          color="magenta"
        />
        <NewsArchive items={items} years={ARCHIVE_YEARS} yearSlug={yearSlug} renderedAt={BUILD_TIME} />
        {/* Without JS, every row and "Rok 2025" are shown, and the search (which filters in the browser) is hidden. */}
        <noscript>
          <style>
            {
              "[data-more]{display:flex;flex-direction:column}[data-after-more]{display:flex}[data-load-more],[data-js-only]{display:none}"
            }
          </style>
        </noscript>
      </main>
    </>
  );
}
