import { describe, expect, it } from "vitest";
import { formatWeeks } from "./weeks";

describe("formatWeeks", () => {
  const week = (validFrom: string, validTo: string) => ({ validFrom, validTo });

  it("writes one week, with the year once", () => {
    expect(formatWeeks([week("2026-10-19", "2026-10-25")])).toBe("19.–25. 10. 2026");
    expect(formatWeeks([week("2026-10-26", "2026-11-01")])).toBe("26. 10.–1. 11. 2026");
    expect(formatWeeks([week("2026-12-28", "2027-01-03")])).toBe("28. 12. 2026–3. 1. 2027");
  });

  it("writes several weeks oldest first, the year once when they end in the same one", () => {
    expect(formatWeeks([week("2026-10-26", "2026-11-01"), week("2026-10-19", "2026-10-25")])).toBe(
      "19.–25. 10. and 26. 10.–1. 11. 2026",
    );
    expect(
      formatWeeks([
        week("2026-12-21", "2026-12-27"),
        week("2026-12-28", "2027-01-03"),
        week("2027-01-04", "2027-01-10"),
      ]),
    ).toBe("21.–27. 12. 2026, 28. 12. 2026–3. 1. 2027 and 4.–10. 1. 2027");
  });
});
