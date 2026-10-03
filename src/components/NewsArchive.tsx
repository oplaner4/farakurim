"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { type ChangeEvent, type FormEvent, type MouseEvent, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { links } from "@/content/site";
import type { NewsEvent } from "@/content/types";
import { formatCompactDate, formatMonthYear, plural } from "@/lib/czech";
import {
  ARCHIVE_PAGE_SIZE,
  archivedEvents,
  archiveYearHref,
  archiveYears,
  groupByMonth,
  parsePage,
  searchEvents,
} from "@/lib/news";
import { useToday } from "@/lib/use-now";
import { pushQueryParam, replaceQueryParams, useQueryParam } from "@/lib/use-query-param";
import { ButtonLink } from "./ButtonLink";
import { ChevronLeftIcon, FileIcon, SearchIcon } from "./icons";

/** What a row needs; the page passes only these fields to the client. */
export type ArchiveItem = Pick<NewsEvent, "id" | "title" | "start" | "end" | "time" | "place" | "archiveHidden"> & {
  href: string;
  /** First attachment: "Plakát" + "PDF". */
  file?: { label: string; type: string };
};

const QUERY_PARAM = "q";
const PAGE_PARAM = "strana";
const SEARCH_DELAY_MS = 250;

const rowAnchor = (id: string) => `archiv-${id}`;

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
 * and paging. Every row of the year is in the HTML; rows beyond the current page are hidden and revealed
 * by "Načíst starší" (without JS, a <noscript> style on the page shows them all and hides the search).
 */
export function NewsArchive({ items, latest, yearSlug, renderedAt }: Props) {
  const today = useToday(renderedAt);
  const rawQuery = useQueryParam(QUERY_PARAM) ?? "";
  const query = rawQuery.trim();
  const page = parsePage(useQueryParam(PAGE_PARAM));
  // The input shows what is typed until the debounced search writes it to the URL.
  const [draft, setDraft] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const archived = archivedEvents(items, today);
  const years = archiveYears(latest).map((y) => ({ ...y, count: archived.filter(y.matches).length }));
  const year = years.find((y) => y.slug === yearSlug) ?? years[0];
  const matching = query ? searchEvents(archived, query) : archived.filter(year.matches);
  const groups = groupByMonth(matching);
  const position = new Map(matching.map((item, i) => [item.id, i]));
  const shownCount = Math.min(matching.length, page * ARCHIVE_PAGE_SIZE);
  const countLabel = query
    ? `Nalezeno ${matching.length} ${plural(matching.length, ["akce", "akce", "akcí"])}`
    : `Zobrazeno ${shownCount} ${plural(shownCount, ["akce", "akce", "akcí"])}`;

  function search(value: string) {
    clearTimeout(timer.current);
    replaceQueryParams({ [QUERY_PARAM]: value || null, [PAGE_PARAM]: null });
    setDraft(null);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const { value } = e.target;
    setDraft(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(value), SEARCH_DELAY_MS);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    search(draft ?? rawQuery);
  }

  function clearSearch() {
    search("");
    input.current?.focus();
  }

  function loadMore(e: MouseEvent<HTMLAnchorElement>) {
    // Let modified clicks open the link in a new tab or window.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const firstNew = matching[shownCount];
    flushSync(() => pushQueryParam(PAGE_PARAM, String(page + 1)));
    document.getElementById(rowAnchor(firstNew.id))?.focus();
  }

  const moreHref = `?${new URLSearchParams({ ...(query && { [QUERY_PARAM]: rawQuery }), [PAGE_PARAM]: String(page + 1) })}`;
  const countProps = { label: countLabel, searching: query !== "", onClear: clearSearch };

  return (
    <div className="flex flex-col gap-6 md:gap-8 lg:flex-row lg:items-start lg:gap-12">
      {/* Mobile: stacked. Tablet: a surface panel, search beside the years. Desktop: side panel. */}
      <div className="flex flex-col gap-3 md:gap-3.5 md:rounded-24 md:bg-surface md:px-6 md:py-5 lg:shrink lg:grow lg:basis-84 lg:gap-6 lg:rounded-28 lg:p-7">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:gap-4 lg:flex-col lg:items-stretch lg:gap-6">
          <form
            role="search"
            action={links.newsArchive}
            onSubmit={onSubmit}
            data-js-only
            className="flex flex-col gap-3 md:shrink md:grow md:basis-75 md:gap-1.5 lg:basis-auto lg:gap-2"
          >
            <label htmlFor="hledat-v-archivu" className="text-14 font-bold lg:text-15">
              Hledat v archivu
            </label>
            <div className="relative flex items-center">
              <SearchIcon size={20} className="pointer-events-none absolute left-3.5 text-muted" />
              <input
                ref={input}
                id="hledat-v-archivu"
                type="search"
                name={QUERY_PARAM}
                value={draft ?? rawQuery}
                onChange={onChange}
                placeholder="např. pouť, koncert, Tišnov"
                className="min-h-12.5 w-full rounded-14 border-thin border-field-line bg-raised pr-4 pl-11 text-16 text-ink placeholder:text-muted"
              />
            </div>
          </form>

          <nav aria-labelledby="archiv-rok" className="flex flex-col gap-2">
            <span id="archiv-rok" className="text-15 font-bold max-lg:sr-only">
              Rok
            </span>
            <ul className="flex gap-2 lg:flex-col lg:gap-1.5">
              {years.map((y) => {
                const active = !query && y.slug === year.slug;
                return (
                  <li key={y.slug} className="max-md:flex-1">
                    <Link
                      href={archiveYearHref(y.slug)}
                      scroll={false}
                      aria-current={active ? "page" : undefined}
                      className={clsx(
                        "flex min-h-11 items-center justify-center gap-1.5 rounded-full border-thin px-3 text-15 font-bold no-underline",
                        "md:min-h-12.5 md:px-4.5 lg:min-h-12 lg:justify-between lg:rounded-14 lg:text-16",
                        active
                          ? "border-magenta bg-magenta text-white hover:text-white"
                          : "border-line bg-surface text-ink hover:border-magenta hover:text-ink",
                      )}
                    >
                      {y.label}
                      <span className={clsx("text-13 font-normal lg:text-14", active ? "text-white" : "text-muted")}>
                        {y.count}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        <ResultCount {...countProps} className="lg:hidden" />
        <BackLink className="max-lg:hidden" />
      </div>

      <div className="flex min-w-0 flex-col gap-6 md:gap-8 lg:shrink lg:grow-999 lg:basis-150 lg:gap-7">
        <ResultCount {...countProps} className="max-lg:hidden" />

        {matching.length === 0 ? (
          <p className="rounded-20 bg-surface px-5 py-8 text-center text-ink-2 md:rounded-24 md:px-6 md:py-10 lg:py-12">
            Nic jsme nenašli. Zkuste jiné slovo nebo rok.
          </p>
        ) : (
          <div className="flex flex-col gap-5 md:gap-6 lg:gap-7">
            {groups.map((group) => {
              const groupMore = position.get(group.events[0].id)! >= shownCount;
              const headingId = `archiv-${group.month}`;
              return (
                <section
                  key={group.month}
                  aria-labelledby={headingId}
                  data-more={groupMore || undefined}
                  className={clsx("flex flex-col", groupMore && "hidden")}
                >
                  <h2
                    id={headingId}
                    className="mb-1 text-18 font-bold text-magenta-ink md:mb-1.5 md:text-20 lg:mb-2 lg:text-22"
                  >
                    {formatMonthYear(group.month)}
                  </h2>
                  <ul>
                    {group.events.map((item) => {
                      const more = position.get(item.id)! >= shownCount;
                      return (
                        <li key={item.id} data-more={more || undefined} className={clsx(more && "hidden")}>
                          <ArchiveRow item={item} />
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        {/* Mobile: "Načíst starší", then back. Tablet: back on the left, the button on the right.
            Desktop: the button centred (back is in the side panel). */}
        <div className="flex flex-col gap-6 md:flex-row-reverse md:flex-wrap md:items-center md:justify-between md:gap-4 lg:justify-center">
          {shownCount < matching.length && (
            <ButtonLink
              href={moreHref}
              variant="outline-magenta"
              onClick={loadMore}
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

/** The whole row is one link to the detail page (§12.3). */
function ArchiveRow({ item }: { item: ArchiveItem }) {
  return (
    <a
      id={rowAnchor(item.id)}
      href={item.href}
      className="flex flex-wrap items-start gap-x-3 gap-y-0.5 border-t border-line py-3 text-ink no-underline hover:bg-surface hover:text-ink md:flex-nowrap md:items-center md:gap-4 md:px-2 md:py-3.5 lg:gap-5 lg:rounded-4 lg:px-3"
    >
      <span className="flex w-16 shrink-0 flex-col leading-snug md:w-24 lg:w-28">
        <span className="text-15 font-bold md:text-16 lg:text-17">{formatCompactDate(item.start, item.end)}</span>
        {item.time && <span className="text-13 text-muted md:text-14">{item.time}</span>}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-16 leading-card font-bold md:text-17 lg:text-18">{item.title}</span>
        <span className="text-13 text-muted md:text-14 lg:text-15">{item.place}</span>
      </span>
      {/* Mobile: under the place (indented by the date column). Tablet/desktop: a chip on the right. */}
      {item.file && (
        <span className="flex items-center gap-1 text-13 font-bold text-ink-2 max-md:w-full max-md:pl-19 md:shrink-0 md:gap-1.5 md:rounded-10 md:bg-surface md:px-3 md:py-1.5 md:text-14 md:whitespace-nowrap">
          <FileIcon size={15} className="shrink-0 text-magenta-ink" />
          {item.file.label} {item.file.type}
        </span>
      )}
    </a>
  );
}
