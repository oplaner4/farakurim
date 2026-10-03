import { links } from "@/content/site";
import type { PetrklicIssue } from "@/content/types";
import { issueLabel, volumeOf } from "@/lib/petrklic";
import { ArrowRightIcon } from "@/components/ui/icons";
import { PetrklicCover } from "./PetrklicCover";

/**
 * "Předchozí čísla" (design/DESIGN.md §17.1): cover tiles that open the PDF. Mobile: a horizontal row of 140px
 * tiles bleeding to the screen edges. Tablet and desktop: 4 columns.
 */
export function PreviousIssues({ issues }: { issues: PetrklicIssue[] }) {
  return (
    <section aria-labelledby="predchozi-cisla" className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h2 id="predchozi-cisla" className="text-22 leading-heading font-bold md:text-26 lg:text-32">
          Předchozí čísla
        </h2>
        <a
          href={links.petrklicArchive}
          className="flex min-h-11 items-center gap-1.5 font-bold text-orange-ink-deep hover:text-ink"
        >
          Celý archiv
          <ArrowRightIcon size={18} />
        </a>
      </div>
      <ul className="-mx-4 no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0 md:pb-0 lg:gap-6">
        {issues.map((issue) => (
          <li key={issue.id} className="shrink-0 basis-35">
            <a href={issue.pdfUrl} className="flex flex-col gap-2 text-ink no-underline hover:text-ink">
              <PetrklicCover issue={issue} className="w-full rounded-10 shadow-page" />
              <strong>{issueLabel(issue)}</strong>
              <span className="-mt-2 text-14 text-muted">ročník {volumeOf(issue.year)}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
