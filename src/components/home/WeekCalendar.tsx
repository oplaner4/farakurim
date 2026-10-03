"use client";

import { addDays } from "date-fns";
import { clsx } from "clsx";
import type { CalendarEntry } from "@/content/types";
import { links } from "@/content/site";
import { agendaByDate, type DateRange, itemTime, weekCardLabels } from "@/lib/agenda";
import { inPrague, pragueDate, pragueDateTime } from "@/lib/prague";
import { useCalendarEntries } from "@/lib/use-calendar";
import { useToday } from "@/lib/use-now";
import { SectionHeading } from "@/components/ui/SectionHeading";

const DAYS = 7;

type Props = {
  /** Prerendered entries from the build day on; the browser re-reads Google Calendar when it has a key. */
  entries: CalendarEntry[];
  /** The days `entries` cover. */
  range: DateRange;
  /** Event ID → Aktuality detail page. */
  hrefs: Record<string, string>;
  renderedAt: number;
};

/**
 * "Tento týden" (design/DESIGN.md §4.3a): today and the next six days. Each card lists the events and one
 * line with the times of the services. Mobile and tablet scroll sideways; desktop shows seven columns.
 */
export function WeekCalendar({ entries, range: prerendered, hrefs, renderedAt }: Props) {
  const today = useToday(renderedAt);
  const range = { from: today, to: pragueDate(addDays(pragueDateTime(today, "12:00"), DAYS - 1, { in: inPrague })) };
  const { entries: loaded, status } = useCalendarEntries({ entries, range: prerendered }, range, hrefs);
  const agenda = agendaByDate(loaded, range);

  return (
    <section aria-labelledby="tento-tyden" className="flex flex-col gap-4 pt-11 md:pt-14 lg:pt-20">
      <SectionHeading
        id="tento-tyden"
        title="Tento týden"
        color="blue"
        link={{ href: links.calendar, label: "Celý kalendář" }}
        className="lg:items-center"
      />
      <ol
        aria-labelledby="tento-tyden"
        // Scrollable on mobile and tablet, so it takes keyboard focus there.
        tabIndex={0}
        // Days after the prerendered ones are dimmed until Google Calendar answers.
        aria-busy={status === "loading"}
        className={clsx(
          "-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 md:-mx-8 md:gap-3 md:px-8 lg:mx-0 lg:grid lg:grid-cols-7 lg:overflow-visible lg:px-0",
          status !== "ready" && "opacity-40",
        )}
      >
        {[...agenda].map(([date, items], index) => {
          const { label, date: shortDate } = weekCardLabels(date, today);
          const events = items.filter((i) => i.calendar === "events");
          const services = items.filter((i) => i.calendar === "services");
          return (
            <li
              key={date}
              className={clsx(
                "flex shrink-0 basis-50 flex-col gap-2 rounded-18 border-2 p-3.5 md:basis-52.5 lg:min-w-0",
                index === 0 ? "border-blue bg-blue-tint" : "border-surface bg-surface",
              )}
            >
              <span className="flex items-baseline justify-between gap-1.5">
                <strong className="text-16">{label}</strong>
                <span className="text-13 text-muted">{shortDate}</span>
              </span>
              {events.map((event) => (
                <span key={event.key} className="flex gap-2">
                  <span aria-hidden="true" className="w-1 flex-none rounded-full bg-magenta" />
                  <span className="flex min-w-0 flex-col text-14 leading-compact">
                    <span className="text-12 font-bold text-magenta-ink">{itemTime(event)}</span>
                    {event.href ? (
                      <a href={event.href} className="font-bold">
                        {event.title}
                      </a>
                    ) : (
                      <span className="font-bold">{event.title}</span>
                    )}
                  </span>
                </span>
              ))}
              {services.length > 0 && (
                <span className="flex gap-2">
                  <span aria-hidden="true" className="w-1 flex-none rounded-full bg-blue" />
                  <span className="flex flex-col text-14 leading-compact">
                    <span className="text-12 font-bold text-blue-ink">Bohoslužby</span>
                    <span>{services.map(itemTime).join(" · ")}</span>
                  </span>
                </span>
              )}
              {items.length === 0 && status === "ready" && <span className="text-14 text-muted">Bez programu</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
