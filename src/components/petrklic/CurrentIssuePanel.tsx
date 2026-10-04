import type { PetrklicIssue } from "@/content/types/petrklic";
import { issueLabel, volumeOf } from "@/lib/petrklic/issues";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { DownloadIcon, EyeIcon } from "@/components/ui/icons";
import { PetrklicCover } from "./PetrklicCover";

/*
 * "Aktuální číslo" (design/DESIGN.md §17.1): the cover, the issue and its two buttons. Mobile: the cover centred
 * above the text, full-width buttons. Tablet and desktop: the cover beside the text.
 */
export function CurrentIssuePanel({ issue, intro }: { issue: PetrklicIssue; intro: string }) {
  return (
    <section
      aria-labelledby="aktualni-cislo"
      className="relative flex flex-col gap-6 overflow-hidden rounded-24 bg-orange-tint px-5 pt-6 pb-8 md:flex-row md:gap-8 md:rounded-28 md:p-8 lg:gap-14 lg:rounded-32 lg:px-12 lg:py-11"
    >
      <span
        aria-hidden="true"
        className="absolute right-0 bottom-0 h-16 w-24 bg-orange shard-br md:h-21.5 md:w-32.5 lg:h-32.5 lg:w-50"
      />
      <span
        aria-hidden="true"
        className="absolute right-17.5 bottom-0 h-8.5 w-10 bg-green shard-br md:right-24 md:h-11 md:w-13.5 lg:right-37.5 lg:h-16 lg:w-20"
      />

      <PetrklicCover
        issue={issue}
        className="relative w-50 shrink-0 self-center rounded-12 shadow-cover-xl md:w-60 md:self-start lg:w-75"
      />

      <div className="relative flex min-w-0 flex-1 flex-col gap-3.5 lg:pt-3">
        <span className="text-13 font-bold tracking-eyebrow text-orange-ink uppercase">Aktuální číslo</span>
        <h2 id="aktualni-cislo" className="text-30 leading-display font-bold tracking-title md:text-40 lg:text-56">
          Petrklíč {issueLabel(issue)}
        </h2>
        <p className="text-ink-2">
          Ročník {volumeOf(issue.year)} · vydání {issue.number}
        </p>
        <p className="text-ink-2">{intro}</p>
        <div className="mt-auto flex flex-wrap gap-2.5 pt-1.5">
          <ButtonLink href={issue.pdfUrl} variant="accent" className="max-md:basis-full">
            <EyeIcon />
            Číst online
          </ButtonLink>
          <ButtonLink
            href={issue.pdfUrl}
            download={`Petrklíč ${issueLabel(issue)}.pdf`}
            variant="outline-orange"
            className="max-md:basis-full"
          >
            <DownloadIcon />
            Stáhnout PDF
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
