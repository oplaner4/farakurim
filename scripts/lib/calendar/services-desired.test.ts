import { describe, expect, it } from "vitest";
import { places } from "@/content/masses";
import type { RegularService, ScheduleException, ServiceSheetRecord } from "@/content/types/services";
import type { SheetRow } from "@/content/types/services";
import {
  desiredServices,
  SERVICES_URL,
  serviceEventId,
  servicesWindow,
  type ServicesContent,
} from "./services-desired";

const summer = { from: "07-01", to: "08-31" } as const;
const regular: RegularService[] = [
  { weekday: 4, time: "17:30", place: "kurim", title: "Adorace" },
  { weekday: 4, time: "18:00", place: "kurim" },
  { weekday: 0, time: "8:00", place: "kurim" },
  { weekday: 0, time: "9:30", place: "kurim", note: "s katechezí pro děti (ve školním roce)", closed: summer },
  { weekday: 0, time: "11:00", place: "moravske-kninice" },
];

const mass = (time: string, place = "kurim", extra: Partial<SheetRow> = {}): SheetRow => ({
  time,
  place,
  title: "Mše sv.",
  mass: true,
  ...extra,
});

const sheet = (validFrom: string, validTo: string, days: ServiceSheetRecord["days"]): ServiceSheetRecord => ({
  validFrom,
  validTo,
  days,
  announcements: [],
});

const content = (fields: Partial<ServicesContent> = {}): ServicesContent => ({
  regular,
  sheets: [],
  later: [],
  places,
  ...fields,
});

const day = (date: string, c = content()) => desiredServices(c, { from: date, to: date });

describe("serviceEventId and servicesWindow", () => {
  it("encodes the key as hex, with the title when there is one", () => {
    expect(serviceEventId("2026-10-18", "8:00", "kurim")).toBe(
      Buffer.from("services/2026-10-18/8:00/kurim/").toString("hex"),
    );
    expect(serviceEventId("2026-10-22", "17:30", "kurim", "Adorace")).toMatch(/^[0-9a-v]+$/);
    expect(serviceEventId("2026-10-22", "17:30", "kurim", "Adorace")).not.toBe(
      serviceEventId("2026-10-22", "17:30", "kurim"),
    );
  });

  it("runs from today to six months ahead", () => {
    expect(servicesWindow("2026-10-24")).toEqual({ from: "2026-10-24", to: "2027-04-24" });
  });
});

describe("desiredServices on a regular day", () => {
  it("gives a regular Sunday its three events", () => {
    const events = day("2026-11-01");
    expect(events.map((e) => e.body.summary)).toEqual([
      "Mše svatá v Kuřimi",
      "Mše svatá v Kuřimi",
      "Mše svatá v Moravských Knínicích",
    ]);
    expect(events.every((e) => e.status === "regular")).toBe(true);
    const [first, second] = events;
    expect(first.body.location).toBe("Kostel sv. Maří Magdalény, Křížkovského, 664 34 Kuřim, Česko");
    expect(first.body.description.endsWith(`Pořad bohoslužeb: ${SERVICES_URL}`)).toBe(true);
    expect(first.body.start).toEqual({ dateTime: "2026-11-01T08:00:00+01:00", timeZone: "Europe/Prague" });
    expect(first.body.end.dateTime).toBe("2026-11-01T09:00:00+01:00");
    expect(first.googleId).toBe(serviceEventId("2026-11-01", "8:00", "kurim"));
    expect(second.body.description).toBe(`s katechezí pro děti (ve školním roce)\n\nPořad bohoslužeb: ${SERVICES_URL}`);
  });

  it("ends the 17:30 adoration at the 18:00 mass", () => {
    const [adoration, thursdayMass] = day("2026-10-22");
    expect(adoration.body.summary).toBe("Adorace v Kuřimi");
    expect(adoration.body.end.dateTime).toBe("2026-10-22T18:00:00+02:00");
    expect(thursdayMass.body.end.dateTime).toBe("2026-10-22T19:00:00+02:00");
  });

  it("uses the offset of the day", () => {
    expect(
      day("2026-10-24", content({ later: [{ date: "2026-10-24", services: [{ time: "8:00", place: "kurim" }] }] }))[0]
        .body.start.dateTime,
    ).toBe("2026-10-24T08:00:00+02:00");
    expect(day("2026-10-25")[0].body.start.dateTime).toBe("2026-10-25T08:00:00+01:00");
  });

  it("pauses the 9:30 mass in July without a cancelled event", () => {
    expect(day("2027-07-04").map((e) => e.time)).toEqual(["8:00", "11:00"]);
  });
});

describe("desiredServices on a sheet day", () => {
  const moved = sheet("2026-10-26", "2026-11-01", [
    {
      date: "2026-11-01",
      feast: "Slavnost Všech svatých",
      rows: [mass("8:00"), mass("10:00"), mass("11:00", "moravske-kninice"), mass("15:00", "tisnov")],
    },
  ]);

  it("cancels a dropped regular service and marks the new time as a change", () => {
    const events = day("2026-11-01", content({ sheets: [moved] }));
    expect(events.map((e) => e.body.summary)).toEqual([
      "Mše svatá v Kuřimi",
      "Zrušeno: Mše svatá v Kuřimi",
      "Změna: Mše svatá v Kuřimi",
      "Mše svatá v Moravských Knínicích",
    ]);
    const [, cancelled, changed] = events;
    expect(events.map((e) => e.status)).toEqual(["regular", "cancelled", "changed", "regular"]);
    expect(cancelled.body.description).toContain("Tato bohoslužba se nekoná.");
    expect(changed.body.description).toContain("Změna oproti pravidelnému pořadu bohoslužeb.");
    expect(cancelled.body.description.startsWith("Slavnost Všech svatých\n")).toBe(true);
    // the cancelled 9:30 keeps its note, and it ends at the next start in the church
    expect(cancelled.body.description).toContain("s katechezí pro děti (ve školním roce)");
    expect(cancelled.body.end.dateTime).toBe("2026-11-01T10:00:00+01:00");
  });

  it("gives a weekday mass and an extra adoration of a sheet no prefix", () => {
    const week = sheet("2026-10-26", "2026-11-01", [
      { date: "2026-10-27", rows: [mass("8:00")] },
      { date: "2026-10-28", rows: [{ time: "17:00", place: "kurim", title: "Adorace", service: true }] },
    ]);
    expect(day("2026-10-27", content({ sheets: [week] })).map((e) => e.body.summary)).toEqual(["Mše svatá v Kuřimi"]);
    expect(day("2026-10-28", content({ sheets: [week] })).map((e) => e.body.summary)).toEqual(["Adorace v Kuřimi"]);
  });

  it("follows a row marked changed by hand", () => {
    const week = sheet("2026-10-26", "2026-11-01", [
      { date: "2026-10-27", rows: [mass("8:00", "kurim", { changed: true })] },
    ]);
    const [event] = day("2026-10-27", content({ sheets: [week] }));
    expect(event.body.summary).toBe("Změna: Mše svatá v Kuřimi");
    expect(event.status).toBe("changed");
  });

  it("takes the feast and the hand mark from the later of two sheets sharing a day", () => {
    const older = sheet("2026-10-19", "2026-10-25", [
      {
        date: "2026-10-25",
        feast: "Starý svátek",
        rows: [mass("8:00"), mass("9:30"), mass("11:00", "moravske-kninice")],
      },
    ]);
    const newer = sheet("2026-10-25", "2026-11-01", [
      { date: "2026-10-25", feast: "Nový svátek", rows: [mass("8:00", "kurim", { changed: true })] },
    ]);
    const events = day("2026-10-25", content({ sheets: [older, newer] }));
    expect(events.map((e) => e.body.summary)).toEqual([
      "Změna: Mše svatá v Kuřimi",
      "Zrušeno: Mše svatá v Kuřimi",
      "Zrušeno: Mše svatá v Moravských Knínicích",
    ]);
    expect(events[0].body.description).toContain("Nový svátek");
    expect(events[0].body.description).not.toContain("Starý svátek");
  });

  it("turns a July sheet Sunday with 9:30 into a change, with no cancelled event", () => {
    const july = sheet("2027-07-04", "2027-07-04", [
      { date: "2027-07-04", rows: [mass("8:00"), mass("9:30"), mass("11:00", "moravske-kninice")] },
    ]);
    const events = day("2027-07-04", content({ sheets: [july] }));
    expect(events.map((e) => e.body.summary)).toEqual([
      "Mše svatá v Kuřimi",
      "Změna: Mše svatá v Kuřimi",
      "Mše svatá v Moravských Knínicích",
    ]);
  });

  it("leaves out Tišnov rows and funerals", () => {
    const week = sheet("2026-11-01", "2026-11-01", [
      {
        date: "2026-11-01",
        rows: [mass("8:00"), mass("15:00", "tisnov"), { time: "14:00", place: "kurim", title: "Pohřeb" }],
      },
    ]);
    expect(day("2026-11-01", content({ sheets: [week] })).map((e) => e.time)).toEqual(["8:00", "9:30", "11:00"]);
  });
});

describe("desiredServices on a day of a schedule exception", () => {
  it("cancels the regular services a hand exception drops", () => {
    const later: ScheduleException[] = [{ date: "2026-11-08", services: [{ time: "8:00", place: "kurim" }] }];
    const events = day("2026-11-08", content({ later }));
    expect(events.map((e) => e.body.summary)).toEqual([
      "Mše svatá v Kuřimi",
      "Zrušeno: Mše svatá v Kuřimi",
      "Zrušeno: Mše svatá v Moravských Knínicích",
    ]);
  });
});
