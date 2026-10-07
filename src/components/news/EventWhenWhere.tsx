import type { NewsEvent } from "@/content/types/news";
import { BUILD_TIME } from "@/lib/shared/build-time";
import { capitalize, formatEventWhen } from "@/lib/shared/czech";
import { mapHref, NEW_TAB } from "@/lib/shared/links";
import { eventCalendarHref, eventEnd } from "@/lib/news/events";
import { CalendarIcon, PinIcon } from "@/components/ui/icons/contact-icons";
import { EventActions } from "./EventActions";

/** "Kdy a kde" (§13.2): date, place with a map link, and the calendar and share actions. */
export function EventWhenWhere({ event }: { event: NewsEvent }) {
  const when = formatEventWhen(event, { longMonth: true });
  return (
    <section
      aria-label="Kdy a kde"
      className="relative flex flex-col gap-4 overflow-hidden rounded-24 bg-magenta-tint px-5 py-5.5 md:min-w-0 md:flex-1 md:rounded-28 md:p-6 md:leading-compact lg:flex-none lg:gap-4.5 lg:p-7"
    >
      <span aria-hidden="true" className="absolute top-0 right-0 size-16 bg-magenta shard-tr md:size-19 lg:size-21" />
      <span aria-hidden="true" className="absolute top-0 right-12.5 hidden h-11 w-8.5 bg-orange shard-tr lg:block" />
      <p className="flex gap-3 pr-12 lg:gap-3.5">
        <CalendarIcon size={22} strokeWidth={2} className="mt-0.5 shrink-0 text-magenta-ink lg:size-6" />
        <span className="flex flex-col">
          <span className="text-13 text-muted md:text-14">Kdy</span>
          <strong>
            {capitalize(when.date)}
            {when.time && (
              <>
                <span className="lg:hidden">, </span>
                <span className="lg:block">{when.time}</span>
              </>
            )}
          </strong>
        </span>
      </p>
      {event.place && (
        <p className="flex gap-3 lg:gap-3.5">
          <PinIcon size={22} className="mt-0.5 shrink-0 text-magenta-ink lg:size-6" />
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
        calendarHref={eventCalendarHref(event)}
        renderedAt={BUILD_TIME}
      />
    </section>
  );
}
