import { describe, expect, it } from "vitest";
import { religiousEducation } from "./religious-education";
import { duplicates, UPLOAD } from "./test-helpers";

describe("Výuka náboženství (religious-education.ts)", () => {
  const { schools, schoolYear, applicationForm, rules } = religiousEducation;

  it("names the school year and every school once", () => {
    expect(schoolYear).toMatch(/^(\d{4})\/(\d{4})$/);
    const [from, to] = schoolYear.split("/").map(Number);
    expect(to).toBe(from + 1);
    expect(duplicates(schools.map((s) => s.id))).toEqual([]);
    expect(schools.every((s) => s.rows.length > 0)).toBe(true);
  });

  it("links the application and the rules under /uploads/", () => {
    expect([applicationForm, rules].filter((f) => !UPLOAD.test(f))).toEqual([]);
  });
});
