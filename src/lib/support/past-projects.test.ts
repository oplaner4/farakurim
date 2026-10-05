import { describe, expect, it } from "vitest";
import { pastProjects } from "@/content/support-archive";
import type { PastProjectYear } from "@/content/types/support";
import { formatAmount, projectTotals, yearSpan } from "./past-projects";

const row = (year: number, costs: number, grants: number | null): PastProjectYear => ({
  year,
  works: "",
  budget: null,
  grants,
  gifts: null,
  costs,
});

describe("projectTotals", () => {
  it("sums the costs and grants, an unrecorded grant as 0", () => {
    expect(projectTotals({ years: [row(2021, 100, null), row(2020, 50, 30), row(2020, 20, 5)] })).toEqual({
      costs: 170,
      grants: 35,
    });
  });

  it("gives the totals of the real Moravské Knínice accounts", () => {
    const kninice = pastProjects.find((p) => p.id === "kninice")!;
    expect(projectTotals(kninice)).toEqual({ costs: 4626109, grants: 2825000 });
  });
});

describe("yearSpan", () => {
  it("joins the first and last year with an en dash", () => {
    expect(yearSpan({ years: [row(2025, 0, 0), row(2019, 0, 0), row(2021, 0, 0)] })).toBe("2019–2025");
  });

  it("gives a single year alone", () => {
    expect(yearSpan({ years: [row(2024, 0, 0)] })).toBe("2024");
  });
});

describe("formatAmount", () => {
  it("formats Kč and shows a dash when not recorded", () => {
    // The amounts keep together with no-break spaces.
    expect(formatAmount(213518)).toBe("213 518 Kč".replaceAll(" ", " "));
    expect(formatAmount(null)).toBe("—");
  });
});
