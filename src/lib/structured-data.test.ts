import { describe, expect, it } from "vitest";
import type { NewsEvent } from "@/content/types";
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
});
