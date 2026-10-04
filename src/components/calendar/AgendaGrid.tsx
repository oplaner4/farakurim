"use client";

import { DayPicker } from "@daypicker/react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import type { IsoDate } from "@/content/types/shared";
import { type AgendaItem, dayCellLabel, type IsoMonth } from "@/lib/calendar/agenda";
import { capitalize } from "@/lib/shared/czech";
import { inPrague, pragueDateTime } from "@/lib/shared/prague";
import type { CalendarStatus } from "@/hooks/use-calendar-entries";
import { AgendaContext, AgendaDayButton } from "./AgendaDayButton";

const asDate = (date: IsoDate) => pragueDateTime(date, "12:00");

// The month heading lives in the toolbar.
const components = { DayButton: AgendaDayButton, MonthCaption: () => <></> };

const formatters = {
  /** "Po", "Út", … */
  formatWeekdayName: (date: Date) => capitalize(format(date, "cccccc", { locale: cs, in: inPrague })),
};

type Props = {
  month: IsoMonth;
  selected: IsoDate;
  today: IsoDate;
  /** Items of the shown days (and the selected one). */
  agenda: Map<IsoDate, AgendaItem[]>;
  status: CalendarStatus;
  /** Paging limits, when only some months have entries. */
  bounds?: { first: IsoMonth; last: IsoMonth };
  onShowMonth: (month: IsoMonth) => void;
  onSelectDay: (date: IsoDate) => void;
};

/**
 * The month grid (§16.2, 3): DayPicker in Prague time with our day cells. It handles the keyboard: arrows move
 * between days, Enter selects, PageUp/PageDown change the month.
 */
export function AgendaGrid({ month, selected, today, agenda, status, bounds, onShowMonth, onSelectDay }: Props) {
  return (
    <AgendaContext value={agenda}>
      {/* The table's border spacing is the grid gap; the negative margin aligns the outer cells. */}
      <div
        aria-busy={status === "loading"}
        data-status={status}
        className="relative -m-1.5 min-w-0 md:-m-2 lg:grow-999 lg:basis-160"
      >
        {/* A range outside the prerendered months is dimmed until Google Calendar answers. */}
        <p
          role="status"
          className="absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center px-4 text-center"
        >
          {status !== "ready" && (
            <span className="rounded-14 bg-raised px-4 py-2.5 font-bold text-ink-2 shadow-card">
              {status === "loading"
                ? "Načítám kalendář…"
                : "Kalendář se teď nepodařilo načíst. Zkuste to prosím později."}
            </span>
          )}
        </p>
        <DayPicker
          mode="single"
          required
          locale={cs}
          timeZone="Europe/Prague"
          weekStartsOn={1}
          showOutsideDays
          hideNavigation
          month={asDate(`${month}-01`)}
          onMonthChange={(date) => onShowMonth(format(date, "yyyy-MM", { in: inPrague }))}
          selected={asDate(selected)}
          onSelect={(date) => onSelectDay(format(date, "yyyy-MM-dd", { in: inPrague }))}
          today={asDate(today)}
          startMonth={bounds && asDate(`${bounds.first}-01`)}
          endMonth={bounds && asDate(`${bounds.last}-01`)}
          components={components}
          formatters={formatters}
          labels={{
            labelDayButton: (date) => {
              const iso = format(date, "yyyy-MM-dd", { in: inPrague });
              return dayCellLabel(iso, agenda.get(iso) ?? []);
            },
          }}
          classNames={{
            root: clsx("w-full motion-safe:transition-opacity", status !== "ready" && "opacity-40"),
            months: "w-full",
            month: "w-full",
            month_grid: "w-full table-fixed border-separate border-spacing-1.5 md:border-spacing-2",
            weekday: "text-13 font-bold text-muted",
            day: "p-0",
          }}
        />
      </div>
    </AgendaContext>
  );
}
