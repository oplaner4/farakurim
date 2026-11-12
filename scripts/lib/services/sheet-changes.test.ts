import { describe, expect, it } from "vitest";
import type { ServiceSheetRecord } from "@/content/types/services";
import { sheetChanges } from "./sheet-changes";

const mass = (time: string, detail: string) => ({ time, place: "kurim", title: "Mše sv.", detail, mass: true });

const sheet = (): ServiceSheetRecord => ({
  validFrom: "2099-10-04",
  validTo: "2099-10-05",
  days: [
    { date: "2099-10-04", feast: "27. neděle v mezidobí", solemnity: true, rows: [mass("8:00", "za farnost")] },
    { date: "2099-10-05", rows: [mass("7:00", "za rodinu"), mass("18:00", "za zemřelé")] },
  ],
  announcements: [
    { category: "info", html: "<p>Sbírka.</p>" },
    { category: "invitation", html: "<p>Zveme na pouť.</p>" },
  ],
});

describe("sheetChanges", () => {
  it("names nothing for the same sheet", () => {
    expect(sheetChanges(sheet(), sheet())).toEqual([]);
  });

  it("names the changed day fields, rows and announcements", () => {
    const after = sheet();
    after.days[0].feast = "27. neděle v mezidobí – posvícení";
    after.days[1].rows = [mass("7:00", "za rodinu"), mass("18:30", "za zemřelé")];
    after.announcements[1] = { category: "invitation", html: "<p>Zveme na <strong>pouť</strong>.</p>" };
    expect(sheetChanges(sheet(), after)).toEqual(["2099-10-04 feast", "2099-10-05 row 2", "announcement 2"]);
  });

  it("names a row moved to another day on both days", () => {
    const after = sheet();
    after.days[1].rows = [mass("7:00", "za rodinu")];
    after.days[0].rows.push(mass("18:00", "za zemřelé"));
    expect(sheetChanges(sheet(), after)).toEqual(["added 2099-10-04 row 2", "removed 2099-10-05 row 2"]);
  });
});
