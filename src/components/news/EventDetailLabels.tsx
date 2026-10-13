"use client";

import type { NewsEvent } from "@/content/types/news";
import { eventEnd, type EventTiming, relativeEventLabel } from "@/lib/news/timing";
import { useNow, useToday } from "@/hooks/use-now";

const label = "rounded-full px-2.5 py-0.75 text-13 font-bold md:px-3 md:text-14 lg:py-1";

/**
 * "Doporučujeme" (pinned, until it ends) and the relative time ("Za 15 dní", "Právě probíhá", "Proběhlo"), by the
 * visitor's time; only "Zrušeno" for a cancelled event (§13.7).
 */
export function EventDetailLabels({
  event,
  cancelled,
  renderedAt,
}: {
  event: EventTiming & Pick<NewsEvent, "pinned">;
  cancelled: boolean;
  renderedAt: number;
}) {
  const today = useToday(renderedAt);
  const relative = relativeEventLabel(event, useNow(renderedAt));
  if (cancelled) {
    return (
      <ul className="flex flex-wrap gap-1.5 md:gap-2">
        <li className={`${label} bg-ink text-bg`}>Zrušeno</li>
      </ul>
    );
  }
  return (
    <ul className="flex flex-wrap gap-1.5 md:gap-2">
      {event.pinned && eventEnd(event) >= today && (
        <li className={`${label} bg-magenta-tint text-magenta-ink`}>Doporučujeme</li>
      )}
      <li className={`${label} bg-blue-tint text-blue-ink`}>{relative}</li>
    </ul>
  );
}
