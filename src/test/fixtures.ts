import type { NewsEvent } from "@/content/types/news";
import { pragueDateTime } from "@/lib/shared/prague";

// Fixtures shared by the site's tests: event records, instants of Prague time and the events of the event and archive
// tests.

/** A complete event record, valid for the record schema: "Hody v České" on 18. 10. 2026; `fields` replace defaults. */
export const newsEvent = (fields: Partial<NewsEvent> = {}): NewsEvent => ({
  id: "hody-v-ceske",
  title: "Hody v České",
  place: "Česká, náves",
  text: "Stavění máje.",
  start: "2026-10-18",
  ...fields,
});

/** A bare event record: its id as the title, without a place or a text. */
export const event = (id: string, start: string, end?: string, extra: Partial<NewsEvent> = {}): NewsEvent => ({
  id,
  title: id,
  place: "",
  text: "",
  start,
  end,
  ...extra,
});

// Saturday 3. 10. 2026: the week ends on Sunday 4. 10., the month on 31. 10.
export const TODAY = "2026-10-03";

export const events = [
  event("later", "2026-12-19"),
  event("past", "2026-09-20"),
  event("ongoing", "2026-10-02", "2026-10-04"),
  event("soon", "2026-10-07"),
  event("pinned", "2026-10-18", undefined, { pinned: true }),
  event("weekly", "2026-10-01", "2027-04-29", { longTerm: { weeklyAt: "18:30" } }),
  event("long-past", "2026-03-01", "2026-09-30", { longTerm: true }),
];

export const ids = (list: NewsEvent[]) => list.map((e) => e.id);

/** An instant of a Prague date and time, as `useNow()` gives it. */
export const at = (date: string, time = "12:00") => pragueDateTime(date, time).getTime();
