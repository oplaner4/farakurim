"use client";

import { DayButton, DayPicker, type DayButtonProps } from "@daypicker/react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { useSearchParams } from "next/navigation";
import { createContext, type ReactNode, Suspense, use, useMemo, useState } from "react";
import type { CalendarEntry, CalendarId, IsoDate } from "@/content/types";
import {
  addToMonth,
  type AgendaItem,
  agendaByDate,
  dayCellLabel,
  type IsoMonth,
  monthGridRange,
  monthHeading,
  parseDayParam,
  parseMonthParam,
} from "@/lib/agenda";
import { capitalize } from "@/lib/czech";
import { inPrague, pragueDateTime } from "@/lib/prague";
import { updateQueryParams } from "@/lib/query-params";
import { GOOGLE_CALENDAR_API_KEY } from "@/content/site";
import { useCalendarEntries } from "@/lib/use-calendar";
import { useToday } from "@/lib/use-now";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { DayDetail } from "./DayDetail";

const MAX_LABELS = 2;
const EMPTY: AgendaItem[] = [];

const asDate = (date: IsoDate) => pragueDateTime(date, "12:00");

/** The visible days' items, read by the day buttons (DayPicker renders them). */
const AgendaContext = createContext<Map<IsoDate, AgendaItem[]>>(new Map());

/**
 * One day of the grid (§16.2, 3). Mobile: the number with a blue (services) and a magenta (events) dot.
 * Tablet and desktop: up to two event labels, "+N další" and "3× mše".
 */
function AgendaDayButton({ day, modifiers, className, ...rest }: DayButtonProps) {
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

// The month heading lives in the toolbar.
const components = { DayButton: AgendaDayButton, MonthCaption: () => <></> };

const formatters = {
  /** "Po", "Út", … */
  formatWeekdayName: (date: Date) => capitalize(format(date, "cccccc", { locale: cs, in: inPrague })),
};

const toolbarButton =
  "flex min-h-11 cursor-pointer items-center justify-center rounded-12 border-thin border-line bg-raised font-bold hover:bg-surface disabled:cursor-default disabled:opacity-40 disabled:hover:bg-raised";

const FILTERS: { id: CalendarId; label: string; on: string; off: string }[] = [
  { id: "services", label: "Mše a adorace", on: "border-blue bg-blue text-white", off: "border-blue text-blue-ink" },
  {
    id: "events",
    label: "Události",
    on: "border-magenta bg-magenta text-white",
    off: "border-magenta text-magenta-ink",
  },
];

type Props = {
  /** Prerendered entries of `months`; the browser re-reads Google Calendar when it has a key. */
  entries: CalendarEntry[];
  /**
   * The prerendered months. Without an API key nothing else can be loaded, so paging stops at them.
   */
  months: { first: IsoMonth; last: IsoMonth };
  /** Event ID → Aktuality detail page. */
  hrefs: Record<string, string>;
  renderedAt: number;
  /** "Kalendář v telefonu", under the day detail. */
  children: ReactNode;
};

type ViewProps = Props & { monthParam?: IsoMonth; dayParam?: IsoDate };

/** Without an API key, only the prerendered months have entries. */
const bounded = !GOOGLE_CALENDAR_API_KEY;

function MonthCalendarView({ entries, months, hrefs, renderedAt, children, monthParam, dayParam }: ViewProps) {
  const today = useToday(renderedAt);
  const [shown, setShown] = useState<Record<CalendarId, boolean>>({ services: true, events: true });
  const selected = dayParam ?? today;
  const requested = monthParam ?? selected.slice(0, 7);
  const { first, last } = months;
  const month = !bounded ? requested : requested < first ? first : requested > last ? last : requested;
  const range = monthGridRange(month);

  const initial = useMemo(
    () => ({ entries, range: { from: monthGridRange(first).from, to: monthGridRange(last).to } }),
    [entries, first, last],
  );
  const { entries: loaded, status } = useCalendarEntries(initial, range, hrefs);
  const selectedInGrid = selected >= range.from && selected <= range.to;
  const agenda = useMemo(
    () =>
      agendaByDate(
        loaded.filter((e) => shown[e.calendar]),
        // The selected day can lie outside the shown month after paging.
        { from: selected < range.from ? selected : range.from, to: selected > range.to ? selected : range.to },
      ),
    [loaded, shown, selected, range.from, range.to],
  );

  // Today and the current month leave the URL clean.
  const showMonth = (next: IsoMonth) =>
    updateQueryParams({ mesic: next === selected.slice(0, 7) ? null : next }, { replace: true });
  const selectDay = (date: IsoDate) =>
    updateQueryParams({ den: date === today ? null : date, mesic: null }, { replace: true });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-js-only
            aria-label="Předchozí měsíc"
            disabled={bounded && month <= first}
            onClick={() => showMonth(addToMonth(month, -1))}
            className={clsx(toolbarButton, "w-11 text-ink")}
          >
            <ChevronLeftIcon />
          </button>
          <h2
            aria-live="polite"
            className="min-w-35 text-center text-18 font-bold md:min-w-42.5 md:text-20 lg:min-w-45 lg:text-22"
          >
            {monthHeading(month)}
          </h2>
          <button
            type="button"
            data-js-only
            aria-label="Další měsíc"
            disabled={bounded && month >= last}
            onClick={() => showMonth(addToMonth(month, 1))}
            className={clsx(toolbarButton, "w-11 text-ink")}
          >
            <ChevronRightIcon />
          </button>
          <button
            type="button"
            data-js-only
            onClick={() => updateQueryParams({ den: null, mesic: null }, { replace: true })}
            className={clsx(toolbarButton, "px-3.5 text-15 text-blue-ink")}
          >
            Dnes
          </button>
        </div>
        <div role="group" aria-label="Zobrazit" data-js-only className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={shown[filter.id]}
              onClick={() => setShown((s) => ({ ...s, [filter.id]: !s[filter.id] }))}
              className={clsx(
                "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-thin px-3.5 text-15 font-bold",
                shown[filter.id] ? filter.on : clsx(filter.off, "bg-raised"),
              )}
            >
              <span aria-hidden="true" className="size-2.5 rounded-full bg-current" />
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 md:gap-7 lg:flex-row lg:flex-wrap lg:items-start lg:gap-8">
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
              onMonthChange={(date) => showMonth(format(date, "yyyy-MM", { in: inPrague }))}
              selected={asDate(selected)}
              onSelect={(date) => selectDay(format(date, "yyyy-MM-dd", { in: inPrague }))}
              today={asDate(today)}
              startMonth={bounded ? asDate(`${first}-01`) : undefined}
              endMonth={bounded ? asDate(`${last}-01`) : undefined}
              components={components}
              formatters={formatters}
              labels={{
                labelDayButton: (date) => {
                  const iso = format(date, "yyyy-MM-dd", { in: inPrague });
                  return dayCellLabel(iso, agenda.get(iso) ?? EMPTY);
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
        <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:items-start md:gap-4 lg:flex lg:min-w-0 lg:grow lg:basis-85 lg:gap-6">
          <DayDetail
            date={selected}
            today={today}
            items={agenda.get(selected) ?? EMPTY}
            status={selectedInGrid ? status : "ready"}
          />
          {children}
        </div>
      </div>
    </>
  );
}

function MonthCalendarWithParams(props: Props) {
  const params = useSearchParams();
  return (
    <MonthCalendarView
      {...props}
      monthParam={parseMonthParam(params.get("mesic"))}
      dayParam={parseDayParam(params.get("den"))}
    />
  );
}

/**
 * Toolbar, month grid and day detail of the Kalendář (design/DESIGN.md §16.2–16.3). The month and the selected
 * day live in the URL (`?mesic=2026-11`, `?den=2026-10-18`); the prerendered HTML shows today in the build's
 * month (the Suspense fallback).
 */
export function MonthCalendar(props: Props) {
  return (
    <Suspense fallback={<MonthCalendarView {...props} />}>
      <MonthCalendarWithParams {...props} />
    </Suspense>
  );
}
