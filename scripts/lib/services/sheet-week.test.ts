import { describe, expect, it } from "vitest";
import { parseWeek, weekHeading, weekPages } from "./sheet-week";

describe("parseWeek", () => {
  it("reads the week from the heading", () => {
    expect(parseWeek("POŘAD BOHOSLUŽEB od 4. 10. 2026 do 11. 10. 2026")).toEqual({
      validFrom: "2026-10-04",
      validTo: "2026-10-11",
    });
    expect(parseWeek("Od 4.10.2026\n do 11.10.2026")).toEqual({ validFrom: "2026-10-04", validTo: "2026-10-11" });
  });

  it("takes the first year from the second one, across New Year too", () => {
    expect(parseWeek("od 30. 11. do 7. 12. 2025")).toEqual({ validFrom: "2025-11-30", validTo: "2025-12-07" });
    expect(parseWeek("od 28. 12. do 4. 1. 2026")).toEqual({ validFrom: "2025-12-28", validTo: "2026-01-04" });
  });

  it("is null without a heading and refuses a day that does not exist", () => {
    expect(parseWeek("Pořad bohoslužeb")).toBeNull();
    expect(() => parseWeek("od 30. 2. 2026 do 7. 3. 2026")).toThrow("30. 2. 2026 is not a date");
  });
});

describe("weekHeading", () => {
  it('reads the week only from a "Rozpis" or "Pořad" heading', () => {
    expect(weekHeading("ROZPIS BOHOSLUŽEB V TÝDNU od 11. 10. 2026 do 18. 10. 2026")).toEqual({
      validFrom: "2026-10-11",
      validTo: "2026-10-18",
    });
    expect(weekHeading("Výuka bude od 12. 10. do 19. 10. 2026")).toBeNull();
  });
});

describe("weekPages", () => {
  const heading = (from: string, to: string) => `ROZPIS BOHOSLUŽEB V TÝDNU od ${from} do ${to}`;
  const october = { validFrom: "2099-10-04", validTo: "2099-10-11" };

  it("takes the week's heading page and the pages up to the next heading", () => {
    const pages = [heading("4. 10. 2099", "11. 10. 2099"), "Ohlášky", heading("27. 9. 2099", "4. 10. 2099"), "Sbírka"];
    expect(weekPages(pages, october)).toEqual([1, 2]);
    expect(weekPages(pages, { validFrom: "2099-09-27", validTo: "2099-10-04" })).toEqual([3, 4]);
  });

  it("leaves out the blank pages at the end, never the heading page", () => {
    expect(weekPages([heading("4. 10. 2099", "11. 10. 2099"), "Ohlášky", " \n", ""], october)).toEqual([1, 2]);
    expect(weekPages([heading("4. 10. 2099", "11. 10. 2099"), "  "], october)).toEqual([1, 1]);
  });

  it("matches both dates, as a typo can give two headings the same first day", () => {
    const pages = [heading("4. 10. 2099", "4. 10. 2099"), "Chyba", heading("4. 10. 2099", "11. 10. 2099"), "Týden"];
    expect(weekPages(pages, october)).toEqual([3, 4]);
  });

  it("throws when no page has the week's heading", () => {
    expect(() => weekPages(["Ohlášky", heading("27. 9. 2099", "4. 10. 2099")], october)).toThrow(
      "no page of the converted DOCX has the heading of 2099-10-04 – 2099-10-11",
    );
  });
});
