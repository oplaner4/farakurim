import { clsx } from "clsx";
import Link from "next/link";
import { archiveYearHref } from "@/lib/petrklic/issues";

type Props = {
  years: number[];
  /** The current page's year; none on "Vše". */
  active?: number;
};

/**
 * Year links of the Petrklíč archive (design/DESIGN.md §18.1 (2)): each year is its own static page. Mobile: one
 * scrollable row bleeding to the screen edges. Tablet and desktop: wrapping.
 */
export function ArchiveYearLinks({ years, active }: Props) {
  const items = [{ label: "Vše", year: undefined }, ...years.map((year) => ({ label: String(year), year }))];
  return (
    <nav aria-label="Rok">
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
        {items.map(({ label, year }) => {
          const current = year === active;
          return (
            <li key={label} className="shrink-0">
              <Link
                href={archiveYearHref(year)}
                scroll={false}
                aria-current={current ? "page" : undefined}
                className={clsx(
                  "flex min-h-11 items-center rounded-full border-thin px-4 text-15 font-bold no-underline",
                  current
                    ? "border-orange bg-orange text-on-orange hover:text-on-orange"
                    : "border-line bg-surface text-ink hover:border-orange hover:text-ink",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
