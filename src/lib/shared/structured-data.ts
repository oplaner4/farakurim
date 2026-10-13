import { format } from "date-fns";
import { contacts, parish, SITE_URL } from "@/content/site";
import type { NewsEvent } from "@/content/types/news";
import { telHref } from "./links";
import { eventTimes } from "@/lib/news/timing";
import { inPrague, pragueDateTime } from "./prague";

const isoDateTime = (date: string, time: string) =>
  format(pragueDateTime(date, time), "yyyy-MM-dd'T'HH:mmXXX", { in: inPrague });

/** schema.org/Event of a detail page (design/DESIGN.md §13.5); dates with the Prague offset when timed. */
/** schema.org's status of a cancelled or postponed event (§13.7); a postponed one also names its first date. */
function eventStatusJsonLd({ change }: NewsEvent) {
  if (change?.status === "cancelled") return { eventStatus: "https://schema.org/EventCancelled" };
  if (change?.status === "moved") {
    const { previousStart, previousStartTime } = change;
    return {
      eventStatus: "https://schema.org/EventRescheduled",
      previousStartDate: previousStartTime ? isoDateTime(previousStart, previousStartTime) : previousStart,
    };
  }
  return {};
}

export function eventJsonLd(event: NewsEvent, url: string) {
  const { start, end = start } = event;
  const { startTime, endTime } = end === start ? eventTimes(event) : {};
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.lead ?? event.text,
    startDate: startTime ? isoDateTime(start, startTime) : start,
    endDate: startTime && endTime ? isoDateTime(start, endTime) : end,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...eventStatusJsonLd(event),
    ...(event.place && { location: { "@type": "Place", name: event.place, address: event.place } }),
    // Uploaded posters are root-relative; search engines need the full URL.
    ...(event.poster && { image: new URL(event.poster.src, SITE_URL).href }),
    url,
    organizer: { "@type": "Organization", name: parish.name, url: SITE_URL },
  };
}

const SCHEMA_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hhmm = (time: string) => time.padStart(5, "0");

/**
 * schema.org/Church of the Kontakty page (design/DESIGN.md §15.3) and the home page: address, phone, e-mail, office
 * hours. The shared `@id` tells search engines both pages describe the same parish.
 */
export function parishJsonLd(url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Church",
    "@id": `${SITE_URL}/#farnost`,
    name: parish.name,
    url,
    address: {
      "@type": "PostalAddress",
      streetAddress: contacts.street,
      postalCode: contacts.postalCode,
      addressLocality: contacts.town,
      addressCountry: "CZ",
    },
    telephone: telHref(contacts.phone).slice("tel:".length),
    email: contacts.email,
    openingHoursSpecification: contacts.officeHours.map((slot) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${SCHEMA_DAYS[slot.weekday]}`,
      opens: hhmm(slot.from),
      closes: hhmm(slot.to),
    })),
  };
}

/** JSON for a <script type="application/ld+json">, with `<` escaped so the content can't close the tag. */
export const jsonLdScript = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c");
