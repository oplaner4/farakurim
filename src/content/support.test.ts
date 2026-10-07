import { describe, expect, it } from "vitest";
import { support } from "./support";
import { duplicates, isIsoDate, isSorted } from "./test-helpers";

describe("Finanční podpora (support.ts)", () => {
  const { projects, regularGifts, puls } = support;

  it("dates the amounts in the projects' year", () => {
    expect(isIsoDate(support.asOf)).toBe(true);
    expect(support.asOf.startsWith(String(support.year))).toBe(true);
  });

  it("gives each project and the regular gifts their own numeric variable symbol", () => {
    const symbols = [...projects.map((p) => p.variableSymbol), regularGifts.variableSymbol];
    expect(symbols.every((vs) => /^\d{1,10}$/.test(vs))).toBe(true);
    expect(duplicates(symbols)).toEqual([]);
    expect(duplicates(projects.map((p) => p.id))).toEqual([]);
  });

  it("keeps the amounts whole and not negative", () => {
    const amounts = projects.flatMap((p) => [p.budget, p.grants, p.gifts, p.workDone ?? 0]);
    expect(amounts.every((a) => Number.isInteger(a) && a >= 0)).toBe(true);
    expect(projects.every((p) => p.budget > 0)).toBe(true);
  });

  it("lists the Fond PULS years once each, oldest first", () => {
    expect(isSorted(puls, (a, b) => a.year < b.year)).toBe(true);
  });
});
