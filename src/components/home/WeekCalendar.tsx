"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import type { CalendarEntry } from "@/content/types/calendar";
import type { IsoDate } from "@/content/types/shared";
import { GOOGLE_CALENDAR_API_KEY, links } from "@/content/site";
import {
  type AgendaItem,
  agendaByDate,
  containsRange,
  type DateRange,
  daySummary,
  itemTime,
  shortWeekday,
  splitEvents,
  weekCardLabels,
  weekHeading,
  weekRange,
  weekRangeLabel,
} from "@/lib/calendar/agenda";
import { plural } from "@/lib/shared/czech";
import { useCalendarEntries } from "@/hooks/use-calendar-entries";
import { useToday } from "@/hooks/use-now";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons/navigation-icons";
import { ArrowLink } from "@/components/ui/ArrowLink";

type Props = {
  /** Prerendered entries; the browser re-reads Google Calendar when it has a key. */
  entries: CalendarEntry[];
  /** The days `entries` cover. */
  range: DateRange;
  /** The Aktuality detail pages Události events may link to. */
  linkablePages: string[];
  renderedAt: number;
};

const weekButton =
  "flex size-11 cursor-pointer items-center justify-center rounded-12 border-thin border-line bg-raised text-ink hover:border-blue hover:text-blue-ink disabled:cursor-default disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink";

/**
 * "Tento týden" (design/DESIGN.md §4.3a): Monday to Sunday of the current week, with buttons for the previous and
 * next weeks. Each upcoming day lists its events (one and "+N další" from three on) and one line with the times of
 * the services. Mobile and tablet scroll sideways and collapse the week's past days to narrow cards; desktop shows
 * seven columns with the past days faded.
 */
export function WeekCalendar({ entries, range: prerendered, linkablePages, renderedAt }: Props) {
  const today = useToday(renderedAt);
  const [offset, setOffset] = useState(0);
  const range = weekRange(today, offset);
  const { entries: loaded, status } = useCalendarEntries({ entries, range: prerendered }, range, linkablePages);
  const agenda = agendaByDate(loaded, range);
  // Without an API key there is nothing to read beyond the prerendered weeks.
  const canGo = (delta: number) => {
    if (GOOGLE_CALENDAR_API_KEY) return true;
    return containsRange(prerendered, weekRange(today, offset + delta));
  };

  // Mobile and tablet: start the row at today in the current week, at Monday in the others.
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const todayCard = offset === 0 ? list.querySelector<HTMLElement>("[data-today]") : null;
    list.scrollLeft = todayCard ? todayCard.offsetLeft - parseFloat(getComputedStyle(list).paddingLeft) : 0;
  }, [offset, today]);

  return (
    <section aria-labelledby="tento-tyden" className="flex flex-col gap-4 pt-11 md:pt-14 lg:pt-20">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-2.5 md:gap-3 lg:gap-3.5">
          <span aria-hidden="true" className="h-5.5 w-4 flex-none bg-blue shard-br md:h-6.5 md:w-4.5 lg:h-8 lg:w-5.5" />
          <div className="flex flex-col">
            <h2
              id="tento-tyden"
              aria-live="polite"
              className="text-26 leading-display font-bold tracking-heading md:text-32 lg:text-40 lg:tracking-display"
            >
              {weekHeading(offset, range.from)}
            </h2>
            <span className="text-14 text-muted">{weekRangeLabel(range)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-js-only
            className={weekButton}
            aria-label="Předchozí týden"
            disabled={!canGo(-1)}
            onClick={() => setOffset((o) => o - 1)}
          >
            <ChevronLeftIcon size={20} />
          </button>
          <button
            type="button"
            data-js-only
            className={weekButton}
            aria-label="Další týden"
            disabled={!canGo(1)}
            onClick={() => setOffset((o) => o + 1)}
          >
            <ChevronRightIcon size={20} />
          </button>
          <ArrowLink href={links.calendar} tone="blue" iconClassName="max-lg:hidden" className="ml-1">
            Celý kalendář
          </ArrowLink>
        </div>
      </div>
      <ol
        ref={listRef}
        aria-labelledby="tento-tyden"
        // Scrollable on mobile and tablet, so it takes keyboard focus there.
        tabIndex={0}
        // Weeks outside the prerendered ones are dimmed until Google Calendar answers.
        aria-busy={status === "loading"}
        className={clsx(
          "relative -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 md:-mx-8 md:gap-3 md:px-8 lg:mx-0 lg:grid lg:grid-cols-7 lg:overflow-visible lg:px-0",
          status !== "ready" && "opacity-40",
        )}
      >
        {[...agenda].map(([date, items]) => (
          <DayCard key={date} date={date} today={today} items={items} ready={status === "ready"} />
        ))}
      </ol>
    </section>
  );
}

function DayCard({
  date,
  today,
  items,
  ready,
}: {
  date: IsoDate;
  today: IsoDate;
  items: AgendaItem[];
  ready: boolean;
}) {
  const isToday = date === today;
  const past = date < today;
  // Only the current week's past days collapse; a whole past week keeps full, faded cards.
  const collapsed = past && date >= weekRange(today, 0).from;
  const { label, date: shortDate } = weekCardLabels(date, today);
  const { shown, hidden } = splitEvents(items.filter((i) => i.calendar === "events"));
  const services = items.filter((i) => i.calendar === "services");
  return (
    <li
      data-today={isToday || undefined}
      className={clsx(
        "flex shrink-0 flex-col rounded-18 border-2 lg:min-w-0",
        isToday ? "border-blue bg-blue-tint" : "border-surface bg-surface",
        past && "opacity-55",
        collapsed ? "basis-19 gap-1 px-2 py-2.5 lg:gap-2 lg:p-3.5" : "basis-50 gap-2 p-3.5 md:basis-52.5",
      )}
    >
      {collapsed && (
        <span className="flex flex-col gap-1 lg:hidden">
          <strong className="text-15">{shortWeekday(date)}</strong>
          <span className="text-13 text-muted">{shortDate}</span>
          <span className="text-12 leading-card text-ink-2">{ready ? daySummary(items) : "…"}</span>
        </span>
      )}
      <span className={clsx("flex-col gap-2", collapsed ? "hidden lg:flex" : "flex")}>
        <span className="flex items-baseline justify-between gap-1.5">
          <strong className="text-16">{label}</strong>
          <span className="text-13 text-muted">{shortDate}</span>
        </span>
        {shown.map((event) => (
          <span key={event.key} className="flex gap-2">
            <span aria-hidden="true" className="w-1 flex-none rounded-full bg-magenta" />
            <span className="flex min-w-0 flex-col text-14 leading-compact">
              <span className="text-12 font-bold text-magenta-ink">{itemTime(event)}</span>
              {event.href ? (
                <a href={event.href} title={event.title} className="line-clamp-2 font-bold">
                  {event.title}
                </a>
              ) : (
                <span title={event.title} className="line-clamp-2 font-bold">
                  {event.title}
                </span>
              )}
            </span>
          </span>
        ))}
        {hidden > 0 && (
          <a
            href={`${links.calendar}?den=${date}`}
            aria-label={`Další ${hidden} ${plural(hidden, ["akce", "akce", "akcí"])} v kalendáři`}
            className="ml-3 self-start rounded-6 bg-magenta-tint px-2 py-0.5 text-13 font-bold text-magenta-ink no-underline hover:text-magenta-ink hover:underline"
          >
            +{hidden} další
          </a>
        )}
        {services.length > 0 && (
          <span className="flex gap-2">
            <span aria-hidden="true" className="w-1 flex-none rounded-full bg-blue" />
            <span className="flex flex-col text-14 leading-compact">
              <span className="text-12 font-bold text-blue-ink">Bohoslužby</span>
              <span>{services.map(itemTime).join(" · ")}</span>
            </span>
          </span>
        )}
        {items.length === 0 && ready && <span className="text-14 text-muted">Bez programu</span>}
      </span>
    </li>
  );
}
