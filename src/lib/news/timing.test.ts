import { describe, expect, it } from "vitest";
import type { NewsEvent } from "@/content/types/news";
import { eventProgress, eventTimes, isPast, meetingsOf, progressLabel, relativeEventLabel } from "./timing";
import { at, event, events, TODAY } from "@/test/fixtures";

describe("isPast", () => {
  it("is past from the day after the end", () => {
    expect(isPast(events[2], "2026-10-04")).toBe(false);
    expect(isPast(events[2], "2026-10-05")).toBe(true);
  });
});

describe("eventProgress", () => {
  const evening = event("x", "2026-10-18", undefined, { startTime: "18:00", endTime: "20:30" });

  it("is today before the start time, now until the end time, then nothing", () => {
    expect(eventProgress(evening, at("2026-10-17", "19:00"))).toBeUndefined();
    expect(eventProgress(evening, at("2026-10-18", "10:00"))).toEqual({ kind: "today", time: "18:00" });
    expect(eventProgress(evening, at("2026-10-18", "18:00"))).toEqual({ kind: "now" });
    expect(eventProgress(evening, at("2026-10-18", "20:29"))).toEqual({ kind: "now" });
    expect(eventProgress(evening, at("2026-10-18", "20:30"))).toBeUndefined();
  });

  it("is now for the rest of the day after a start time without an end", () => {
    const mass = event("x", "2026-10-18", undefined, { startTime: "9:30" });
    expect(eventProgress(mass, at("2026-10-18", "9:00"))).toEqual({ kind: "today", time: "9:30" });
    expect(eventProgress(mass, at("2026-10-18", "23:59"))).toEqual({ kind: "now" });
  });

  it("is now all day for an event without a start time and every day of a multi-day event", () => {
    expect(eventProgress(event("x", "2026-10-18"), at("2026-10-18", "0:00"))).toEqual({ kind: "now" });
    const feast = event("x", "2026-10-02", "2026-10-04", { startTime: "18:00" });
    expect(eventProgress(feast, at("2026-10-02", "8:00"))).toEqual({ kind: "now" });
    expect(eventProgress(feast, at("2026-10-04", "23:00"))).toEqual({ kind: "now" });
    expect(eventProgress(feast, at("2026-10-05", "0:00"))).toBeUndefined();
  });

  it("names the next meeting of a series between its meetings, skipping dropped ones", () => {
    const series = event("x", "2026-10-11", "2026-10-25", {
      startTime: "18:00",
      endTime: "20:30",
      sessions: ["2026-10-11", "2026-10-18", "2026-10-25"],
      cancelledMeetings: { dates: ["2026-10-18"] },
    });
    expect(eventProgress(series, at("2026-10-10"))).toBeUndefined();
    expect(eventProgress(series, at("2026-10-11", "19:00"))).toEqual({ kind: "now" });
    expect(eventProgress(series, at("2026-10-11", "21:00"))).toEqual({ kind: "next", date: "2026-10-25" });
    expect(eventProgress(series, at("2026-10-13"))).toEqual({ kind: "next", date: "2026-10-25" });
    expect(eventProgress(series, at("2026-10-25", "17:00"))).toEqual({ kind: "today", time: "18:00" });
    expect(eventProgress(series, at("2026-10-25", "21:00"))).toBeUndefined();
  });

  it("is nothing for long-term and cancelled events", () => {
    expect(eventProgress(events[5], at(TODAY))).toBeUndefined();
    const cancelled = event("x", "2026-10-03", undefined, { change: { status: "cancelled" } });
    expect(eventProgress(cancelled, at(TODAY))).toBeUndefined();
  });
});

describe("progressLabel", () => {
  it("says what is happening", () => {
    expect(progressLabel({ kind: "now" })).toBe("Právě probíhá");
    expect(progressLabel({ kind: "today", time: "18:00" })).toBe("Dnes v 18:00");
    expect(progressLabel({ kind: "today", time: "14:00" })).toBe("Dnes ve 14:00");
    expect(progressLabel({ kind: "next", date: "2026-10-25" })).toBe("Další setkání 25. 10.");
  });
});

describe("eventTimes", () => {
  it("is the event's times, or a weekly series' weeklyAt", () => {
    expect(eventTimes({ startTime: "18:00", endTime: "20:30" })).toEqual({ startTime: "18:00", endTime: "20:30" });
    expect(eventTimes({ startTime: "9:00", longTerm: { weeklyAt: "18:30" } })).toEqual({ startTime: "18:30" });
    expect(eventTimes({ startTime: "9:00", longTerm: true })).toEqual({ startTime: "9:00" });
    expect(eventTimes({})).toEqual({});
  });
});

describe("meetingsOf", () => {
  it("is each meeting of a series, the first day of a weekly one, else the event's span", () => {
    const times = { startTime: "13:00", endTime: "18:00" };
    // A meeting's own start time replaces both of the event's times.
    const sessions = ["2026-10-11", { date: "2026-10-18", startTime: "19:00" }];
    expect(meetingsOf(event("a", "2026-10-11", undefined, { ...times, sessions }))).toEqual([
      { start: "2026-10-11", end: "2026-10-11", ...times },
      { start: "2026-10-18", end: "2026-10-18", startTime: "19:00" },
    ]);
    expect(meetingsOf(event("a", "2026-10-12", "2027-06-30", { ...times, longTerm: { weeklyAt: "18:30" } }))).toEqual([
      { start: "2026-10-12", end: "2026-10-12", startTime: "18:30" },
    ]);
    expect(meetingsOf(event("a", "2026-10-12", "2026-10-14", times))).toEqual([
      { start: "2026-10-12", end: "2026-10-14", ...times },
    ]);
  });

  it("marks the dropped meetings, and every meeting of a cancelled event, as cancelled", () => {
    const sessions = ["2026-10-11", "2026-10-18", "2026-10-25"];
    const series = event("a", "2026-10-11", "2026-10-25", { sessions, cancelledMeetings: { dates: ["2026-10-18"] } });
    expect(meetingsOf(series).map((m) => m.cancelled)).toEqual([undefined, true, undefined]);
    const cancelled = { change: { status: "cancelled" } } as const;
    expect(
      meetingsOf(event("a", "2026-10-11", "2026-10-25", { sessions, ...cancelled })).every((m) => m.cancelled),
    ).toBe(true);
    expect(meetingsOf(event("a", "2026-10-12", undefined, cancelled))).toEqual([
      { start: "2026-10-12", end: "2026-10-12", cancelled: true },
    ]);
  });
});

describe("relativeEventLabel", () => {
  const span = (start: string, end?: string, extra: Partial<NewsEvent> = {}) => event("", start, end, extra);
  it("counts Prague calendar days to the start", () => {
    expect(relativeEventLabel(span("2026-10-18"), at("2026-10-03"))).toBe("Za 15 dní");
    expect(relativeEventLabel(span("2026-10-06"), at("2026-10-03"))).toBe("Za 3 dny");
    // Across the change to winter time on 25. 10.
    expect(relativeEventLabel(span("2026-10-27"), at("2026-10-24"))).toBe("Za 3 dny");
    expect(relativeEventLabel(span("2026-10-04"), at("2026-10-03"))).toBe("Zítra");
    expect(relativeEventLabel(span("2026-10-03"), at("2026-10-03"))).toBe("Dnes");
  });

  it("marks running, started and finished events", () => {
    const evening = span("2026-10-03", undefined, { startTime: "18:00", endTime: "20:30" });
    expect(relativeEventLabel(evening, at("2026-10-03", "10:00"))).toBe("Dnes");
    expect(relativeEventLabel(evening, at("2026-10-03", "19:00"))).toBe("Právě probíhá");
    expect(relativeEventLabel(evening, at("2026-10-03", "21:00"))).toBe("Dnes");
    expect(relativeEventLabel(span("2026-10-02", "2026-10-04"), at("2026-10-04"))).toBe("Právě probíhá");
    const series = span("2026-10-11", "2026-10-25", { sessions: ["2026-10-11", "2026-10-25"] });
    expect(relativeEventLabel(series, at("2026-10-13"))).toBe("Další setkání 25. 10.");
    expect(relativeEventLabel(events[5], at(TODAY))).toBe("Právě probíhá");
    expect(relativeEventLabel(span("2026-10-02", "2026-10-04"), at("2026-10-05"))).toBe("Proběhlo");
    expect(relativeEventLabel(span("2026-10-02"), at("2026-10-03"))).toBe("Proběhlo");
  });
});
