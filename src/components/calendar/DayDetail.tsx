import { clsx } from "clsx";
import type { IsoDate } from "@/content/types/shared";
import { type AgendaItem, type CalendarStatus, dayHeading, itemTime } from "@/lib/calendar/agenda";

const KIND = { services: "Bohoslužba", events: "Akce" };

/** The selected day's programme (design/DESIGN.md §16.2, 4). */
export function DayDetail({
  date,
  today,
  items,
  status,
}: {
  date: IsoDate;
  today: IsoDate;
  items: AgendaItem[];
  /** The day's entries are still loading (or failed): don't claim an empty day. */
  status: CalendarStatus;
}) {
  return (
    <section
      aria-busy={status === "loading"}
      aria-labelledby="vybrany-den"
      className="flex flex-col gap-3 rounded-24 bg-surface p-4.5 md:p-5.5 lg:p-6"
    >
      <h2 id="vybrany-den" aria-live="polite" className="text-18 font-bold md:text-20 lg:text-22">
        {dayHeading(date, today)}
      </h2>
      {status !== "ready" ? (
        <p className="text-ink-2">
          {status === "loading" ? "Načítám program…" : "Program tohoto dne se teď nepodařilo načíst."}
        </p>
      ) : items.length === 0 ? (
        <p className="text-ink-2">V tento den není v kalendáři nic.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.key} className="flex gap-3 rounded-14 bg-raised px-3.5 py-3">
              <span
                aria-hidden="true"
                className={clsx("w-1.25 flex-none rounded-4", item.calendar === "services" ? "bg-blue" : "bg-magenta")}
              />
              <span className="shrink-0 basis-17.5 font-bold">{itemTime(item)}</span>
              <span className="flex min-w-0 flex-col">
                {item.href ? (
                  <a href={item.href} className="font-bold">
                    {item.title}
                  </a>
                ) : (
                  <span className="font-bold">{item.title}</span>
                )}
                <span className="text-14 text-muted">
                  {item.place && `${item.place} · `}
                  {KIND[item.calendar]}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
