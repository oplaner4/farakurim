import { describe, expect, it } from "vitest";
import { newsEvent } from "@/test/fixtures";
import { eventCalendar } from "./ics";

const URL = "https://farakurim.cz/aktuality/hody-v-ceske/";

/** Unfolded content lines without the per-build DTSTAMP. */
const lines = (ics: string) =>
  ics
    .replace(/\r\n[ \t]/g, "")
    .split("\r\n")
    .filter((l) => !l.startsWith("DTSTAMP"));

describe("eventCalendar", () => {
  it("writes a timed event in UTC from Prague wall-clock time", () => {
    const out = lines(eventCalendar(newsEvent({ startTime: "9:30" }), URL));
    expect(out).toContain("DTSTART:20261018T073000Z");
    expect(out.some((l) => l.startsWith("DTEND"))).toBe(false);
    expect(out).toContain("SUMMARY:Hody v České");
    expect(out).toContain("LOCATION:Česká\\, náves");
    expect(out).toContain(`URL:${URL}`);
    expect(out).toContain(`DESCRIPTION:Stavění máje.\\n\\n${URL}`);
    expect(out).toContain("UID:hody-v-ceske@farakurim.cz");
  });

  it("uses the end time of a range, in winter time after 25. 10.", () => {
    const out = lines(eventCalendar(newsEvent({ start: "2026-11-01", startTime: "18:00", endTime: "20:30" }), URL));
    expect(out).toContain("DTSTART:20261101T170000Z");
    expect(out).toContain("DTEND:20261101T193000Z");
  });

  it("makes multi-day events and events without a start time all-day, ending the day after", () => {
    const out = lines(eventCalendar(newsEvent({ start: "2026-10-02", end: "2026-10-04", startTime: "9:30" }), URL));
    expect(out).toContain("DTSTART;VALUE=DATE:20261002");
    expect(out).toContain("DTEND;VALUE=DATE:20261005");
    expect(lines(eventCalendar(newsEvent({}), URL))).toContain("DTSTART;VALUE=DATE:20261018");
  });

  it("repeats weekly series", () => {
    const weekly = lines(
      eventCalendar(newsEvent({ start: "2026-10-01", end: "2027-04-29", longTerm: { weeklyAt: "18:30" } }), URL),
    );
    expect(weekly).toContain("DTSTART:20261001T163000Z");
    expect(weekly).toContain("RRULE:FREQ=WEEKLY;UNTIL=20270429T215900Z");
  });

  it("writes one event per meeting of a series, with its own time and UID", () => {
    const series = newsEvent({
      start: "2026-10-17",
      end: "2026-11-22",
      startTime: "19:00",
      endTime: "21:30",
      sessions: [{ date: "2026-10-17", startTime: "9:00" }, "2026-10-27", { date: "2026-11-21", end: "2026-11-22" }],
    });
    const out = lines(eventCalendar(series, URL));
    expect(out.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(3);
    expect(out).toContain("DTSTART:20261017T070000Z");
    expect(out).toContain("DTSTART:20261027T180000Z");
    expect(out).toContain("DTEND:20261027T203000Z");
    expect(out).toContain("DTSTART;VALUE=DATE:20261121");
    expect(out).toContain("DTEND;VALUE=DATE:20261123");
    expect(out).toContain("UID:hody-v-ceske-2026-10-27@farakurim.cz");
    expect(out.some((l) => l.startsWith("RRULE"))).toBe(false);
  });

  it("keeps the UID of a cancelled or postponed event and raises its SEQUENCE", () => {
    const cancelled = lines(eventCalendar(newsEvent({ startTime: "9:30", change: { status: "cancelled" } }), URL));
    expect(cancelled).toContain("UID:hody-v-ceske@farakurim.cz");
    expect(cancelled).toContain("STATUS:CANCELLED");
    expect(cancelled).toContain("SEQUENCE:2");
    const moved = lines(eventCalendar(newsEvent({ change: { status: "moved", previousStart: "2026-10-11" } }), URL));
    expect(moved).toContain("SEQUENCE:1");
    expect(moved.some((l) => l.startsWith("STATUS"))).toBe(false);
    expect(lines(eventCalendar(newsEvent({}), URL)).some((l) => l.startsWith("SEQUENCE"))).toBe(false);
  });

  it("cancels only the dropped meeting of a series", () => {
    const series = newsEvent({
      end: "2026-10-25",
      sessions: ["2026-10-18", "2026-10-25"],
      cancelledMeetings: { dates: ["2026-10-25"] },
    });
    const out = lines(eventCalendar(series, URL)).join("\n");
    const [first, second] = out.split("BEGIN:VEVENT").slice(1);
    expect(first).not.toContain("STATUS:CANCELLED");
    expect(second).toContain("STATUS:CANCELLED");
  });
});
