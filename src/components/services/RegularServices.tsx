"use client";

import { clsx } from "clsx";
import { useState } from "react";
import type { Weekday } from "@/content/types";
import { capitalize, WEEKDAY_NAMES, WEEKDAY_SHORT } from "@/lib/czech";
import { WEEK_ORDER } from "@/lib/masses";
import { pragueWeekday } from "@/lib/prague";
import { useToday } from "@/hooks/use-now";
import { ChurchCard, type ChurchSchedule } from "./ChurchCard";

type DayFilter = Weekday | "all";

const chips: { value: DayFilter; label: string; name?: string }[] = [
  { value: "all", label: "Celý týden" },
  ...WEEK_ORDER.map((weekday) => ({
    value: weekday,
    label: WEEKDAY_SHORT[weekday],
    name: capitalize(WEEKDAY_NAMES[weekday]),
  })),
];

type Props = {
  churches: ChurchSchedule[];
  renderedAt: number;
};

/**
 * "Pravidelné bohoslužby" (design/DESIGN.md §14.2–14.3): the day filter and one card per church. Filtering is
 * client-side; without JS the filter is hidden (the page's <noscript> style) and the whole week shows.
 */
export function RegularServices({ churches, renderedAt }: Props) {
  const today = pragueWeekday(useToday(renderedAt));
  const [filter, setFilter] = useState<DayFilter>("all");

  return (
    <section aria-labelledby="pravidelne-bohosluzby" className="flex flex-col gap-4 md:gap-4.5 lg:gap-5">
      <div className="flex flex-col gap-1 md:flex-row md:flex-wrap md:items-end md:justify-between md:gap-x-4 md:gap-y-2 lg:gap-x-6">
        <h2
          id="pravidelne-bohosluzby"
          className="text-24 font-bold md:text-30 lg:text-40 lg:leading-display lg:tracking-display"
        >
          Pravidelné bohoslužby
        </h2>
        <p className="text-14 text-muted md:text-15 lg:text-16">
          Dnes je {WEEKDAY_NAMES[today]} · změny vždy v ohláškách
        </p>
      </div>

      {/* Mobile: one scrollable row bleeding to the screen edges. Tablet and desktop: wrapping. */}
      <div
        role="group"
        aria-label="Zobrazit den"
        data-js-only
        className="-mx-4 no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:gap-2 md:overflow-visible md:px-0 md:pb-0"
      >
        {chips.map((chip) => {
          const isToday = chip.value === today;
          return (
            <button
              key={chip.label}
              type="button"
              aria-pressed={chip.value === filter}
              aria-label={chip.name && (isToday ? `${chip.name}, dnes` : chip.name)}
              title={isToday ? "dnes" : undefined}
              data-today={isToday || undefined}
              onClick={() => setFilter(chip.value)}
              className={clsx(
                "min-h-11 min-w-12 shrink-0 cursor-pointer rounded-full border-thin border-line bg-surface px-3.5 text-15 font-bold text-ink hover:border-blue",
                "aria-pressed:border-blue aria-pressed:bg-blue aria-pressed:text-white data-today:border-blue",
                "md:min-h-11.5 md:min-w-13 md:px-4 md:text-16 lg:min-h-12 lg:min-w-14 lg:px-4.5",
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-4 md:grid-fit-340 lg:gap-5">
        {churches.map((church) => (
          <ChurchCard
            key={church.id}
            church={church}
            days={filter === "all" ? church.days : church.days.filter((d) => d.weekday === filter)}
            today={today}
          />
        ))}
      </div>
    </section>
  );
}
