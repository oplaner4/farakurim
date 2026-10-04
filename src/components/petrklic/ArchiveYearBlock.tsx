import { clsx } from "clsx";
import type { PetrklicIssue } from "@/content/types/petrklic";
import { issueLabel, type PetrklicYear } from "@/lib/petrklic/issues";
import { DownloadIcon } from "@/components/ui/icons";
import { PetrklicCover } from "./PetrklicCover";

type Props = {
  year: PetrklicYear;
  /** ID of the current issue: its tile gets the "nové" pill. */
  currentId: string;
  className?: string;
};

/**
 * One year of the Petrklíč archive (design/DESIGN.md §18.1 (3)): the year and its volume, then the issue tiles.
 * Desktop: the year in a 200px column beside the covers; smaller screens: above them.
 */
export function ArchiveYearBlock({ year, currentId, className }: Props) {
  const headingId = `rok-${year.year}`;
  return (
    <section
      aria-labelledby={headingId}
      className={clsx(
        "flex flex-col gap-3 border-t border-line pt-5 md:gap-3.5 lg:flex-row lg:items-start lg:gap-8",
        className,
      )}
    >
      <div className="flex flex-col gap-0.5 lg:shrink-0 lg:basis-50">
        <h2 id={headingId} tabIndex={-1} className="text-20 leading-display font-bold md:text-24 lg:text-32">
          {year.year}
        </h2>
        <span className="text-15 text-muted">ročník {year.volume}</span>
      </div>
      <ul className="grid min-w-0 flex-1 grid-cols-2 gap-3.5 md:grid-cols-4 md:gap-4 lg:gap-6">
        {year.issues.map((issue) => (
          <IssueTile key={issue.id} issue={issue} isCurrent={issue.id === currentId} />
        ))}
      </ul>
    </section>
  );
}

function IssueTile({ issue, isCurrent }: { issue: PetrklicIssue; isCurrent: boolean }) {
  const label = issueLabel(issue);
  return (
    <li className="flex min-w-0 flex-col gap-2">
      <a href={issue.pdfUrl} aria-label={`Číst Petrklíč ${label}`} className="block rounded-10">
        <PetrklicCover issue={issue} className="w-full rounded-10 shadow-page" />
      </a>
      <div className="flex items-center gap-2">
        <strong className="min-w-0">{label}</strong>
        {isCurrent && <span className="rounded-full bg-orange px-2 py-px text-12 font-bold text-on-orange">nové</span>}
        <a
          href={issue.pdfUrl}
          download={`Petrklíč ${label}.pdf`}
          aria-label={`Stáhnout Petrklíč ${label} (PDF)`}
          className="ml-auto flex size-11 shrink-0 items-center justify-center rounded-12 border-thin border-line text-orange-ink-deep hover:border-orange hover:text-orange-ink-deep"
        >
          <DownloadIcon size={18} />
        </a>
      </div>
    </li>
  );
}
