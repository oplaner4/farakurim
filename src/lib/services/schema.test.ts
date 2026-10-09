import { describe, expect, it } from "vitest";
import * as z from "zod";
import type { ServiceSheet } from "@/content/types/services";
import { serviceSheetSchema } from "./schema";

const sheet = (fields: Partial<ServiceSheet> = {}): ServiceSheet => ({
  pdfUrl: "/uploads/porady_bohosluzeb/2026-10-11-porad-bohosluzeb.pdf",
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
    expect(Object.keys(parsed)).toEqual(["pdfUrl", "validFrom", "validTo", "days", "announcements"]);
  });

  it("names bad fields and unknown ones", () => {
    const bad = sheet();
    bad.days[0].rows[0] = { ...bad.days[0].rows[0], time: "8.00" };
    expect(problems(bad)).toContain("days[0].rows[0].time");
    expect(problems({ ...sheet(), note: "x" })).toContain('Unrecognized key: "note"');
    expect(problems(sheet({ pdfUrl: "/uploads/x.pdf" }))).toContain("pdfUrl");
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
