import { describe, expect, it } from "vitest";
import { CLOCK, clockMinutes } from "./clock";

describe("CLOCK", () => {
  it("takes H:MM with an hour of 0–23 and no leading zero", () => {
    for (const time of ["0:00", "9:30", "18:00", "23:59"]) expect(CLOCK.test(time)).toBe(true);
    for (const time of ["09:30", "24:00", "9:5", "9.30", "18:60", " 9:30", ""]) expect(CLOCK.test(time)).toBe(false);
  });
});

describe("clockMinutes", () => {
  it("counts the minutes since midnight", () => {
    expect(clockMinutes("0:00")).toBe(0);
    expect(clockMinutes("9:30")).toBe(570);
    expect(clockMinutes("23:59")).toBe(1439);
  });
});
