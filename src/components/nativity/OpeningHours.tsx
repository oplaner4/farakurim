import { clsx } from "clsx";
import type { NativitySeason } from "@/content/types/nativity";
import type { IsoDate } from "@/content/types/shared";
import { formatWeekdayDate } from "@/lib/shared/czech";
import { NativitySection } from "./NativitySection";

/**
 * "Otevírací doba" (design/DESIGN.md §30.2): one row per opening day with its hours and note; today's row on the
 * green tint with a "dnes" pill, the past days faded.
 */
export function OpeningHours({ season, today }: { season: NativitySeason; today: IsoDate }) {
  return (
    <NativitySection id="doba" title="Otevírací doba" color="orange">
      <ol className="overflow-hidden rounded-18 border border-line">
        {season.openingDays.map((day) => {
          const isToday = day.date === today;
          return (
            <li
              key={day.date}
              className={clsx(
                "flex flex-wrap items-center gap-x-3.5 gap-y-1 border-line px-4 py-3 not-first:border-t",
                isToday ? "bg-green-tint" : "bg-raised",
                day.date < today && "opacity-55",
              )}
            >
              <span className="flex items-center gap-2 md:w-37.5 lg:w-42.5">
                <strong className="text-17">{formatWeekdayDate(day.date).toLowerCase()}</strong>
                {isToday && (
                  <span className="rounded-full bg-green px-2.5 py-0.5 text-13 font-bold text-on-green">dnes</span>
                )}
              </span>
              <strong
                className={clsx("text-17 md:w-32.5 lg:w-35", isToday ? "text-green-ink" : "text-orange-ink-deep")}
              >
                {day.from}–{day.to}
              </strong>
              {day.note && (
                <span className="basis-full text-14 text-muted md:flex-1 md:basis-auto md:text-15">{day.note}</span>
              )}
            </li>
          );
        })}
      </ol>
      {season.hoursNote && <p className="text-15 text-muted">{season.hoursNote}</p>}
    </NativitySection>
  );
}
