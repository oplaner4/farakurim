import type { NewsEvent } from "@/content/types/news";
import {
  atClockTime,
  capitalize,
  formatDateRange,
  formatFromWeekdayDate,
  formatNumericDate,
  formatShortDate,
  formatShortDates,
  plural,
  weekdayName,
} from "@/lib/shared/czech";
import { eventClock } from "./ics";

// The texts of a cancelled or postponed event and of a series' dropped meetings (design/DESIGN.md §11.9, §13.7).

/** The look of a status note line: magenta for a cancellation, orange for a move or a dropped meeting. */
export type EventNoteKind = "cancelled" | "moved" | "changed";

/**
 * The status note line of a card (§11.9) under the date and place: "Zrušeno: <note>", "Přesunuto ze soboty 17. 10.
 * <note>", "Změna: setkání 18. 10. odpadá, ostatní termíny platí.". None for an event without a change.
 */
export function eventNote(event: NewsEvent): { kind: EventNoteKind; label: string; text: string } | undefined {
  const { change, cancelledMeetings } = event;
  if (change?.status === "cancelled")
    return { kind: "cancelled", label: "Zrušeno:", text: change.note ?? "Akce se nekoná." };
  if (change?.status === "moved") {
    const text = [formatFromWeekdayDate(change.previousStart), change.note].filter(Boolean).join(" ");
    return { kind: "moved", label: "Přesunuto", text };
  }
  if (cancelledMeetings) {
    const { dates, note } = cancelledMeetings;
    const verb = plural(dates.length, ["odpadá", "odpadají", "odpadají"]);
    const text = `setkání ${formatShortDates(dates)} ${verb}, ostatní termíny platí.`;
    return { kind: "changed", label: "Změna:", text: note ? `${text} ${note}` : text };
  }
  return undefined;
}

/**
 * The detail page's banner (§13.7) for a cancelled or postponed event: its title, its text and the day it was
 * announced ("12. 10. 2026"). None for other events.
 */
export function eventChangeBanner(
  event: NewsEvent,
): { kind: "cancelled" | "moved"; title: string; text?: string; announced?: string } | undefined {
  const { change } = event;
  if (!change) return undefined;
  const announced = change.announced && formatNumericDate(change.announced);
  if (change.status === "cancelled")
    return { kind: "cancelled", title: "Akce byla zrušena", text: change.note, announced };
  const { start, end = start } = event;
  const clock = end === start ? eventClock(event) : undefined;
  const day = end === start ? `${weekdayName(start)} ${formatNumericDate(start)}` : formatDateRange(start, end);
  const time = clock ? ` ${atClockTime(clock.from)}` : event.time && end === start ? `, ${event.time}` : "";
  const text = [
    `Nový termín: ${day}${time}.`,
    `Původně ${formatShortDate(change.previousStart)}`,
    change.note && capitalize(change.note),
  ];
  return { kind: "moved", title: "Akce je přesunuta", text: text.filter(Boolean).join(" "), announced };
}
