import { describe, expect, it } from "vitest";
import type { NewsEvent } from "@/content/types/news";
import { eventJsonLd } from "./structured-data";

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
    expect(eventJsonLd(event({}), URL)).not.toHaveProperty("eventStatus");
  });
});
