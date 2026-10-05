"use client";

import { clsx } from "clsx";
import { type SetValues, useQueryStates } from "nuqs";
import { Suspense } from "react";
import { links } from "@/content/site";
import { archiveListing, archiveYearHref } from "@/lib/news/archive";
import { archiveHref, archiveParams, archiveUrlKeys } from "@/lib/shared/query-params";
import { useLoadMore } from "@/hooks/use-load-more";
import { useToday } from "@/hooks/use-now";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ArrowRightIcon, ChevronLeftIcon } from "@/components/ui/icons";
import { ArchiveFilters } from "./ArchiveFilters";
import { ArchiveResults } from "./ArchiveResults";
import { type ArchiveItem, rowAnchor } from "./ArchiveRow";
import { useArchiveSearch } from "@/hooks/use-archive-search";

function BackLink({ className }: { className?: string }) {
  return (
    <a href={links.news} className={clsx("flex min-h-11 items-center gap-2 self-start font-bold", className)}>
      <ChevronLeftIcon size={18} />
      Zpět na aktuality
    </a>
  );
}

type CountProps = { label: string; searching: boolean; onClear: () => void; className: string };

/** "Zobrazeno 21 akcí" (or "Nalezeny 3 akce") and, while searching, "Zrušit hledání". Rendered once per layout, the other is hidden. */
function ResultCount({ label, searching, onClear, className }: CountProps) {
  return (
    <div className={clsx("flex min-h-7 items-center justify-between gap-2", className)}>
      <p aria-live="polite" className="text-14 text-muted md:text-15">
        {label}
      </p>
      {searching && (
        <button
          type="button"
          onClick={onClear}
          className="min-h-11 cursor-pointer px-1 text-14 font-bold text-blue-ink hover:text-blue-ink-hover md:text-15"
        >
          Zrušit hledání
        </button>
      )}
    </div>
  );
}

/** The list column, where "Rok 2025" lands. */
const LIST_ID = "vypis";

type Props = {
  items: ArchiveItem[];
  /** Years of the year buttons, newest first (`archiveYearList`), fixed at build time. */
  years: number[];
  /** This page's year button. */
  yearSlug: string;
  renderedAt: number;
};

/**
 * Archiv aktualit (design/DESIGN.md §12): search, year links (static pages), count, rows grouped by month
 * and paging. The prerendered HTML is the year's first page without a search (the Suspense fallback);
 * `?q=` and `?strana=` replace it after hydration.
 */
export function NewsArchive(props: Props) {
  return (
    <Suspense fallback={<NewsArchiveView {...props} rawQuery="" page={1} />}>
      <NewsArchiveFromUrl {...props} />
    </Suspense>
  );
}

function NewsArchiveFromUrl(props: Props) {
  const [{ query, page }, setParams] = useQueryStates(archiveParams, { urlKeys: archiveUrlKeys });
  return <NewsArchiveView {...props} rawQuery={query} page={page} setParams={setParams} />;
}

/**
 * Every row of the year is in the HTML; rows beyond `page` are hidden and revealed by "Načíst další"
 * (without JS, a <noscript> style on the page shows them all and hides the search).
 */
function NewsArchiveView({
  items,
  years: yearList,
  yearSlug,
  renderedAt,
  rawQuery,
  page,
  setParams,
}: Props & { rawQuery: string; page: number; setParams?: SetValues<typeof archiveParams> }) {
  const today = useToday(renderedAt);
  const loadMore = useLoadMore(page, setParams && ((next) => setParams({ page: next }, { history: "push" })));
  const { value, search, inputRef, onChange, onSubmit, clear } = useArchiveSearch(rawQuery, setParams);
  const query = search.trim();
  const { years, year, previous, matching, groups, shownCount, countLabel } = archiveListing(items, {
    years: yearList,
    yearSlug,
    query,
    page,
    today,
  });

  const moreHref = archiveHref({ query: query && search, page: page + 1 });
  const countProps = { label: countLabel, searching: query !== "", onClear: clear };

  return (
    <div className="flex flex-col gap-6 md:gap-8 lg:flex-row lg:items-start lg:gap-12">
      {/* Mobile: stacked. Tablet: a surface panel, search beside the years. Desktop: side panel. */}
      <div className="flex flex-col gap-3 md:gap-3.5 md:rounded-24 md:bg-surface md:px-6 md:py-5 lg:shrink lg:grow lg:basis-84 lg:gap-6 lg:rounded-28 lg:p-7">
        <ArchiveFilters
          value={value}
          inputRef={inputRef}
          onChange={onChange}
          onSubmit={onSubmit}
          years={years}
          activeSlug={query ? undefined : year.slug}
        />
        <ResultCount {...countProps} className="lg:hidden" />
        <BackLink className="max-lg:hidden" />
      </div>

      <div
        id={LIST_ID}
        className="flex min-w-0 scroll-mt-4 flex-col gap-6 md:gap-8 lg:shrink lg:grow-999 lg:basis-150 lg:gap-7"
      >
        <ResultCount {...countProps} className="max-lg:hidden" />
        <ArchiveResults groups={groups} />

        {/* "Načíst další", or once the year is fully shown "Rok 2025", which opens the year before at the top
            of its list. Mobile: the button, then back. Tablet: back on the left, the button on the right.
            Desktop: the button centred (back is in the side panel). */}
        <div className="flex flex-col gap-6 md:flex-row-reverse md:flex-wrap md:items-center md:justify-between md:gap-4 lg:justify-center">
          {shownCount < matching.length && (
            <ButtonLink
              href={moreHref}
              variant="outline-magenta"
              onClick={(e) => loadMore(e, rowAnchor(matching[shownCount].id))}
              data-load-more
              className="md:px-7 lg:px-8"
            >
              Načíst další
            </ButtonLink>
          )}
          {previous && (
            <ButtonLink
              href={`${archiveYearHref(previous.slug)}#${LIST_ID}`}
              variant="outline-magenta"
              data-after-more={shownCount < matching.length || undefined}
              className={clsx("md:px-7 lg:px-8", shownCount < matching.length && "hidden")}
            >
              Rok {previous.label}
              <ArrowRightIcon size={18} />
            </ButtonLink>
          )}
          <BackLink className="lg:hidden" />
        </div>
      </div>
    </div>
  );
}
