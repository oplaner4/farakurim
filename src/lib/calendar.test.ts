import { describe, expect, it } from "vitest";
import type { NewsEvent } from "@/content/types";
import { eventCalendar, eventClock } from "./calendar";

const URL = "https://farakurim.cz/aktuality/x/";

const event = (extra: Partial<NewsEvent>): NewsEvent => ({
  id: "x",
  title: "Hody v České",
  place: "Česká, náves",
  text: "Stavění máje.",
  start: "2026-10-18",
  ...extra,
});

/** Unfolded content lines without the per-build DTSTAMP. */
const lines = (ics: string) =>
  ics
    .replace(/\r\n[ \t]/g, "")
    .split("\r\n")
    .filter((l) => !l.startsWith("DTSTAMP"));

describe("eventCalendar", () => {
  it("writes a timed event in UTC from Prague wall-clock time", () => {
    const out = lines(eventCalendar(event({ time: "9:30" }), URL));
    expect(out).toContain("DTSTART:20261018T073000Z");
    expect(out.some((l) => l.startsWith("DTEND"))).toBe(false);
    expect(out).toContain("SUMMARY:Hody v České");
    expect(out).toContain("LOCATION:Česká\\, náves");
    expect(out).toContain(`URL:${URL}`);
    expect(out).toContain(`DESCRIPTION:Stavění máje.\\n\\n${URL}`);
    expect(out).toContain("UID:hody-v-ceske@farakurim.cz");
  });

  it("uses the end time of a range, in winter time after 25. 10.", () => {
    const out = lines(eventCalendar(event({ start: "2026-11-01", time: "18:00–20:30" }), URL));
    expect(out).toContain("DTSTART:20261101T170000Z");
    expect(out).toContain("DTEND:20261101T193000Z");
  });

  it("makes multi-day events and unparsable times all-day, ending the day after", () => {
    const out = lines(eventCalendar(event({ start: "2026-10-02", end: "2026-10-04", time: "9:30" }), URL));
    expect(out).toContain("DTSTART;VALUE=DATE:20261002");
    expect(out).toContain("DTEND;VALUE=DATE:20261005");
    expect(lines(eventCalendar(event({ time: "po mši" }), URL))).toContain("DTSTART;VALUE=DATE:20261018");
  });

  it("repeats weekly series", () => {
    const weekly = lines(
      eventCalendar(event({ start: "2026-10-01", end: "2027-04-29", longTerm: { weeklyAt: "18:30" } }), URL),
    );
    expect(weekly).toContain("DTSTART:20261001T163000Z");
    expect(weekly).toContain("RRULE:FREQ=WEEKLY;UNTIL=20270429T215900Z");
    const sessions = lines(
      eventCalendar(event({ start: "2026-10-11", end: "2026-11-22", time: "18:00–20:30", sessions: 7 }), URL),
    );
    expect(sessions).toContain("RRULE:FREQ=WEEKLY;COUNT=7");
    // Seven meetings that don't fit a weekly rhythm stay one all-day span.
    const irregular = lines(eventCalendar(event({ start: "2026-10-11", end: "2026-11-15", sessions: 7 }), URL));
    expect(irregular).toContain("DTEND;VALUE=DATE:20261116");
  });
});

describe("eventClock", () => {
  it.each([
    ["9:30", { from: "9:30" }],
    ["18:00–20:30", { from: "18:00", to: "20:30" }],
    ["18:00 - 20:30", { from: "18:00", to: "20:30" }],
    ["18:00 – 20:30", { from: "18:00", to: "20:30" }],
  ])("reads %s", (time, clock) => {
    expect(eventClock(event({ time }))).toEqual(clock);
  });

  it.each(["po mši", "18.00", "od 18:00", "18:00, 20:00", ""])("leaves %j untimed", (time) => {
    expect(eventClock(event({ time }))).toBeUndefined();
  });

  it("takes a weekly series' time over the free-text time", () => {
    expect(eventClock(event({ time: "9:00", longTerm: { weeklyAt: "18:30" } }))).toEqual({ from: "18:30" });
    expect(eventClock(event({ time: "9:00", longTerm: true }))).toEqual({ from: "9:00" });
  });
});
