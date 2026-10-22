import { describe, expect, it } from "vitest";
import { newsEvent } from "@/test/fixtures";
import { eventLine, notEndedBy } from "./upcoming-events";

describe("notEndedBy", () => {
  it("keeps what has not ended by the date", () => {
    const events = [
      newsEvent({ id: "vcera", start: "2026-10-21" }),
      newsEvent({ id: "dnes", start: "2026-10-22" }),
      newsEvent({ id: "tyden", start: "2026-10-20", end: "2026-10-25" }),
      newsEvent({ id: "trvale", start: "2025-09-01", end: "2026-12-31", longTerm: true }),
    ];
    expect(notEndedBy(events, "2026-10-22").map((event) => event.id)).toEqual(["dnes", "tyden", "trvale"]);
  });
});

describe("eventLine", () => {
  it("puts the id, title, dates and place on one line", () => {
    expect(eventLine(newsEvent({ id: "hody-2026", start: "2026-10-18" }))).toBe(
      "hody-2026: Hody v České, 2026-10-18, Česká, náves",
    );
    expect(eventLine(newsEvent({ id: "hody-2026", start: "2026-10-18", end: "2026-10-19" }))).toBe(
      "hody-2026: Hody v České, 2026-10-18–2026-10-19, Česká, náves",
    );
  });
});
