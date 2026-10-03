import { describe, expect, it } from "vitest";
import { eventsUrl, toEntries } from "./google-calendar";

describe("eventsUrl", () => {
  it("asks for expanded events of the Prague days", () => {
    const url = new URL(eventsUrl("abc@group.calendar.google.com", "KEY", { from: "2026-10-01", to: "2026-10-31" }));
    expect(url.pathname).toBe("/calendar/v3/calendars/abc%40group.calendar.google.com/events");
    expect(url.searchParams.get("singleEvents")).toBe("true");
    expect(url.searchParams.get("timeMin")).toBe("2026-10-01T00:00:00.000+02:00");
    // The day after the range, already in winter time.
    expect(url.searchParams.get("timeMax")).toBe("2026-11-01T00:00:00.000+01:00");
  });
});

describe("toEntries", () => {
  const hrefs = new Map([["series", "/aktuality/vecery/"]]);

  it("converts timed, all-day and multi-day events", () => {
    const entries = toEntries(
      [
        {
          id: "m1",
          summary: "Mše svatá",
          location: "Kuřim",
          start: { dateTime: "2026-10-04T08:00:00+02:00" },
          end: { dateTime: "2026-10-04T09:00:00+02:00" },
        },
        { id: "h", summary: "Hody", start: { date: "2026-10-02" }, end: { date: "2026-10-05" } },
        { id: "k", summary: "Koláč", start: { date: "2026-10-07" }, end: { date: "2026-10-08" } },
        {
          id: "v_1",
          recurringEventId: "series",
          summary: "Večery",
          start: { dateTime: "2026-10-11T18:00:00+02:00" },
          end: { dateTime: "2026-10-12T00:00:00+02:00" },
        },
      ],
      "events",
      hrefs,
    );
    expect(entries).toEqual([
      { id: "m1", calendar: "events", title: "Mše svatá", place: "Kuřim", date: "2026-10-04", time: "8:00" },
      { id: "h", calendar: "events", title: "Hody", date: "2026-10-02", end: "2026-10-04" },
      { id: "k", calendar: "events", title: "Koláč", date: "2026-10-07" },
      { id: "v_1", calendar: "events", title: "Večery", href: "/aktuality/vecery/", date: "2026-10-11", time: "18:00" },
    ]);
  });

  it("drops cancelled instances", () => {
    expect(toEntries([{ id: "x", status: "cancelled", start: {}, end: {} }], "services", hrefs)).toEqual([]);
  });
});
