import { describe, expect, it } from "vitest";
import type { CalendarEntry } from "@/content/types/calendar";
import { isMeeting, meetingLabel, meetingRange, meetingTile, nextMeeting, shortPlace } from "./meetings";

const entry = (id: string, date: string, title: string, time?: string): CalendarEntry => ({
  id,
  calendar: "events",
  title,
  date,
  ...(time && { time }),
});

describe("isMeeting", () => {
  it("ignores case and diacritics", () => {
    expect(isMeeting({ title: "Setkávání společenství mladých" }, "společenství mladých")).toBe(true);
    expect(isMeeting({ title: "SETKAVANI SPOLECENSTVI MLADYCH" }, "společenství mladých")).toBe(true);
    expect(isMeeting({ title: "Velikonoční fórum mladých" }, "společenství mladých")).toBe(false);
  });
});

describe("nextMeeting", () => {
  const title = "společenství mladých";
  const entries = [
    entry("a", "2026-10-04", "Setkávání společenství mladých", "18:30"),
    entry("b", "2026-10-18", "Setkávání společenství mladých", "18:30"),
    entry("c", "2026-10-11", "Setkávání společenství mladých", "18:30"),
    entry("d", "2026-10-07", "Farní kavárna", "10:30"),
  ];

  it("takes the earliest meeting from today on", () => {
    expect(nextMeeting(entries, title, "2026-10-06")?.id).toBe("c");
  });

  it("keeps today's meeting until the day ends", () => {
    expect(nextMeeting(entries, title, "2026-10-11")?.id).toBe("c");
  });

  it("orders meetings of one day by time", () => {
    const day = [
      entry("late", "2026-10-11", "Společenství mladých", "18:30"),
      entry("early", "2026-10-11", "Společenství mladých", "9:00"),
    ];
    expect(nextMeeting(day, title, "2026-10-11")?.id).toBe("early");
  });

  it("returns nothing when no meeting is ahead", () => {
    expect(nextMeeting(entries, title, "2026-10-19")).toBeUndefined();
  });
});

describe("meetingLabel and meetingTile", () => {
  it("writes the day and the time", () => {
    expect(meetingLabel({ date: "2026-10-11", time: "18:30" })).toBe("Neděle 11. 10. v 18:30");
    expect(meetingLabel({ date: "2026-10-13" })).toBe("Úterý 13. 10.");
    expect(meetingTile("2026-10-11")).toEqual({ weekday: "NE", day: "11" });
  });
});

describe("shortPlace", () => {
  it("drops the postcode and the country", () => {
    expect(shortPlace("Křížkovského 55, 664 34 Kuřim, Česko")).toBe("Křížkovského 55, Kuřim");
    expect(shortPlace("Farní klubovna")).toBe("Farní klubovna");
  });
});

describe("meetingRange", () => {
  it("covers eight weeks from today, across the change to winter time", () => {
    expect(meetingRange("2026-10-06")).toEqual({ from: "2026-10-06", to: "2026-11-30" });
  });
});
