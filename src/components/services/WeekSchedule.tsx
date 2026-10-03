"use client";

import { clsx } from "clsx";
import { useState } from "react";
import type { SheetDay } from "@/content/types";
import { formatWeekdayDate } from "@/lib/czech";
import { showWeekLabel, weekView } from "@/lib/service-sheet";
import { useToday } from "@/lib/use-now";

type Props = {
  /** Public rows only (`publicDays`), with place names instead of IDs. */
  days: SheetDay[];
  renderedAt: number;
};

/**
 * "Rozpis bohoslužeb tento týden" (design/DESIGN.md §14.6): one row per day of the ohlášky. Today and the coming
 * days show by default; the toggle adds the past days, dimmed. Without JS the build day decides and the toggle
 * is hidden.
 */
export function WeekSchedule({ days, renderedAt }: Props) {
  const today = useToday(renderedAt);
  const [showPast, setShowPast] = useState(false);
  const view = weekView(days, today, showPast);

  return (
    <section aria-labelledby="rozpis" className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h2 id="rozpis" className="text-22 leading-heading font-bold md:text-26 lg:text-32">
          Rozpis bohoslužeb tento týden
        </h2>
        {view.pastCount > 0 && (
          <button
            type="button"
            aria-expanded={showPast}
            aria-controls="rozpis-dny"
            onClick={() => setShowPast((v) => !v)}
            data-js-only
            className="min-h-11 px-1 text-15 font-bold text-blue-ink hover:text-blue-ink-hover"
          >
            {showPast ? "Skrýt proběhlé dny" : showWeekLabel(view.pastCount)}
          </button>
        )}
      </div>

      <ol id="rozpis-dny" className="flex flex-col overflow-hidden rounded-20 border border-line bg-raised">
        {view.days.map((day) => {
          const isToday = day.date === today;
          return (
            <li
              key={day.date}
              aria-current={isToday ? "date" : undefined}
              className={clsx(
                "flex gap-3 border-line px-3.5 py-3.5 not-first:border-t md:gap-4 md:px-5 lg:gap-6 lg:px-7",
                isToday && "bg-blue-tint",
                day.date < today && "opacity-60",
              )}
            >
              <div className="flex shrink-0 basis-16 flex-col leading-snug md:basis-25 lg:basis-35">
                <strong className={clsx("text-17", day.solemnity ? "text-blue-ink" : "text-ink")}>
                  {formatWeekdayDate(day.date)}
                </strong>
                {isToday && (
                  <span className="mt-1 self-start rounded-full bg-blue px-2 py-px text-12 font-bold text-white">
                    dnes
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {day.feast && (
                  <span
                    className={clsx(
                      "text-13 font-bold tracking-label",
                      day.solemnity ? "text-magenta-ink" : "text-muted",
                    )}
                  >
                    {day.feast}
                  </span>
                )}
                <ul className="flex flex-col gap-1.5">
                  {day.rows.map((row) => (
                    <li
                      key={`${row.time} ${row.place} ${row.title}`}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
                    >
                      <strong className="basis-13 md:basis-14 lg:basis-16">{row.time}</strong>
                      <span className="min-w-0 flex-1 text-14 text-muted md:flex-none md:basis-37.5 lg:basis-45">
                        {row.place}
                      </span>
                      <span className="min-w-0 basis-full md:flex-1 md:basis-0">
                        {row.title}
                        {row.detail && ` – ${row.detail}`}
                        {row.changed && (
                          <span className="ml-1.5 rounded-full bg-orange-tint px-2 py-px text-12 font-bold whitespace-nowrap text-orange-ink-deep">
                            změna
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
