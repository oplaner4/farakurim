import type { NativitySeason } from "@/content/types/nativity";
import { formatShortDate, weekdayName } from "@/lib/shared/czech";
import { CalendarIcon } from "@/components/ui/icons/contact-icons";
import { NativitySection } from "./NativitySection";

/**
 * "Co uvidíte" (design/DESIGN.md §30.2): the year's guest collection on the orange tint, with its materials, the
 * guided tour and the other exhibitors, then the small cards of what else is on show.
 */
export function WhatToSee({ season }: { season: NativitySeason }) {
  const { guest } = season;
  return (
    <NativitySection id="co" title="Co uvidíte" color="orange">
      {guest && (
        <div className="relative grid gap-5 overflow-hidden rounded-24 bg-orange-tint p-5 md:grid-cols-2 md:gap-7 md:rounded-26 md:p-6 lg:rounded-28 lg:p-7">
          <span aria-hidden="true" className="absolute top-0 right-0 size-16 bg-orange shard-tr" />
          <div className="relative flex min-w-0 flex-col gap-2.5">
            <span className="self-start rounded-full bg-orange px-3 py-0.5 text-13 font-bold text-on-orange">
              {guest.label}
            </span>
            <h3 className="text-22 leading-snug font-bold md:text-24 lg:text-28">{guest.title}</h3>
            <p className="text-ink-2">{guest.text}</p>
            <ul aria-label="Materiály" className="flex flex-wrap gap-1.5">
              {guest.materials.map((m) => (
                <li key={m} className="rounded-full bg-raised px-2.5 py-0.5 text-13 font-bold text-orange-ink-deep">
                  {m}
                </li>
              ))}
            </ul>
            {guest.tour && (
              <div className="flex items-center gap-3 rounded-14 bg-raised px-3.5 py-3">
                <span
                  aria-hidden="true"
                  className="flex size-11 flex-none items-center justify-center rounded-12 bg-orange text-on-orange"
                >
                  <CalendarIcon size={20} />
                </span>
                <span className="flex flex-col leading-compact">
                  <strong>{guest.tour.title}</strong>
                  <span className="text-15 text-ink-2">
                    {weekdayName(guest.tour.date)} {formatShortDate(guest.tour.date)} · {guest.tour.from}–
                    {guest.tour.to} · {guest.tour.place}
                  </span>
                </span>
              </div>
            )}
          </div>
          <div className="relative flex min-w-0 flex-col">
            <h4 className="mb-1 text-15 font-bold text-orange-ink-deep">Vystavují také</h4>
            <ul>
              {guest.exhibitors.map((e) => (
                <li key={e.name} className="flex flex-col border-t border-line py-2.5">
                  <strong className="text-16">
                    {e.name} <span className="font-normal text-muted">· {e.place}</span>
                  </strong>
                  <span className="text-15 text-ink-2">{e.work}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <ul className="grid gap-2.5 md:grid-cols-3">
        {season.highlights.map((h) => (
          <li key={h.title} className="flex flex-col gap-1.5 rounded-18 bg-surface p-4.5">
            <strong className="text-18 leading-snug">{h.title}</strong>
            <span className="text-15 text-ink-2">{h.text}</span>
          </li>
        ))}
      </ul>
    </NativitySection>
  );
}
