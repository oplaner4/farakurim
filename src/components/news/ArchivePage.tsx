import { events } from "@/content/news";
import { links } from "@/content/site";
import { BUILD_TIME } from "@/lib/build-time";
import { fileType } from "@/lib/czech";
import { eventHref, latestArchiveYear } from "@/lib/news";
import { pragueDate } from "@/lib/prague";
import { type ArchiveItem, NewsArchive } from "./NewsArchive";
import { PageHeading } from "@/components/ui/PageHeading";
import { SiteHeader } from "@/components/layout/SiteHeader";

/** Year of the default archive page, fixed by the build (the year pages are static). */
export const ARCHIVE_LATEST_YEAR = latestArchiveYear(events, pragueDate(BUILD_TIME));

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
      <SiteHeader currentHref={links.news} />
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
        <NewsArchive items={items} latest={ARCHIVE_LATEST_YEAR} yearSlug={yearSlug} renderedAt={BUILD_TIME} />
        {/* Without JS, every row is shown, and the search (which filters in the browser) is hidden. */}
        <noscript>
          <style>
            {"[data-more]{display:flex;flex-direction:column}[data-load-more],[data-js-only]{display:none}"}
          </style>
        </noscript>
      </main>
    </>
  );
}
