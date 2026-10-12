import { clsx } from "clsx";
import type { NewsEvent } from "@/content/types/news";
import { BUILD_TIME } from "@/lib/shared/build-time";
import { capitalize, formatEventWhen, formatShortDate } from "@/lib/shared/czech";
import { mapHref, NEW_TAB } from "@/lib/shared/links";
import { eventCalendarHref, eventEnd, isCancelled } from "@/lib/news/events";
import { CalendarIcon, PinIcon } from "@/components/ui/icons/contact-icons";
import { EventActions } from "./EventActions";

/**
 * "Kdy a kde" (§13.2): date, place with a map link, and the calendar and share actions. A cancelled event (§13.7) gets
 * a grey panel without the corner shards, its date struck through and no calendar file; a postponed one names its
 * first date under the new one.
 */
export function EventWhenWhere({ event }: { event: NewsEvent }) {
  const when = formatEventWhen(event, { longMonth: true });
  const cancelled = isCancelled(event);
  const iconColor = cancelled ? "text-muted" : "text-magenta-ink";
  return (
    <section
      aria-label="Kdy a kde"
      className={clsx(
        "relative flex flex-col gap-4 overflow-hidden rounded-24 px-5 py-5.5 md:min-w-0 md:flex-1 md:rounded-28 md:p-6 md:leading-compact lg:flex-none lg:gap-4.5 lg:p-7",
        cancelled ? "bg-surface" : "bg-magenta-tint",
      )}
    >
      {!cancelled && (
        <>
          <span
            aria-hidden="true"
            className="absolute top-0 right-0 size-16 bg-magenta shard-tr md:size-19 lg:size-21"
          />
          <span
            aria-hidden="true"
            className="absolute top-0 right-12.5 hidden h-11 w-8.5 bg-orange shard-tr lg:block"
          />
        </>
      )}
      <p className={clsx("flex gap-3 lg:gap-3.5", !cancelled && "pr-12")}>
        <CalendarIcon size={22} strokeWidth={2} className={clsx("mt-0.5 shrink-0 lg:size-6", iconColor)} />
        <span className="flex flex-col">
          <span className="text-13 text-muted md:text-14">Kdy</span>
          <strong className={clsx(cancelled && "line-through")}>
            {capitalize(when.date)}
            {when.time && (
              <>
                <span className="lg:hidden">, </span>
                <span className="lg:block">{when.time}</span>
              </>
            )}
          </strong>
          {event.change?.status === "moved" && (
            <span className="text-15 text-muted lg:text-16">původně {formatShortDate(event.change.previousStart)}</span>
          )}
        </span>
      </p>
      {event.place && (
        <p className="flex gap-3 lg:gap-3.5">
          <PinIcon size={22} className={clsx("mt-0.5 shrink-0 lg:size-6", iconColor)} />
          <span className="flex flex-col items-start">
            <span className="text-13 text-muted md:text-14">Kde</span>
            <strong>{event.place}</strong>
            <a href={mapHref(event.mapQuery ?? event.place)} {...NEW_TAB} className="text-15 font-bold lg:text-16">
              Zobrazit na mapě
            </a>
          </span>
        </p>
      )}
      <EventActions
        title={event.title}
        end={eventEnd(event)}
        calendarHref={cancelled ? undefined : eventCalendarHref(event)}
        renderedAt={BUILD_TIME}
      />
    </section>
  );
}
