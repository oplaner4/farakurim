import { links } from "@/content/site";
import type { PetrklicIssue } from "@/content/types";
import { issueLabel } from "@/lib/petrklic";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ColorStripe } from "@/components/ui/ColorStripe";

/* Mobile/tablet: cover + intro in a row, actions below. Desktop: cover spans both rows of a 2-column grid. */
export function PetrklicPanel({ issue, description }: { issue: PetrklicIssue; description: string }) {
  const label = issueLabel(issue);
  return (
    <section
      aria-labelledby="petrklic"
      className="relative flex flex-col gap-4.5 overflow-hidden rounded-24 bg-orange-tint px-5 py-6 md:rounded-28 md:px-6 md:py-7 lg:grid lg:grid-cols-[150px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-7 lg:gap-y-0 lg:rounded-32 lg:px-8 lg:py-9"
    >
      <span
        className="pointer-events-none absolute bottom-0 left-0 h-15 w-22.5 bg-orange shard-bl md:h-18 md:w-27.5 lg:right-0 lg:left-auto lg:h-25 lg:w-40 lg:shard-br"
        aria-hidden="true"
      />

      <div className="relative flex gap-4 lg:contents">
        <div
          aria-hidden="true"
          className="relative flex h-41 shrink-0 basis-29 flex-col justify-between overflow-hidden rounded-10 bg-raised p-3 shadow-cover md:h-42.5 md:basis-30 lg:row-span-2 lg:h-53 lg:rounded-12 lg:p-3.5 lg:shadow-cover-lg"
        >
          {issue.cover ? (
            <img src={issue.cover} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
          ) : (
            <>
              <span className="text-18 font-bold text-orange-ink lg:text-22">Petrklíč</span>
              <ColorStripe className="h-1" />
              <span className="text-22 font-bold text-ink lg:text-26">{label}</span>
            </>
          )}
        </div>
        <div className="relative flex min-w-0 flex-col gap-1.5 lg:gap-2">
          <p className="text-13 font-bold tracking-eyebrow text-orange-ink uppercase">Farní zpravodaj</p>
          <h2 id="petrklic" className="text-24 leading-heading font-bold md:text-26 lg:text-32 lg:leading-title">
            Petrklíč {label}
          </h2>
          <p className="text-14 text-ink-2 md:text-15 lg:text-17">{description}</p>
        </div>
      </div>

      <div className="relative flex flex-col gap-2 md:mt-auto md:gap-1.5 lg:mt-0 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-5 lg:gap-y-2 lg:self-end lg:pt-5">
        <ButtonLink href={issue.pdfUrl} variant="accent">
          Číst Petrklíč (PDF)
        </ButtonLink>
        <a
          href={links.petrklicArchive}
          className="flex min-h-11 items-center justify-center font-bold text-orange-ink-deep hover:text-ink"
        >
          <span className="lg:hidden">Archiv starších čísel</span>
          <span className="hidden lg:inline">Archiv</span>
        </a>
      </div>
    </section>
  );
}
