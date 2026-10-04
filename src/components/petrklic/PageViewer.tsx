"use client";

import { useState } from "react";
import type { PetrklicIssue } from "@/content/types/petrklic";
import { stepPage, viewerSpread } from "@/lib/petrklic/issues";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

type Props = {
  issue: PetrklicIssue & { pageImages: string[] };
};

const navButton =
  "flex size-11 items-center justify-center rounded-12 border-thin border-line bg-raised text-ink hover:border-orange disabled:opacity-40 disabled:hover:border-line";

/**
 * "Listujte přímo zde" (design/DESIGN.md §17.1): pre-rendered page images with prev/next. Desktop shows a
 * two-page spread after the cover, tablet one page; mobile hides the viewer ("Číst online" opens the PDF).
 * Without JS the first page shows and the buttons are hidden.
 */
export function PageViewer({ issue }: Props) {
  const spread = useMediaQuery("(min-width: 75rem)");
  const [page, setPage] = useState(1);
  const total = issue.pageImages.length;
  const view = viewerSpread(page, total, spread);

  return (
    <section aria-labelledby="listujte" className="flex flex-col gap-3.5 max-md:hidden">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h2 id="listujte" className="text-26 leading-heading font-bold lg:text-32">
          Listujte přímo zde
        </h2>
        <a
          href={issue.pdfUrl}
          className="flex min-h-11 items-center gap-1.5 font-bold text-orange-ink-deep hover:text-ink"
        >
          Otevřít na celou obrazovku
          <ArrowRightIcon size={18} />
        </a>
      </div>
      <div className="flex flex-col overflow-hidden rounded-20 border border-line bg-surface">
        <div className="flex items-center justify-center gap-4 border-b border-line bg-raised p-2.5">
          <button
            type="button"
            aria-label="Předchozí strana"
            disabled={view.pages[0] === 1}
            onClick={() => setPage(stepPage(page, -1, total, spread))}
            data-js-only
            className={navButton}
          >
            <ChevronLeftIcon />
          </button>
          <span aria-live="polite" className="min-w-30 text-center font-bold">
            {view.label}
          </span>
          <button
            type="button"
            aria-label="Další strana"
            disabled={view.pages.at(-1) === total}
            onClick={() => setPage(stepPage(page, 1, total, spread))}
            data-js-only
            className={navButton}
          >
            <ChevronRightIcon />
          </button>
        </div>
        <div className="flex justify-center gap-4 p-6">
          {view.pages.map((n) => (
            <img
              key={n}
              src={issue.pageImages[n - 1]}
              alt={`Strana ${n}`}
              width={600}
              height={849}
              loading="lazy"
              className="aspect-a4 w-75 rounded-6 bg-raised object-cover shadow-page"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
