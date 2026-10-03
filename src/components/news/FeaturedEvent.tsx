import type { NewsEvent } from "@/content/types";
import { formatEventWhen } from "@/lib/czech";
import { eventHref } from "@/lib/news";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { eventAnchor } from "./EventCard";
import { CalendarIcon, ImageIcon, PinIcon } from "@/components/ui/icons";
import { PosterPlaceholder } from "@/components/ui/PosterPlaceholder";

/**
 * "Doporučujeme" panel (design/DESIGN.md §11.2). Mobile: text, then the poster beside the button
 * (the content column is `contents`, its children wrap in the panel's row). Tablet/desktop: poster · content.
 */
export function FeaturedEvent({ event }: { event: NewsEvent }) {
  const when = formatEventWhen(event, { longMonth: true });
  const file = event.attachments?.[0];

  return (
    <section
      id={eventAnchor(event.id)}
      aria-labelledby="doporucujeme"
      className="relative flex flex-wrap gap-x-3 gap-y-3.5 overflow-hidden rounded-24 bg-magenta-tint px-5 py-5.5 md:flex-nowrap md:gap-7 md:rounded-28 md:p-7 lg:flex-wrap lg:gap-10 lg:rounded-32 lg:p-9"
    >
      <span aria-hidden="true" className="absolute top-0 right-0 size-19 bg-magenta shard-tr md:size-24 lg:size-35" />
      <span
        aria-hidden="true"
        className="absolute top-0 right-11 h-10.5 w-8 bg-orange shard-tr md:right-14 md:h-13 md:w-10 lg:right-21 lg:h-18 lg:w-14"
      />

      <span className="relative flex h-34 w-24 shrink-0 items-center justify-center overflow-hidden rounded-12 bg-raised text-magenta-ink max-md:order-1 md:h-70.5 md:w-50 md:rounded-14 md:shadow-poster lg:h-83.5 lg:w-59 lg:rounded-16 lg:shadow-poster-lg">
        {event.poster ? (
          <img src={event.poster.src} alt={event.poster.alt} className="size-full object-contain" />
        ) : (
          <PosterPlaceholder iconSize={36} className="h-12 w-16 md:h-20 md:w-28 lg:h-24 lg:w-34" />
        )}
      </span>

      <div className="max-md:contents md:flex md:min-w-0 md:flex-1 md:flex-col md:gap-3.5 lg:basis-105 lg:gap-4 lg:pt-2">
        <p className="text-13 font-bold tracking-eyebrow text-magenta-ink uppercase max-md:basis-full lg:text-14">
          Doporučujeme
        </p>
        <h2
          id="doporucujeme"
          className="pr-12 text-26 leading-heading font-bold tracking-heading max-md:basis-full md:pr-16 md:text-32 md:leading-title lg:pr-30 lg:text-44 lg:leading-display lg:tracking-title"
        >
          {event.title}
        </h2>
        <p className="flex flex-col gap-1 text-15 text-ink-2 max-md:basis-full md:text-16 lg:flex-row lg:flex-wrap lg:gap-x-7 lg:gap-y-2 lg:text-18">
          <span className="flex items-center gap-2">
            <CalendarIcon size={18} strokeWidth={2} className="shrink-0 text-magenta-ink lg:size-5" />
            <span>
              <strong className="text-ink">{when.date.charAt(0).toUpperCase() + when.date.slice(1)}</strong>
              {when.time && ` · ${when.time}`}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <PinIcon size={18} className="shrink-0 text-magenta-ink lg:size-5" />
            {event.place}
          </span>
        </p>
        <p className="text-15 text-ink-2 max-md:basis-full md:text-16 lg:max-w-160 lg:text-18">{event.text}</p>
        {/* Mobile: a column beside the poster, "Více o akci" on top. Tablet/desktop: a row, poster first. */}
        <div className="flex flex-1 flex-col justify-end gap-2 max-md:order-2 md:mt-auto md:flex-none md:flex-row md:flex-wrap md:justify-start md:gap-2.5">
          <ButtonLink href={eventHref(event)} variant="outline-magenta" size="medium">
            Více o akci
          </ButtonLink>
          {file && (
            <ButtonLink href={file.file} variant="magenta" size="medium" className="md:order-first">
              <ImageIcon size={18} strokeWidth={2} />
              {/* "Zobrazit plakát" from tablet up; other labels would need a different case, so they stay as is. */}
              {file.label === "Plakát" ? (
                <>
                  <span className="md:hidden">Plakát</span>
                  <span className="max-md:hidden">Zobrazit plakát</span>
                </>
              ) : (
                file.label
              )}
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  );
}
