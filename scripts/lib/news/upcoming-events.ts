// The events of the news folder that have not ended by a date, and a one-line form of an event to read them in a
// short list.

import type { NewsEvent } from "@/content/types/news";

/** The events of `events` that have not ended by `date` (a long-term event without an end never has). */
export const notEndedBy = (events: NewsEvent[], date: string) =>
  events.filter((event) => (event.end ?? (event.longTerm ? date : event.start)) >= date);

/** An event on one line: "pout-2026: Pouť do Lukova, 2026-12-19, Lukov". */
export const eventLine = ({ id, title, start, end, place }: NewsEvent) =>
  `${id}: ${title}, ${start}${end ? `–${end}` : ""}${place ? `, ${place}` : ""}`;
