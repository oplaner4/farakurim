import { describe, expect, it } from "vitest";
import { councilMeetings, parishCouncil } from "./parish-council";
import { duplicates, isIsoDate, isSorted, localHrefs, UPLOAD } from "./test-helpers";

describe("Pastorační rada (parish-council.ts)", () => {
  it("has a valid term and each member once", () => {
    const { from, to } = parishCouncil.term;
    expect([from, to].every(isIsoDate)).toBe(true);
    expect(to > from).toBe(true);
    expect(duplicates(parishCouncil.members)).toEqual([]);
  });

  it("lists the meetings newest first, one per day", () => {
    const dates = councilMeetings.map((m) => m.date);
    expect(dates.filter((d) => !isIsoDate(d))).toEqual([]);
    expect(isSorted(dates, (a, b) => a > b)).toBe(true);
  });

  it("links the reports' files under /uploads/", () => {
    const hrefs = councilMeetings.flatMap((m) => localHrefs(m.html));
    expect(hrefs.filter((href) => !UPLOAD.test(href))).toEqual([]);
  });
});
