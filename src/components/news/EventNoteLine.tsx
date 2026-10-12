import { clsx } from "clsx";
import type { NewsEvent } from "@/content/types/news";
import { eventNote } from "@/lib/news/change";
import { NoticeIcon } from "@/components/ui/icons/status-icons";

/**
 * The status note line of an event card (design/DESIGN.md §11.9): "Zrušeno: …" in magenta, "Přesunuto …" and
 * "Změna: …" in orange. Nothing for an event without a change.
 */
export function EventNoteLine({ event, className }: { event: NewsEvent; className?: string }) {
  const note = eventNote(event);
  if (!note) return null;
  return (
    <p
      className={clsx(
        "flex items-start gap-2 text-15 leading-verse md:text-16 lg:text-17",
        note.kind === "cancelled" ? "text-magenta-ink" : "text-orange-ink-deep",
        className,
      )}
    >
      <NoticeIcon size={16} className="mt-0.75 shrink-0 lg:size-4.25" />
      <span>
        <strong>{note.label}</strong> {note.text}
      </span>
    </p>
  );
}
