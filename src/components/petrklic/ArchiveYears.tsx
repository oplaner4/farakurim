"use client";

import { Children, useState, type ReactNode } from "react";
import { ARCHIVE_YEARS_STEP } from "@/lib/petrklic";
import { useFocusAfterChange } from "@/lib/use-focus-after-change";
import { buttonLink } from "@/components/ui/ButtonLink";

type Props = {
  /** One `ArchiveYearBlock` per year, newest first. */
  children: ReactNode;
  /** Heading IDs of the year blocks, in the same order, to focus the first newly shown year. */
  headingIds: string[];
};

/**
 * The "Vše" archive (design/DESIGN.md §18.1 (4)): the newest years first, "Načíst starší ročníky" adds the next
 * ones. Without JS the older years stay reachable through the year links.
 */
export function ArchiveYears({ children, headingIds }: Props) {
  const blocks = Children.toArray(children);
  const [count, setCount] = useState(ARCHIVE_YEARS_STEP);
  const focusLater = useFocusAfterChange(count);

  const loadMore = () => {
    focusLater(headingIds[count]);
    setCount((c) => c + ARCHIVE_YEARS_STEP);
  };

  return (
    <>
      {blocks.slice(0, count)}
      {count < blocks.length && (
        <button
          type="button"
          onClick={loadMore}
          data-js-only
          className={buttonLink({ variant: "outline-orange", className: "mt-2 px-7 md:self-center lg:mt-4" })}
        >
          Načíst starší ročníky
        </button>
      )}
    </>
  );
}
