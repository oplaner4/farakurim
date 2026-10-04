import { format } from "date-fns";
import { contacts, parish, SITE_URL } from "@/content/site";
import type { NewsEvent } from "@/content/types";
import { telHref } from "./links";
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
    ...(event.place && { location: { "@type": "Place", name: event.place, address: event.place } }),
    // Uploaded posters are root-relative; search engines need the full URL.
    ...(event.poster && { image: new URL(event.poster.src, SITE_URL).href }),
    url,
    organizer: { "@type": "Organization", name: parish.name, url: SITE_URL },
  };
}

const SCHEMA_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hhmm = (time: string) => time.padStart(5, "0");

/** schema.org/Church of the Kontakty page (design/DESIGN.md §15.3): address, phone, e-mail, office hours. */
export function parishJsonLd(url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Church",
    name: parish.name,
    url,
    address: {
      "@type": "PostalAddress",
      streetAddress: contacts.street,
      postalCode: contacts.postalCode,
      addressLocality: contacts.town,
      addressCountry: "CZ",
    },
    telephone: telHref(contacts.officePhone).slice("tel:".length),
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
