import { describe, expect, it } from "vitest";
import { pragueDate, pragueDateTime, pragueWeekday } from "./prague";

// These hold in any time zone the tests run in; `TZ=America/Los_Angeles pnpm test` checks that.

/** The instant in UTC (a `TZDate` prints its own offset). */
const utc = (date: string, time: string) => new Date(pragueDateTime(date, time).getTime()).toISOString();

describe("pragueDateTime", () => {
  it("reads the wall-clock time in summer and winter time", () => {
    expect(utc("2026-07-01", "8:00")).toBe("2026-07-01T06:00:00.000Z");
    expect(utc("2026-12-24", "0:00")).toBe("2026-12-23T23:00:00.000Z");
  });

  it("handles both DST switch days", () => {
    // 29. 3. 2026: 2:00 → 3:00; 25. 10. 2026: 3:00 → 2:00.
    expect(utc("2026-03-29", "1:30")).toBe("2026-03-29T00:30:00.000Z");
    expect(utc("2026-03-29", "9:30")).toBe("2026-03-29T07:30:00.000Z");
    expect(utc("2026-10-25", "1:30")).toBe("2026-10-24T23:30:00.000Z");
    expect(utc("2026-10-25", "9:30")).toBe("2026-10-25T08:30:00.000Z");
  });
});

describe("pragueDate", () => {
  it("gives the Prague day, not the UTC or local one", () => {
    expect(pragueDate(new Date("2026-10-06T21:59:00Z"))).toBe("2026-10-06");
    expect(pragueDate(new Date("2026-10-06T22:00:00Z"))).toBe("2026-10-07");
    expect(pragueDate(Date.parse("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });

  it("round-trips with pragueDateTime around midnight", () => {
    expect(pragueDate(pragueDateTime("2026-10-25", "0:00"))).toBe("2026-10-25");
    expect(pragueDate(pragueDateTime("2026-03-29", "23:59"))).toBe("2026-03-29");
  });
});

describe("pragueWeekday", () => {
  it("counts from neděle = 0", () => {
    expect(pragueWeekday("2026-10-04")).toBe(0);
    expect(pragueWeekday("2026-10-05")).toBe(1);
    expect(pragueWeekday("2026-10-10")).toBe(6);
  });

  it("is right on the DST switch days", () => {
    expect(pragueWeekday("2026-03-29")).toBe(0);
    expect(pragueWeekday("2026-10-25")).toBe(0);
  });
});
