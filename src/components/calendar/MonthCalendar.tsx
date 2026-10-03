"use client";

import { useSearchParams } from "next/navigation";
import { type ReactNode, Suspense, useMemo, useState } from "react";
import { GOOGLE_CALENDAR_API_KEY } from "@/content/site";
import type { CalendarEntry, CalendarId, IsoDate } from "@/content/types";
import { agendaByDate, type IsoMonth, monthGridRange, parseDayParam, parseMonthParam } from "@/lib/agenda";
import { updateQueryParams } from "@/lib/query-params";
import { useCalendarEntries } from "@/lib/use-calendar-entries";
import { useToday } from "@/lib/use-now";
import { AgendaGrid } from "./AgendaGrid";
import { CalendarToolbar } from "./CalendarToolbar";
import { DayDetail } from "./DayDetail";

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
  // The URL is only read on load. Paging and selecting update this state in the same render and write the URL
  // alongside: DayPicker keeps the keyboard focus on the moved-to day only when the month changes at once.
  const [view, setView] = useState<{ month?: IsoMonth; day?: IsoDate }>({ month: monthParam, day: dayParam });
  const selected = view.day ?? today;
  const requested = view.month ?? selected.slice(0, 7);
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

  // Today and the selected day's month leave the URL clean.
  function showMonth(next: IsoMonth) {
    const month = next === selected.slice(0, 7) ? undefined : next;
    setView((v) => ({ ...v, month }));
    updateQueryParams({ mesic: month ?? null }, { replace: true });
  }
  function selectDay(date: IsoDate) {
    const day = date === today ? undefined : date;
    setView({ day });
    updateQueryParams({ den: day ?? null, mesic: null }, { replace: true });
  }
  function showToday() {
    setView({});
    updateQueryParams({ den: null, mesic: null }, { replace: true });
  }

  return (
    <>
      <CalendarToolbar
        month={month}
        canGoBack={!bounded || month > first}
        canGoForward={!bounded || month < last}
        onShowMonth={showMonth}
        onToday={showToday}
        shown={shown}
        onToggle={(id) => setShown((s) => ({ ...s, [id]: !s[id] }))}
      />

      <div className="flex flex-col gap-6 md:gap-7 lg:flex-row lg:flex-wrap lg:items-start lg:gap-8">
        <AgendaGrid
          month={month}
          selected={selected}
          today={today}
          agenda={agenda}
          status={status}
          bounds={bounded ? months : undefined}
          onShowMonth={showMonth}
          onSelectDay={selectDay}
        />
        <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:items-start md:gap-4 lg:flex lg:min-w-0 lg:grow lg:basis-85 lg:gap-6">
          <DayDetail
            date={selected}
            today={today}
            items={agenda.get(selected) ?? []}
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
