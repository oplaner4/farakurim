import { describe, expect, it } from "vitest";
import * as z from "zod";
import type { ServiceSheetRecord } from "@/content/types/services";
import { ohlaskyFileSchema, scheduleExceptionSchema, serviceSheetSchema } from "./schema";

const sheet = (fields: Partial<ServiceSheetRecord> = {}): ServiceSheetRecord => ({
  validFrom: "2026-10-11",
  validTo: "2026-10-12",
  days: [
    {
      date: "2026-10-11",
      feast: "28. neděle v mezidobí",
      solemnity: true,
      rows: [
        { time: "8:00", place: "kurim", title: "Mše sv.", detail: "za farníky", mass: true },
        { time: "11:00", place: "Vranov", title: "Pohřeb", detail: "[jméno]", public: false },
      ],
    },
    { date: "2026-10-12", rows: [] },
  ],
  announcements: [{ category: "pozvanka", html: "<p>Zveme.</p>", newsId: "farni-den-2026" }],
  ...fields,
});

/** The messages of a failed parse, as the script prints them. */
const problems = (input: unknown) => {
  const result = serviceSheetSchema.safeParse(input);
  return result.success ? "" : z.prettifyError(result.error);
};

describe("serviceSheetSchema", () => {
  it("accepts a sheet and keeps the schema's field order", () => {
    const parsed = serviceSheetSchema.parse(sheet());
    expect(parsed).toEqual(sheet());
    expect(Object.keys(parsed)).toEqual(["validFrom", "validTo", "days", "announcements"]);
    expect(Object.keys(serviceSheetSchema.parse(sheet({ rev: 2 }))).slice(0, 3)).toEqual([
      "validFrom",
      "validTo",
      "rev",
    ]);
  });

  it("names bad fields and unknown ones", () => {
    const bad = sheet();
    bad.days[0].rows[0] = { ...bad.days[0].rows[0], time: "8.00" };
    expect(problems(bad)).toContain("days[0].rows[0].time");
    bad.days[0].rows[0].time = "08:00";
    expect(problems(bad)).toContain("days[0].rows[0].time");
    expect(problems({ ...sheet(), note: "x" })).toContain('Unrecognized key: "note"');
    expect(problems(sheet({ rev: 1 }))).toContain("rev");
    expect(problems({ ...sheet(), pdfUrl: "/uploads/x.pdf" })).toContain('Unrecognized key: "pdfUrl"');
    expect(problems({ ...sheet(), announcements: [{ category: "jine", html: "<p>x</p>" }] })).toContain(
      "announcements[0].category",
    );
  });

  it("needs every date of the period once, in order", () => {
    expect(problems(sheet({ days: [sheet().days[0]] }))).toContain("missing 2026-10-12");
    expect(problems(sheet({ days: [sheet().days[1], sheet().days[0]] }))).toContain("in date order");
    expect(problems(sheet({ days: [...sheet().days, { date: "2026-10-13", rows: [] }] }))).toContain(
      "2026-10-13 is outside",
    );
  });

  it("needs validTo after validFrom and rows in time order", () => {
    expect(problems(sheet({ validTo: "2026-10-11" }))).toContain("validTo");
    const late = sheet();
    late.days[0].rows.reverse();
    expect(problems(late)).toContain("days[0].rows");
  });
});

describe("scheduleExceptionSchema and ohlaskyFileSchema", () => {
  const exception = { date: "2026-10-25", services: [{ time: "10:00", place: "kurim" }], reason: "Hody" };
  const issues = (schema: z.ZodType, input: unknown) => {
    const result = schema.safeParse(input);
    return result.success ? "" : z.prettifyError(result.error);
  };

  it("accepts an exception with or without its optional fields, and a whole file", () => {
    expect(scheduleExceptionSchema.parse(exception)).toEqual(exception);
    const bare = { date: "2026-10-25", services: [] };
    expect(scheduleExceptionSchema.parse(bare)).toEqual(bare);
    const noted = {
      date: "2026-10-25",
      services: [{ time: "18:00", place: "jinacovice", title: "Adorace", note: "x" }],
    };
    expect(scheduleExceptionSchema.parse(noted)).toEqual(noted);
    const file = { sheets: [sheet()], laterExceptions: [exception] };
    expect(ohlaskyFileSchema.parse(file)).toEqual(file);
  });

  it("names a bad date, time, place and unknown field", () => {
    expect(issues(scheduleExceptionSchema, { ...exception, date: "25. 10." })).toContain("date");
    expect(issues(scheduleExceptionSchema, { ...exception, services: [{ time: "10.00", place: "kurim" }] })).toContain(
      "services[0].time",
    );
    expect(issues(scheduleExceptionSchema, { ...exception, services: [{ time: "10:00", place: "Vranov" }] })).toContain(
      "services[0].place",
    );
    expect(issues(scheduleExceptionSchema, { ...exception, cancelled: true })).toContain(
      'Unrecognized key: "cancelled"',
    );
    expect(issues(ohlaskyFileSchema, { sheets: [] })).toContain("laterExceptions");
    expect(
      issues(ohlaskyFileSchema, { sheets: [{ ...sheet(), validTo: "2026-10-11" }], laterExceptions: [] }),
    ).toContain("sheets[0].validTo");
  });
});
