import { clsx } from "clsx";
import { type ChangeEvent, type FormEvent, type RefObject, useEffect, useRef } from "react";
import Link from "next/link";
import { links } from "@/content/site";
import { archiveYearHref, type ArchiveYear } from "@/lib/news/archive";
import { QUERY_PARAM } from "@/lib/shared/query-params";
import { SearchIcon } from "@/components/ui/icons";

type Props = {
  /** The search field's text (`useArchiveSearch`). */
  value: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  years: (ArchiveYear & { count: number })[];
  /** The current year's button; none while searching (a search covers all years). */
  activeSlug?: string;
};

/**
 * Archive search and year links (§12.2). The search needs JS; the year links are static pages.
 * Mobile: stacked, the years in one scrolling row. Tablet: search beside the wrapping years. Desktop: stacked in
 * the side panel, the years as a vertical list.
 */
export function ArchiveFilters({ value, inputRef, onChange, onSubmit, years, activeSlug }: Props) {
  const yearsRef = useRef<HTMLUListElement>(null);

  // Mobile: bring the active year into the scrolling row (an older year sits off screen to the right).
  useEffect(() => {
    const list = yearsRef.current;
    const active = list?.querySelector<HTMLElement>("[aria-current]");
    if (!list || !active || list.scrollWidth <= list.clientWidth) return;
    list.scrollLeft = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2;
  }, [activeSlug]);

  return (
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
            ref={inputRef}
            id="hledat-v-archivu"
            type="search"
            name={QUERY_PARAM}
            value={value}
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
        <ul
          ref={yearsRef}
          className="relative -mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:p-0 lg:flex-col lg:gap-1.5"
        >
          {years.map((y) => {
            const active = y.slug === activeSlug;
            return (
              <li key={y.slug} className="flex-none">
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
  );
}
