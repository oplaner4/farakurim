"use client";

import { DayButton, type DayButtonProps } from "@daypicker/react";
import { clsx } from "clsx";
import { createContext, use } from "react";
import type { IsoDate } from "@/content/types";
import type { AgendaItem } from "@/lib/agenda";

const MAX_LABELS = 2;
const EMPTY: AgendaItem[] = [];

/** The visible days' items, read by the day buttons (DayPicker renders them). */
export const AgendaContext = createContext<Map<IsoDate, AgendaItem[]>>(new Map());

/**
 * One day of the grid (§16.2, 3). Mobile: the number with a blue (services) and a magenta (events) dot.
 * Tablet and desktop: up to two event labels, "+N další" and "3× mše".
 */
export function AgendaDayButton({ day, modifiers, className, ...rest }: DayButtonProps) {
  const items = use(AgendaContext).get(day.isoDate) ?? EMPTY;
  const events = items.filter((i) => i.calendar === "events");
  const services = items.length - events.length;
  const { selected, outside, today } = modifiers;
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
      <span className="leading-heading">{day.date.getDate()}</span>
      <span aria-hidden="true" className="flex h-1.5 gap-0.75 md:hidden">
        {services > 0 && <span className={clsx("size-1.5 rounded-full", selected ? "bg-white" : "bg-blue")} />}
        {events.length > 0 && <span className={clsx("size-1.5 rounded-full", selected ? "bg-white" : "bg-magenta")} />}
      </span>
      {events.slice(0, MAX_LABELS).map((event) => (
        <span
          key={event.key}
          aria-hidden="true"
          className={clsx(
            "hidden truncate rounded-6 px-1.5 py-0.5 text-12 leading-card md:block",
            selected ? "bg-white text-magenta-ink-deep" : "bg-magenta-tint text-magenta-ink",
          )}
        >
          {event.title}
        </span>
      ))}
      {events.length > MAX_LABELS && (
        <span
          aria-hidden="true"
          className={clsx("hidden text-12 md:block", selected ? "text-magenta-ink-deep" : "text-magenta-ink")}
        >
          +{events.length - MAX_LABELS} další
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
