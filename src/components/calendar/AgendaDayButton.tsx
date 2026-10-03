"use client";

import { DayButton, type DayButtonProps } from "@daypicker/react";
import { clsx } from "clsx";
import { createContext, use } from "react";
import type { IsoDate } from "@/content/types";
import type { AgendaItem } from "@/lib/agenda";

/** Badge rows that fit a tablet/desktop cell above "3× mše". */
const MAX_BADGES = 2;
const EMPTY: AgendaItem[] = [];

/** The visible days' items, read by the day buttons (DayPicker renders them). */
export const AgendaContext = createContext<Map<IsoDate, AgendaItem[]>>(new Map());

/**
 * One day of the grid (§16.2, 3). Mobile: the number with a blue (services) and a magenta (events) dot.
 * Tablet and desktop: up to two badges, then "3× mše". With more events than badges, the last badge is
 * "+N další" in the same style.
 */
export function AgendaDayButton({ day, modifiers, className, ...rest }: DayButtonProps) {
  const items = use(AgendaContext).get(day.isoDate) ?? EMPTY;
  const events = items.filter((i) => i.calendar === "events");
  const services = items.length - events.length;
  const labelled = events.length > MAX_BADGES ? events.slice(0, MAX_BADGES - 1) : events;
  const hidden = events.length - labelled.length;
  const { selected, outside, today } = modifiers;
  // Badges keep their height: the cell's height is fixed, so they must not shrink into each other.
  const badge = clsx(
    "hidden shrink-0 truncate rounded-6 px-1.5 py-0.5 text-12 leading-card md:block",
    selected ? "bg-white text-magenta-ink-deep" : "bg-magenta-tint text-magenta-ink",
  );
  return (
    <DayButton
      day={day}
      modifiers={modifiers}
      className={clsx(
        className,
        "flex h-13 w-full cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-12 text-16 font-bold md:h-26 md:items-stretch md:justify-start md:rounded-14 md:p-2 md:text-left lg:h-29.5",
        today ? "border-2 border-blue" : "border border-line",
        selected ? "bg-blue text-white" : outside ? "bg-surface text-muted" : "bg-raised text-ink",
      )}
      {...rest}
    >
      <span className="shrink-0 leading-heading">{day.date.getDate()}</span>
      <span aria-hidden="true" className="flex h-1.5 gap-0.75 md:hidden">
        {services > 0 && <span className={clsx("size-1.5 rounded-full", selected ? "bg-white" : "bg-blue")} />}
        {events.length > 0 && <span className={clsx("size-1.5 rounded-full", selected ? "bg-white" : "bg-magenta")} />}
      </span>
      {labelled.map((event) => (
        <span key={event.key} aria-hidden="true" className={badge}>
          {event.title}
        </span>
      ))}
      {hidden > 0 && (
        <span aria-hidden="true" className={badge}>
          +{hidden} další
        </span>
      )}
      {services > 0 && (
        <span
          aria-hidden="true"
          className={clsx("mt-auto hidden text-12 md:block", selected ? "text-white" : "text-blue-ink")}
        >
          {services}× mše
        </span>
      )}
    </DayButton>
  );
}
