import { describe, expect, it } from "vitest";
import { parseWeek, weekHeading } from "./sheet-week";

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
