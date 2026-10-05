import { clsx } from "clsx";
import type { ChronicleEra } from "@/content/types/chronicle";
import { byYear, formatYears } from "@/lib/chronicle/entries";
import { externalLinkAttrs } from "@/lib/shared/links";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * One era of the chronicle (design/DESIGN.md §26): H2 and a vertical timeline, the year right-aligned left of a
 * line with dots. Milestones get a bigger blue year and dot and a tinted bubble.
 */
export function ChronicleTimeline({ era, hidden }: { era: ChronicleEra; hidden?: boolean }) {
  const headingId = `obdobi-${era.id}`;
  return (
    <section aria-labelledby={headingId} hidden={hidden} className="flex flex-col gap-1.5">
      <SectionHeading id={headingId} title={era.title} color="blue" small className="mb-2" />
      <ol className="flex flex-col">
        {byYear(era.entries).map((entry) => (
          <li key={formatYears(entry)} className="flex items-start">
            <span
              className={clsx(
                "w-23 shrink-0 py-3 text-right leading-snug font-bold whitespace-nowrap md:w-32.5 lg:w-37.5",
                !entry.milestone && "text-18",
                // A milestone span ("1766–1772") is a little smaller on mobile, so it fits the 92px column.
                entry.milestone && "text-blue-ink md:text-24",
                entry.milestone && (entry.until ? "text-20" : "text-24"),
              )}
            >
              {formatYears(entry)}
            </span>
            {/* The line runs through every row; the dot sits on it, ringed with the page colour. */}
            <span aria-hidden="true" className="relative flex w-7 shrink-0 justify-center self-stretch">
              <span className="absolute inset-y-0 w-0.5 bg-line" />
              <span
                className={clsx(
                  "relative rounded-full ring-4 ring-bg",
                  entry.milestone ? "mt-3.75 size-4 bg-blue-active" : "mt-4.5 size-2.5 bg-dot-off",
                )}
              />
            </span>
            <p
              className={clsx(
                "my-1.5 min-w-0 flex-1 text-15 leading-verse md:text-17",
                entry.milestone ? "rounded-16 bg-blue-tint px-3.5 py-2.5" : "py-1.5",
              )}
            >
              {entry.text}
              {entry.link && (
                <>
                  {" "}
                  <a href={entry.link.href} {...externalLinkAttrs(entry.link.href)} className="font-bold">
                    {entry.link.label}
                  </a>
                </>
              )}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
