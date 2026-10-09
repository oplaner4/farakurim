import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseWeek, stagePorad, weekDays } from "./porad";
import { hasPoppler, pdfWithText, useStageFixture } from "../test-helpers";

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

describe("weekDays", () => {
  it("lists every day with its Czech weekday", () => {
    const days = weekDays("2026-10-04", "2026-10-11");
    expect(days).toHaveLength(8);
    expect(days.slice(0, 2)).toEqual(["ne 2026-10-04", "po 2026-10-05"]);
    expect(days.at(-1)).toBe("ne 2026-10-11");
  });
});

describe("stagePorad", { timeout: 30_000 }, () => {
  const { env, status, download, uploaded } = useStageFixture();

  it("stages the PDF of the given week and lists its days", async () => {
    const source = download("porad.pdf", "%PDF");
    const { lines } = await stagePorad(env, { source, validFrom: "2026-10-04", validTo: "2026-10-11" });
    expect(lines).toEqual([
      "Staged uploads/porady_bohosluzeb/2026-10-04-porad-bohosluzeb.pdf",
      '  pdfUrl: "/uploads/porady_bohosluzeb/2026-10-04-porad-bohosluzeb.pdf",\n  validFrom: "2026-10-04",\n  validTo: "2026-10-11",',
      `days: ${weekDays("2026-10-04", "2026-10-11").join(", ")}`,
    ]);
    expect(existsSync(uploaded("porady_bohosluzeb", "2026-10-04-porad-bohosluzeb.pdf"))).toBe(true);
  });

  it("names a corrected PDF and hints at it when the week is published", async () => {
    const source = download("porad.pdf", "%PDF");
    const week = { source, validFrom: "2026-10-04", validTo: "2026-10-11", check: true };
    expect((await stagePorad(env, { ...week, rev: 2 })).lines[0]).toBe(
      "Would stage uploads/porady_bohosluzeb/2026-10-04-porad-bohosluzeb-2.pdf",
    );
    status(200);
    await expect(stagePorad(env, week)).rejects.toThrow("for a corrected PDF pass --rev 2");
  });

  it("refuses a period that is not one or two weeks, and a file that is not a PDF", async () => {
    const source = download("porad.pdf", "%PDF");
    await expect(stagePorad(env, { source, validFrom: "2026-10-04", validTo: "2026-11-04" })).rejects.toThrow(
      "the period 2026-10-04 – 2026-11-04 looks wrong",
    );
    await expect(stagePorad(env, { source, validFrom: "2026-10-04", validTo: "2026-10-32" })).rejects.toThrow(
      "32. 10. 2026 is not a date",
    );
    await expect(stagePorad(env, { source: download("porad.docx", "x") })).rejects.toThrow("is a PDF");
  });

  it.skipIf(!hasPoppler)("reads the week from the PDF heading", async () => {
    const source = download("porad.pdf", pdfWithText(["Porad bohosluzeb od 4. 10. do 11. 10. 2026"]));
    expect((await stagePorad(env, { source, check: true })).lines[1]).toContain('validFrom: "2026-10-04"');
    const blank = download("prazdny.pdf", pdfWithText(["Farnost Kurim"]));
    await expect(stagePorad(env, { source: blank })).rejects.toThrow("no 'od … do …' week");
  });
  /** A record covering 2099-10-04 – 2099-10-11, after every real sheet, so the tests keep passing. */
  const record = () => ({
    days: weekDays("2099-10-04", "2099-10-11").map((d) => ({ date: d.slice(3), rows: [] })),
    announcements: [{ category: "info", html: "<p>Sbírka.</p>" }],
  });

  it("adds the record as a sheet after staging the PDF", async () => {
    const source = download("porad.pdf", "%PDF");
    const { lines, written } = await stagePorad(env, {
      source,
      validFrom: "2099-10-04",
      validTo: "2099-10-11",
      record: record(),
    });
    expect(lines[0]).toBe("Staged uploads/porady_bohosluzeb/2099-10-04-porad-bohosluzeb.pdf");
    expect(lines[1]).toBe("Added the sheet 2099-10-04 – 2099-10-11 to src/content/ohlasky/2099-10-04.ts");
    expect(written).toContain(join(env.ohlaskyDir, "2099-10-04.ts"));
    expect(readFileSync(join(env.ohlaskyDir, "2099-10-04.ts"), "utf8")).toContain(
      'pdfUrl: "/uploads/porady_bohosluzeb/2099-10-04-porad-bohosluzeb.pdf"',
    );
  });

  it("stages nothing for a record it refuses, and only validates with check", async () => {
    const source = download("porad.pdf", "%PDF");
    const week = { source, validFrom: "2099-10-04", validTo: "2099-10-11" };
    await expect(stagePorad(env, { ...week, record: { ...record(), days: [] } })).rejects.toThrow("missing 2099-10-04");
    expect(existsSync(uploaded("porady_bohosluzeb"))).toBe(false);
    // The real sheets copied into the temp folder may add "Would remove …" lines in between: assert the ends only.
    const checked = await stagePorad(env, { ...week, record: record(), check: true });
    expect(checked.lines[0]).toBe("Would add the sheet 2099-10-04 – 2099-10-11 to src/content/ohlasky/2099-10-04.ts");
    expect(checked.lines.at(-1)).toBe("Would stage uploads/porady_bohosluzeb/2099-10-04-porad-bohosluzeb.pdf");
    expect(existsSync(join(env.ohlaskyDir, "2099-10-04.ts"))).toBe(false);
  });
});
