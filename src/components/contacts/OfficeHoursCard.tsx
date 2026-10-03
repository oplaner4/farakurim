"use client";

import { clsx } from "clsx";
import type { OfficeHours } from "@/content/types";
import { capitalize, WEEKDAY_NAMES } from "@/lib/czech";
import { officeHoursApply, officeStatus } from "@/lib/office";
import { pragueDate } from "@/lib/prague";
import { useNow } from "@/lib/use-now";
import { ContactCard } from "./ContactCard";

type Props = {
  hours: OfficeHours[];
  renderedAt: number;
};

const rowClass = "flex gap-3 rounded-10 border-t border-line px-2.5 py-3";

/**
 * "Úřední hodiny" (design/DESIGN.md §15.2): a live status line and the weekly slots, today's highlighted.
 * Prerendered with the build time; the browser switches to the visitor's time after hydration.
 */
export function OfficeHoursCard({ hours, renderedAt }: Props) {
  const now = useNow(renderedAt);
  const today = pragueDate(now);
  const status = officeStatus(hours, now);

  return (
    <ContactCard id="uredni-hodiny" title="Úřední hodiny" spacing={3.5}>
      <p
        role="status"
        className={clsx(
          "flex items-center gap-2.5 rounded-12 px-3.5 py-2.5 text-15 font-bold",
          status.open ? "bg-green-tint text-green-ink" : "bg-surface text-ink-2",
        )}
      >
        <span
          aria-hidden="true"
          className={clsx("size-2.5 flex-none rounded-full", status.open ? "bg-green" : "bg-field-line")}
        />
        {status.text}
      </p>
      <dl className="flex flex-col">
        {hours.map((slot) => (
          <div
            key={`${slot.weekday} ${slot.from}`}
            className={clsx(rowClass, officeHoursApply(slot, today) && "bg-blue-tint")}
          >
            <dt className="w-27.5 shrink-0 font-bold">{capitalize(WEEKDAY_NAMES[slot.weekday])}</dt>
            <dd className="flex flex-col">
              <span>
                {slot.from}–{slot.to}
              </span>
              {slot.note && <span className="text-14 text-muted">{slot.note}</span>}
            </dd>
          </div>
        ))}
        <div className={clsx(rowClass, "border-b")}>
          <dt className="w-27.5 shrink-0 font-bold">Jindy</dt>
          <dd>dle domluvy</dd>
        </div>
      </dl>
    </ContactCard>
  );
}
