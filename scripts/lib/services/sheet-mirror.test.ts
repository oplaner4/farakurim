import { describe, expect, it } from "vitest";
import type { ServiceSheetRecord } from "@/content/types/services";
import { dayLine, mirrorSection, parseCommand } from "./sheet-mirror";

const MASS = { time: "8:00", place: "kurim", title: "Mše sv.", detail: "za Jana Nováka", mass: true };

/** A two-day sheet from `validFrom` (the 18th or the 25th of October 2026). */
const sheet = (validFrom: string, detail = MASS.detail): ServiceSheetRecord => ({
  validFrom,
  validTo: validFrom === "2026-10-18" ? "2026-10-19" : "2026-10-26",
  days: [
    { date: validFrom, feast: "29. neděle v mezidobí", solemnity: true, rows: [{ ...MASS, detail }] },
    { date: validFrom === "2026-10-18" ? "2026-10-19" : "2026-10-26", rows: [] },
  ],
  announcements: [],
});

describe("dayLine", () => {
  it("lists the services with the place's name, without the intentions", () => {
    const day = {
      date: "2026-10-23",
      feast: "sv. Jan Kapistránský",
      rows: [MASS, { time: "18:00", place: "moravske-kninice", title: "Adorace", service: true }],
    };
    expect(dayLine(day)).toBe(
      "- Pá 23. 10. (sv. Jan Kapistránský): 8:00 Kuřim – Mše sv.; 18:00 Moravské Knínice – Adorace",
    );
  });

  it("keeps a free-text place and says when a day has no services", () => {
    expect(dayLine({ date: "2026-10-24", rows: [{ time: "10:00", place: "Vranov", title: "Pouť" }] })).toBe(
      "- So 24. 10.: 10:00 Vranov – Pouť",
    );
    expect(dayLine({ date: "2026-10-19", rows: [] })).toBe("- Po 19. 10.: bez bohoslužeb");
  });
});

describe("mirrorSection", () => {
  it("lists the days of the new and the changed sheets only", () => {
    const section = mirrorSection([sheet("2026-10-18", "za Marii"), sheet("2026-10-25")], [sheet("2026-10-18")]);
    expect(section.split("\n")).toEqual([
      "## Mirror in the calendar",
      "",
      "- Ne 18. 10. (29. neděle v mezidobí): 8:00 Kuřim – Mše sv.",
      "- Po 19. 10.: bez bohoslužeb",
      "- Ne 25. 10. (29. neděle v mezidobí): 8:00 Kuřim – Mše sv.",
      "- Po 26. 10.: bez bohoslužeb",
    ]);
  });

  it("is empty when no sheet changed, a removed one included", () => {
    expect(mirrorSection([sheet("2026-10-25")], [sheet("2026-10-18"), sheet("2026-10-25")])).toBe("");
  });
});

describe("parseCommand", () => {
  it("takes exactly one base file", () => {
    expect(parseCommand(["main.json"])).toEqual({ baseFile: "main.json" });
    expect(() => parseCommand([])).toThrow("Usage:");
    expect(() => parseCommand(["a.json", "b.json"])).toThrow("Usage:");
  });
});
