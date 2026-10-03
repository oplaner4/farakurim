"use client";

import type { NewsEvent } from "@/content/types";
import { relativeEventLabel } from "@/lib/czech";
import { useToday } from "@/hooks/use-now";

const label = "rounded-full px-2.5 py-0.75 text-13 font-bold md:px-3 md:text-14 lg:py-1";

/** "Doporučujeme" (pinned, until it ends) and the relative time ("Za 15 dní", "Proběhlo"), by the visitor's date. */
export function EventDetailLabels({
  event,
  renderedAt,
}: {
  event: Pick<NewsEvent, "start" | "end" | "pinned">;
  renderedAt: number;
}) {
  const today = useToday(renderedAt);
  const relative = relativeEventLabel(event, today);
  return (
    <ul className="flex flex-wrap gap-1.5 md:gap-2">
      {event.pinned && relative !== "Proběhlo" && (
        <li className={`${label} bg-magenta-tint text-magenta-ink`}>Doporučujeme</li>
      )}
      <li className={`${label} bg-blue-tint text-blue-ink`}>{relative}</li>
    </ul>
  );
}
