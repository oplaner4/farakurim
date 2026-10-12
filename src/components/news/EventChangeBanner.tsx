import { clsx } from "clsx";
import type { NewsEvent } from "@/content/types/news";
import { eventChangeBanner } from "@/lib/news/change";
import { CalendarXIcon } from "@/components/ui/icons/contact-icons";

/**
 * The banner under a cancelled or postponed event's lead (design/DESIGN.md §13.7): "Akce byla zrušena" in magenta,
 * "Akce je přesunuta" in orange, with the note and the day it was announced.
 */
export function EventChangeBanner({ event }: { event: NewsEvent }) {
  const banner = eventChangeBanner(event);
  if (!banner) return null;
  const cancelled = banner.kind === "cancelled";
  return (
    <div
      role="status"
      className={clsx(
        "flex gap-3.5 rounded-20 border-l-6 px-4.5 py-4 text-16 leading-normal md:px-5.5 md:py-4.5 md:text-17 lg:px-6 lg:py-5 lg:text-18",
        cancelled ? "border-magenta bg-magenta-tint" : "border-orange bg-orange-tint",
      )}
    >
      <CalendarXIcon
        size={22}
        className={clsx(
          "mt-0.5 shrink-0 md:size-6 lg:size-6.5",
          cancelled ? "text-magenta-ink" : "text-orange-ink-deep",
        )}
      />
      <span className="flex flex-col gap-1">
        <strong
          className={clsx(
            "text-19 leading-card md:text-21 lg:text-22",
            cancelled ? "text-magenta-ink" : "text-orange-ink-deep",
          )}
        >
          {banner.title}
        </strong>
        {banner.text && <span>{banner.text}</span>}
        {banner.announced && <span className="text-15 text-muted">Oznámeno {banner.announced}</span>}
      </span>
    </div>
  );
}
