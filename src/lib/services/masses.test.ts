import { describe, expect, it } from "vitest";
import type { ScheduleSource } from "./masses";
import { countdown, formatMassDay, servicesOnDate, upcomingServices, weeklySchedule } from "./masses";
import { pragueDateTime } from "@/lib/shared/prague";

const source: ScheduleSource = {
  regular: [
    { weekday: 1, time: "8:00", place: "kurim" },
    { weekday: 4, time: "17:30", place: "kurim", title: "Adorace" },
    { weekday: 5, time: "16:45", place: "kurim", rule: "not-first-in-month" },
    { weekday: 5, time: "18:15", place: "kurim", rule: "first-in-month" },
    { weekday: 5, time: "18:00", place: "moravske-kninice" },
    { weekday: 0, time: "8:00", place: "kurim" },
    { weekday: 0, time: "9:30", place: "kurim" },
    { weekday: 0, time: "11:00", place: "moravske-kninice" },
  ],
  exceptions: [
    {
      date: "2026-10-04",
      services: [
        { time: "8:00", place: "kurim" },
        { time: "9:30", place: "moravske-kninice" },
        { time: "11:00", place: "kurim" },
        { time: "15:00", place: "kurim", title: "Velikonoční obřady" },
      ],
    },
    { date: "2026-10-12", services: [] },
  ],
};

const at = (date: string, time: string) => pragueDateTime(date, time).getTime();

describe("pragueDateTime", () => {
  it("uses CEST (UTC+2) in summer and CET (UTC+1) in winter", () => {
    expect(new Date(at("2026-10-04", "8:00")).toISOString()).toBe("2026-10-04T06:00:00.000Z");
    expect(new Date(at("2026-12-19", "8:00")).toISOString()).toBe("2026-12-19T07:00:00.000Z");
  });

  it("handles the day of the autumn DST switch", () => {
    // 25. 10. 2026: clocks go back at 3:00 CEST.
    expect(new Date(at("2026-10-25", "9:30")).toISOString()).toBe("2026-10-25T08:30:00.000Z");
  });
});

describe("servicesOnDate", () => {
  it("returns the regular schedule for a normal day", () => {
    expect(servicesOnDate("2026-10-09", source).map((m) => m.time)).toEqual(["16:45", "18:00"]);
  });

  it("applies first-in-month rules", () => {
    expect(servicesOnDate("2026-10-02", source).map((m) => m.time)).toEqual(["18:00", "18:15"]);
  });

  it("includes titled services, by time", () => {
    expect(servicesOnDate("2026-10-08", source)).toEqual([{ time: "17:30", place: "kurim", title: "Adorace" }]);
  });

  it("replaces the whole day with an exception, titled services included", () => {
    expect(servicesOnDate("2026-10-04", source)).toEqual(source.exceptions[0].services);
    const cancelled = { ...source, exceptions: [{ date: "2026-10-08", services: [] }] };
    expect(servicesOnDate("2026-10-08", cancelled)).toEqual([]);
  });

  it("cancels the day when the exception has no services", () => {
    expect(servicesOnDate("2026-10-12", source)).toEqual([]);
  });
});

describe("upcomingServices", () => {
  it("returns the next services after now, with exceptions applied", () => {
    const list = upcomingServices(at("2026-10-03", "12:00"), source, 4);
    expect(list.map((m) => `${m.date} ${m.time} ${m.place} ${m.title ?? "mše"}`)).toEqual([
      "2026-10-04 8:00 kurim mše",
      "2026-10-04 9:30 moravske-kninice mše",
      "2026-10-04 11:00 kurim mše",
      "2026-10-04 15:00 kurim Velikonoční obřady",
    ]);
  });

  it("counts titled services such as the adoration", () => {
    const list = upcomingServices(at("2026-10-08", "12:00"), source, 1);
    expect(list[0]).toMatchObject({ time: "17:30", title: "Adorace" });
  });

  it("skips a service that has already started", () => {
    const list = upcomingServices(at("2026-10-04", "8:00"), source, 1);
    expect(list[0].time).toBe("9:30");
  });

  it("skips cancelled days and continues into the following week", () => {
    const list = upcomingServices(at("2026-10-11", "12:00"), source, 1);
    expect(`${list[0].date} ${list[0].time}`).toBe("2026-10-15 17:30");
  });
});

describe("weeklySchedule", () => {
  it("lists a place's days from Monday, sorted by time, with first-in-month tags", () => {
    expect(weeklySchedule(source.regular, "kurim")).toEqual([
      { weekday: 1, rows: [{ time: "8:00", title: "Mše svatá" }] },
      { weekday: 4, rows: [{ time: "17:30", title: "Adorace" }] },
      {
        weekday: 5,
        rows: [
          { time: "16:45", title: "Mše svatá" },
          { time: "18:15", title: "Mše svatá", tag: "1. pátek v měsíci" },
        ],
      },
      {
        weekday: 0,
        rows: [
          { time: "8:00", title: "Mše svatá" },
          { time: "9:30", title: "Mše svatá" },
        ],
      },
    ]);
  });

  it("is empty for a place without services", () => {
    expect(weeklySchedule(source.regular, "jinacovice")).toEqual([]);
  });
});

describe("formatMassDay", () => {
  const now = at("2026-10-03", "12:00");
  it("labels today, tomorrow and later days", () => {
    expect(formatMassDay("2026-10-03", now)).toBe("Dnes · sobota 3. 10.");
    expect(formatMassDay("2026-10-04", now)).toBe("Zítra · neděle 4. 10.");
    expect(formatMassDay("2026-10-07", now)).toBe("Středa · 7. 10.");
  });
});

describe("countdown", () => {
  it("splits the remaining time and uses Czech plurals", () => {
    const now = at("2026-10-03", "12:00");
    expect(countdown(at("2026-10-04", "8:00"), now)).toMatchObject({
      days: 0,
      hours: 20,
      minutes: 0,
      daysLabel: "dní",
      hoursLabel: "hodin",
      minutesLabel: "minut",
    });
    expect(countdown(at("2026-10-05", "15:03"), now)).toMatchObject({
      days: 2,
      hours: 3,
      minutes: 3,
      daysLabel: "dny",
      hoursLabel: "hodiny",
      minutesLabel: "minuty",
    });
  });

  it("never goes negative", () => {
    expect(countdown(0, 60_000).minutes).toBe(0);
  });
});
