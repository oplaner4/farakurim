import { describe, expect, it } from "vitest";
import type { NewsEvent } from "@/content/types/news";
import { eventJsonLd, parishJsonLd } from "./structured-data";

const URL = "https://farakurim.cz/aktuality/x/";

const event = (extra: Partial<NewsEvent>): NewsEvent => ({
  id: "x",
  title: "Hody v České",
  place: "Česká, náves",
  text: "Stavění máje.",
  start: "2026-10-18",
  ...extra,
});

describe("eventJsonLd", () => {
  it("makes a root-relative poster absolute", () => {
    const poster = { src: "/uploads/aktuality/hody-ceska-plakat.webp", alt: "Plakát" };
    expect(eventJsonLd(event({ poster }), URL).image).toBe(
      "https://farakurim.cz/uploads/aktuality/hody-ceska-plakat.webp",
    );
  });

  it("keeps an absolute poster and omits a missing one", () => {
    const poster = { src: "https://example.cz/plakat.webp", alt: "Plakát" };
    expect(eventJsonLd(event({ poster }), URL).image).toBe("https://example.cz/plakat.webp");
    expect(eventJsonLd(event({}), URL)).not.toHaveProperty("image");
  });

  it("marks a cancelled or postponed event", () => {
    expect(eventJsonLd(event({ change: { status: "cancelled" } }), URL).eventStatus).toBe(
      "https://schema.org/EventCancelled",
    );
    const moved = eventJsonLd(
      event({ change: { status: "moved", previousStart: "2026-10-11", previousStartTime: "9:30" } }),
      URL,
    );
    expect(moved.eventStatus).toBe("https://schema.org/EventRescheduled");
    expect(moved.previousStartDate).toBe("2026-10-11T09:30+02:00");
    const movedDay = eventJsonLd(event({ change: { status: "moved", previousStart: "2026-10-11" } }), URL);
    expect(movedDay.previousStartDate).toBe("2026-10-11");
    expect(eventJsonLd(event({}), URL)).not.toHaveProperty("eventStatus");
  });

  it("dates a one-day event with its Prague times, and a multi-day one by its days", () => {
    const timed = eventJsonLd(event({ startTime: "18:00", endTime: "20:00" }), URL);
    expect([timed.startDate, timed.endDate]).toEqual(["2026-10-18T18:00+02:00", "2026-10-18T20:00+02:00"]);
    const winter = eventJsonLd(event({ start: "2026-11-01", startTime: "9:30" }), URL);
    expect([winter.startDate, winter.endDate]).toEqual(["2026-11-01T09:30+01:00", "2026-11-01"]);
    const allDay = eventJsonLd(event({}), URL);
    expect([allDay.startDate, allDay.endDate]).toEqual(["2026-10-18", "2026-10-18"]);
    const days = eventJsonLd(event({ end: "2026-10-19", startTime: "18:00", endTime: "20:00" }), URL);
    expect([days.startDate, days.endDate]).toEqual(["2026-10-18", "2026-10-19"]);
  });
});

describe("parishJsonLd", () => {
  const church = parishJsonLd("https://farakurim.cz/kontakty/", "2026-10-14");

  it("describes the parish with one id on every page", () => {
    expect(church).toMatchObject({
      "@type": "Church",
      "@id": "https://farakurim.cz/#farnost",
      url: "https://farakurim.cz/kontakty/",
      address: { streetAddress: "Křížkovského 55/5", postalCode: "664 34", addressLocality: "Kuřim" },
      email: "fara.kurim@seznam.cz",
    });
    expect(parishJsonLd("https://farakurim.cz/", "2026-10-14")["@id"]).toBe(church["@id"]);
  });

  it("gives the phone in international form and the office hours with a break limited to its season", () => {
    expect(church.telephone).toBe("+420723661146");
    expect(church.openingHoursSpecification).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "https://schema.org/Monday",
        opens: "09:00",
        closes: "10:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "https://schema.org/Thursday",
        opens: "19:00",
        closes: "20:00",
        validFrom: "2026-09-01",
        validThrough: "2027-06-30",
      },
    ]);
  });

  it("never publishes a slot as open during its summer break", () => {
    const thursday = parishJsonLd("https://farakurim.cz/", "2027-07-15").openingHoursSpecification[1];
    expect(thursday).toMatchObject({ validFrom: "2027-09-01", validThrough: "2028-06-30" });
  });
});
