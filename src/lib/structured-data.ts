import { format } from "date-fns";
import { parish, SITE_URL } from "@/content/site";
import type { NewsEvent } from "@/content/types";
import { eventClock } from "./calendar";
import { inPrague, pragueDateTime } from "./prague";

const isoDateTime = (date: string, time: string) =>
  format(pragueDateTime(date, time), "yyyy-MM-dd'T'HH:mmXXX", { in: inPrague });

/** schema.org/Event of a detail page (design/DESIGN.md §13.5); dates with the Prague offset when timed. */
export function eventJsonLd(event: NewsEvent, url: string) {
  const { start, end = start } = event;
  const clock = end === start ? eventClock(event) : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.lead ?? event.text,
    startDate: clock ? isoDateTime(start, clock.from) : start,
    endDate: clock?.to ? isoDateTime(start, clock.to) : end,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: event.place, address: event.place },
    ...(event.poster && { image: event.poster.src }),
    url,
    organizer: { "@type": "Organization", name: parish.name, url: SITE_URL },
  };
}

/** JSON for a <script type="application/ld+json">, with `<` escaped so the content can't close the tag. */
export const jsonLdScript = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c");
