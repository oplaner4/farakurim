import { clsx } from "clsx";
import type { ChurchColor, PlaceId } from "@/content/types/services";
import type { Weekday } from "@/content/types/shared";
import { capitalize, WEEKDAY_NAMES } from "@/lib/shared/czech";
import type { ScheduleDay } from "@/lib/services/masses";
import { NEW_TAB } from "@/lib/shared/links";
import { PinIcon } from "@/components/ui/icons";

/** What a card needs; the page passes only these fields to the client. */
export type ChurchSchedule = {
  id: PlaceId;
  place: string;
  church?: string;
  color: ChurchColor;
  mapHref: string;
  byAgreement?: boolean;
  days: ScheduleDay[];
};

/** The church's own logo colour (§14.3). White text only on blue; green and orange take dark text. */
const colors: Record<ChurchColor, { top: string; tint: string; ink: string; pill: string }> = {
  blue: { top: "border-t-blue", tint: "bg-blue-tint", ink: "text-blue-ink", pill: "bg-blue text-white" },
  green: { top: "border-t-green", tint: "bg-green-tint", ink: "text-green-ink", pill: "bg-green text-on-green" },
  orange: { top: "border-t-orange", tint: "bg-orange-tint", ink: "text-orange-ink", pill: "bg-orange text-on-orange" },
};

type Props = {
  church: ChurchSchedule;
  /** The days to show (already filtered). */
  days: ScheduleDay[];
  today: Weekday;
};

export function ChurchCard({ church, days, today }: Props) {
  const color = colors[church.color];
  return (
    <article className="flex flex-col overflow-hidden rounded-20 border border-line bg-raised">
      <div className={clsx("flex items-center justify-between gap-3 border-t-6 p-4", color.top)}>
        <div className="flex min-w-0 flex-col">
          <h3 className="text-18 leading-card font-bold">{church.place}</h3>
          {church.church && <span className="text-14 text-muted">{church.church}</span>}
        </div>
        <a
          href={church.mapHref}
          {...NEW_TAB}
          aria-label={`Mapa: ${church.place}`}
          className={clsx("flex size-11 flex-none items-center justify-center rounded-12", color.tint, color.ink)}
        >
          <PinIcon />
        </a>
      </div>

      {church.byAgreement ? (
        <p className="px-4 pb-4 text-ink-2">Bohoslužby dle domluvy na faře.</p>
      ) : days.length === 0 ? (
        <p className="px-4 pb-4 text-ink-2">Tento den zde není bohoslužba.</p>
      ) : (
        days.map((day) => {
          const isToday = day.weekday === today;
          return (
            <div
              key={day.weekday}
              className={clsx("flex flex-col border-t border-line px-4 py-2.5", isToday && color.tint)}
            >
              <h4 className={clsx("flex items-center gap-2 text-14 font-bold", color.ink)}>
                {capitalize(WEEKDAY_NAMES[day.weekday])}
                {isToday && <span className={clsx("rounded-full px-2 py-px text-12", color.pill)}>dnes</span>}
              </h4>
              <ul>
                {day.rows.map((row) => (
                  <li key={`${row.time} ${row.title}`} className="flex gap-2.5 py-1">
                    <strong className="w-14 shrink-0 text-17">{row.time}</strong>
                    <span className="flex min-w-0 flex-col">
                      <span>{row.title}</span>
                      {row.note && <span className="text-14 text-muted">{row.note}</span>}
                      {row.tag && (
                        <span className="mt-0.5 self-start rounded-full bg-orange-tint px-2 py-px text-12 font-bold text-orange-ink-deep">
                          {row.tag}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </article>
  );
}
