"use client";

import { clsx } from "clsx";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { links } from "@/content/site";
import { archiveListing, parsePage } from "@/lib/news";
import { PAGE_PARAM, QUERY_PARAM } from "@/lib/query-params";
import { useLoadMore } from "@/hooks/use-load-more";
import { useToday } from "@/hooks/use-now";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { ArchiveFilters } from "./ArchiveFilters";
import { ArchiveResults } from "./ArchiveResults";
import { type ArchiveItem, rowAnchor } from "./ArchiveRow";
import { useArchiveSearch } from "./use-archive-search";

function BackLink({ className }: { className?: string }) {
  return (
    <a href={links.news} className={clsx("flex min-h-11 items-center gap-2 self-start font-bold", className)}>
      <ChevronLeftIcon size={18} />
      Zpět na aktuality
    </a>
  );
}

type CountProps = { label: string; searching: boolean; onClear: () => void; className: string };

/** "Zobrazeno 21 akcí" and, while searching, "Zrušit hledání". Rendered once per layout, the other is hidden. */
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

type Props = {
  items: ArchiveItem[];
  /** Year of the default page (`archiveYears`), fixed at build time. */
  latest: number;
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
  const params = useSearchParams();
  return (
    <NewsArchiveView {...props} rawQuery={params.get(QUERY_PARAM) ?? ""} page={parsePage(params.get(PAGE_PARAM))} />
  );
}

/**
 * Every row of the year is in the HTML; rows beyond `page` are hidden and revealed by "Načíst starší"
 * (without JS, a <noscript> style on the page shows them all and hides the search).
 */
function NewsArchiveView({
  items,
  latest,
  yearSlug,
  renderedAt,
  rawQuery,
  page,
}: Props & { rawQuery: string; page: number }) {
  const today = useToday(renderedAt);
  const query = rawQuery.trim();
  const loadMore = useLoadMore(page);
  const { value, inputRef, onChange, onSubmit, clear } = useArchiveSearch(rawQuery);
  const { years, year, matching, groups, shownCount, countLabel } = archiveListing(items, {
    latest,
    yearSlug,
    query,
    page,
    today,
  });

  const moreHref = `?${new URLSearchParams({ ...(query && { [QUERY_PARAM]: rawQuery }), [PAGE_PARAM]: String(page + 1) })}`;
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
          activeSlug={query ? undefined : year.button}
        />
        <ResultCount {...countProps} className="lg:hidden" />
        <BackLink className="max-lg:hidden" />
      </div>

      <div className="flex min-w-0 flex-col gap-6 md:gap-8 lg:shrink lg:grow-999 lg:basis-150 lg:gap-7">
        <ResultCount {...countProps} className="max-lg:hidden" />
        <ArchiveResults groups={groups} />

        {/* Mobile: "Načíst starší", then back. Tablet: back on the left, the button on the right.
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
              Načíst starší
            </ButtonLink>
          )}
          <BackLink className="lg:hidden" />
        </div>
      </div>
    </div>
  );
}
