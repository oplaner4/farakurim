import { clsx } from "clsx";
import { parishCalendars } from "@/content/site";
import type { CalendarId } from "@/content/types/calendar";
import { addToMonth, type IsoMonth, monthHeading } from "@/lib/calendar/agenda";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons/navigation-icons";

const toolbarButton =
  "flex min-h-11 cursor-pointer items-center justify-center rounded-12 border-thin border-line bg-raised font-bold hover:bg-surface disabled:cursor-default disabled:opacity-40 disabled:hover:bg-raised";

/** The filter colours; the labels are the calendars' names (`parishCalendars`). */
const FILTERS: { id: CalendarId; on: string; off: string }[] = [
  { id: "services", on: "border-blue bg-blue text-white", off: "border-blue text-blue-ink" },
  { id: "events", on: "border-magenta bg-magenta text-white", off: "border-magenta text-magenta-ink" },
];

type Props = {
  month: IsoMonth;
  canGoBack: boolean;
  canGoForward: boolean;
  onShowMonth: (month: IsoMonth) => void;
  onToday: () => void;
  /** Which calendars are shown. */
  shown: Record<CalendarId, boolean>;
  onToggle: (calendar: CalendarId) => void;
};

/**
 * Kalendář toolbar (§16.2, 2): month paging with the month as the heading, "Dnes", and the two calendar filters.
 * The buttons need JS, so they are hidden without it.
 */
export function CalendarToolbar({ month, canGoBack, canGoForward, onShowMonth, onToday, shown, onToggle }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          data-js-only
          aria-label="Předchozí měsíc"
          disabled={!canGoBack}
          onClick={() => onShowMonth(addToMonth(month, -1))}
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
          disabled={!canGoForward}
          onClick={() => onShowMonth(addToMonth(month, 1))}
          className={clsx(toolbarButton, "w-11 text-ink")}
        >
          <ChevronRightIcon />
        </button>
        <button
          type="button"
          data-js-only
          onClick={onToday}
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
            onClick={() => onToggle(filter.id)}
            className={clsx(
              "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-thin px-3.5 text-15 font-bold",
              shown[filter.id] ? filter.on : clsx(filter.off, "bg-raised"),
            )}
          >
            <span aria-hidden="true" className="size-2.5 rounded-full bg-current" />
            {parishCalendars[filter.id].name}
          </button>
        ))}
      </div>
    </div>
  );
}
