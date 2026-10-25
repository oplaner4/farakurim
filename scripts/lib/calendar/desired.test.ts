import { describe, expect, it } from "vitest";
import type { NewsEvent } from "@/content/types/news";
import type { GoogleEvent } from "@/lib/calendar/google-calendar";
import { calendarEventId, desiredEvents, eventBody } from "./desired";

const testEvent = (fields: Partial<NewsEvent> = {}): NewsEvent => ({
  id: "farni-den-2026",
  title: "Farní den",
  start: "2026-06-13",
  startTime: "14:00",
  place: "Kuřim",
  text: "Text farního dne.",
  ...fields,
});

const weekly = testEvent({
  id: "obnova",
  title: "Obnova v Duchu svatém",
  start: "2026-10-01",
  end: "2027-04-29",
  startTime: undefined,
  longTerm: { weeklyAt: "18:30" },
});

describe("calendarEventId", () => {
  it("is a stable id of Google's alphabet, different for the weekly event", () => {
    const id = calendarEventId("farni-den-2026", "2026-06-13");
    expect(id).toMatch(/^[0-9a-v]{5,1024}$/);
    expect(calendarEventId("farni-den-2026", "2026-06-13")).toBe(id);
    expect(calendarEventId("farni-den-2026", "weekly")).not.toBe(id);
  });
});

describe("desiredEvents", () => {
  it("is one item keyed by the start for a one-day event", () => {
    const [item] = desiredEvents(testEvent(), "2026-06-01");
    expect(desiredEvents(testEvent(), "2026-06-01")).toHaveLength(1);
    expect(item).toMatchObject({
      newsId: "farni-den-2026",
      key: "2026-06-13",
      summary: "Farní den",
      location: "Kuřim",
      googleId: calendarEventId("farni-den-2026", "2026-06-13"),
    });
    expect(item.description).toBe("Text farního dne.\n\nhttps://farakurim.cz/aktuality/farni-den-2026/");
  });

  it("uses the lead for the description", () => {
    expect(desiredEvents(testEvent({ lead: "Krátce." }), "2026-06-01")[0].description).toMatch(/^Krátce\.\n\n/);
  });

  it("keeps only the meetings ending on or after today", () => {
    const event = testEvent({ start: "2026-01-13", sessions: ["2026-01-13", "2026-01-20", "2026-01-27"] });
    expect(desiredEvents(event, "2026-01-20").map((item) => item.key)).toEqual(["2026-01-20", "2026-01-27"]);
  });

  it("has nothing for a long-term event without a weekly time", () => {
    expect(desiredEvents(testEvent({ longTerm: true }), "2026-06-01")).toEqual([]);
  });

  it("is one weekly item until the event's end", () => {
    const items = desiredEvents(weekly, "2026-10-23");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ key: "weekly", weeklyUntil: "2027-04-29" });
  });

  it("prefixes the title of a cancelled event", () => {
    const event = testEvent({ change: { status: "cancelled" } } as Partial<NewsEvent>);
    expect(desiredEvents(event, "2026-06-01")[0].summary).toBe("Zrušeno: Farní den");
  });

  it("prefixes only a dropped meeting of a series", () => {
    const event = testEvent({
      start: "2026-01-13",
      sessions: ["2026-01-13", "2026-01-20"],
      cancelledMeetings: { dates: ["2026-01-20"] },
    } as Partial<NewsEvent>);
    expect(desiredEvents(event, "2026-01-01").map((item) => item.summary)).toEqual(["Farní den", "Zrušeno: Farní den"]);
  });
});

describe("eventBody", () => {
  const timed = (start: string, startTime: string, endTime?: string) =>
    desiredEvents(testEvent({ start, startTime, endTime }), "2026-01-01")[0];

  it("writes a timed meeting in Prague time with the offset of its date", () => {
    expect(eventBody(timed("2026-01-13", "18:00", "19:30"))).toMatchObject({
      start: { dateTime: "2026-01-13T18:00:00+01:00", timeZone: "Europe/Prague" },
      end: { dateTime: "2026-01-13T19:30:00+01:00", timeZone: "Europe/Prague" },
    });
    expect(eventBody(timed("2026-07-14", "18:00", "19:30")).start.dateTime).toBe("2026-07-14T18:00:00+02:00");
  });

  it("writes a multi-day or time-less meeting as all-day, ending the day after", () => {
    const multi = desiredEvents(testEvent({ end: "2026-06-15", startTime: undefined }), "2026-01-01")[0];
    expect(eventBody(multi)).toMatchObject({ start: { date: "2026-06-13" }, end: { date: "2026-06-16" } });
    const open = desiredEvents(testEvent({ startTime: undefined }), "2026-01-01")[0];
    expect(eventBody(open)).toMatchObject({ start: { date: "2026-06-13" }, end: { date: "2026-06-14" } });
  });

  it("repeats a weekly event until the end of its last day", () => {
    const body = eventBody(desiredEvents(weekly, "2026-10-23")[0]);
    expect(body.recurrence).toEqual(["RRULE:FREQ=WEEKLY;UNTIL=20270429T215900Z"]);
    expect(body.start).toEqual({ dateTime: "2026-10-01T18:30:00+02:00", timeZone: "Europe/Prague" });
  });

  it("gives a meeting without an end time one hour, or keeps the duration of the current event", () => {
    const meeting = timed("2026-06-13", "14:00");
    expect(eventBody(meeting).end.dateTime).toBe("2026-06-13T15:00:00+02:00");
    const zero: GoogleEvent = {
      id: "x",
      start: { dateTime: "2026-06-13T14:00:00+02:00" },
      end: { dateTime: "2026-06-13T14:00:00+02:00" },
    };
    expect(eventBody(meeting, zero).end.dateTime).toBe("2026-06-13T15:00:00+02:00");
    const current: GoogleEvent = {
      id: "x",
      start: { dateTime: "2026-06-13T13:00:00+02:00" },
      end: { dateTime: "2026-06-13T15:00:00+02:00" },
    };
    expect(eventBody(meeting, current).end.dateTime).toBe("2026-06-13T16:00:00+02:00");
    const allDay: GoogleEvent = { id: "x", start: { date: "2026-06-13" }, end: { date: "2026-06-14" } };
    expect(eventBody(meeting, allDay).end.dateTime).toBe("2026-06-13T15:00:00+02:00");
  });
});
