import { describe, expect, it } from "vitest";
import type { OfficeHours } from "@/content/types/contacts";
import { officeHoursApply, officeStatus } from "./office-hours";
import { pragueDateTime } from "@/lib/shared/prague";

const hours: OfficeHours[] = [
  { weekday: 1, from: "9:00", to: "10:00" },
  { weekday: 4, from: "19:00", to: "20:00", closed: { from: "07-01", to: "08-31" } },
];

const at = (date: string, time: string) => pragueDateTime(date, time).getTime();

describe("officeHoursApply", () => {
  it("matches the weekday", () => {
    expect(officeHoursApply(hours[0], "2026-10-05")).toBe(true);
    expect(officeHoursApply(hours[0], "2026-10-06")).toBe(false);
  });

  it("skips the yearly break", () => {
    expect(officeHoursApply(hours[1], "2026-07-02")).toBe(false);
    expect(officeHoursApply(hours[1], "2026-08-27")).toBe(false);
    expect(officeHoursApply(hours[1], "2026-09-03")).toBe(true);
  });

  it("handles a break over New Year", () => {
    const slot = { ...hours[1], closed: { from: "12-24", to: "01-06" } };
    expect(officeHoursApply(slot, "2026-12-31")).toBe(false);
    expect(officeHoursApply(slot, "2027-01-07")).toBe(true);
  });
});

describe("officeStatus", () => {
  it("is open inside office hours", () => {
    expect(officeStatus(hours, at("2026-10-05", "9:30"))).toEqual({
      open: true,
      text: "Kancelář je právě otevřená (do 10:00).",
    });
  });

  it("announces today's hours before opening", () => {
    expect(officeStatus(hours, at("2026-10-05", "8:00")).text).toBe("Dnes otevřeno 9:00–10:00.");
  });

  it("says when today's hours are over", () => {
    expect(officeStatus(hours, at("2026-10-05", "10:00")).text).toBe("Dnešní úřední hodiny už skončily.");
  });

  it("has no office hours on other days and during the break", () => {
    const none = "Dnes nejsou úřední hodiny. Zavolejte nebo napište, domluvíme se.";
    expect(officeStatus(hours, at("2026-10-03", "9:30")).text).toBe(none);
    expect(officeStatus(hours, at("2026-07-02", "19:30")).text).toBe(none);
  });
});
