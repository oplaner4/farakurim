import type { ServiceSheet } from "@/content/types";
import { formatDateRange, formatWeekdayDate } from "@/lib/czech";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FileDownloadIcon, WarningIcon } from "@/components/ui/icons";

/*
 * "Tento týden" (design/DESIGN.md §14.1): the ohlášky PDF, this week's changes and confession times.
 * Mobile: one column (the two wrappers are `contents`). Tablet: the wrappers are two grid columns.
 * Desktop: they wrap side by side, and the confession times become a small card next to the changes.
 */
export function ThisWeekPanel({ sheet }: { sheet: ServiceSheet }) {
  return (
    <section
      aria-labelledby="tento-tyden"
      className="relative flex flex-col gap-3.5 overflow-hidden rounded-24 bg-blue-tint px-5 py-5.5 md:grid md:grid-cols-2 md:gap-6 md:rounded-28 md:p-7 lg:flex lg:flex-row lg:flex-wrap lg:gap-x-12 lg:gap-y-8 lg:rounded-32 lg:p-9"
    >
      <span aria-hidden="true" className="absolute top-0 right-0 size-18 bg-blue shard-tr md:size-22 lg:size-32.5" />
      <span
        aria-hidden="true"
        className="absolute top-0 right-10 h-10 w-8 bg-green shard-tr md:right-12.5 md:h-12 md:w-9.5 lg:right-19 lg:h-17.5 lg:w-13.5"
      />

      <div className="contents md:flex md:flex-col md:gap-3.5 lg:shrink lg:grow lg:basis-90 lg:gap-4">
        <span className="text-13 font-bold tracking-eyebrow text-blue-ink uppercase lg:text-14">Tento týden</span>
        <h2
          id="tento-tyden"
          className="pr-14 text-22 leading-snug font-bold md:pr-0 md:text-26 md:leading-heading lg:text-36 lg:leading-title lg:tracking-heading"
        >
          Ohlášky <br className="max-lg:hidden" />
          {formatDateRange(sheet.validFrom, sheet.validTo)}
        </h2>
        <ButtonLink href={sheet.pdfUrl} className="md:mt-auto lg:self-start lg:px-6">
          <FileDownloadIcon />
          Stáhnout ohlášky (PDF)
        </ButtonLink>
      </div>

      <div className="contents md:flex md:flex-col md:gap-3.5 md:pt-9 lg:shrink lg:grow lg:basis-105 lg:flex-row lg:flex-wrap lg:gap-4 lg:pt-10">
        {sheet.changes.length > 0 && (
          <div className="flex flex-col gap-2 rounded-16 bg-orange-tint px-4 py-3.5 md:px-4.5 md:py-4 lg:shrink lg:grow lg:basis-65 lg:rounded-18 lg:px-5 lg:py-4.5">
            <h3 className="flex items-center gap-2 text-15 font-bold text-orange-ink-deep lg:text-16">
              <WarningIcon size={18} />
              Změny tento týden
            </h3>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-15 md:text-16 lg:text-17">
              {sheet.changes.map((change) => (
                <li key={`${change.date} ${change.text}`}>
                  <strong>{formatWeekdayDate(change.date)}</strong> – {change.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {sheet.confession.length > 0 && (
          <div className="flex flex-col gap-0.5 text-15 text-ink-2 lg:shrink lg:grow lg:basis-50 lg:gap-1 lg:rounded-18 lg:bg-raised lg:px-5 lg:py-4.5 lg:text-17">
            <h3 className="font-bold text-ink">Svátost smíření tento týden</h3>
            {/* One line joined by " · " on mobile and tablet, one per line in the desktop card. */}
            <p className="flex flex-wrap gap-x-1 lg:flex-col">
              {sheet.confession.map((item, i) => (
                <span key={item}>
                  {i > 0 && <span className="lg:hidden">· </span>}
                  {item}
                </span>
              ))}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
