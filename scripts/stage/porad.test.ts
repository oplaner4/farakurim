import { existsSync, readFileSync } from "node:fs";
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
  const { env, status, download, uploaded, fetchMock } = useStageFixture();

  it("stages the PDF of the given week and lists its days", async () => {
    const source = download("porad.pdf", "%PDF");
    const { lines } = await stagePorad(env, { source, validFrom: "2026-10-04", validTo: "2026-10-11" });
    expect(lines).toEqual([
      "Staged uploads/porady_bohosluzeb/2026-10-04-porad-bohosluzeb.pdf",
      '  validFrom: "2026-10-04",\n  validTo: "2026-10-11",',
      `days: ${weekDays("2026-10-04", "2026-10-11").join(", ")}`,
    ]);
    expect(existsSync(uploaded("porady_bohosluzeb", "2026-10-04-porad-bohosluzeb.pdf"))).toBe(true);
  });

  it("hints at --corrected when the week is published", async () => {
    const source = download("porad.pdf", "%PDF");
    status(200);
    await expect(stagePorad(env, { source, validFrom: "2026-10-04", validTo: "2026-10-11" })).rejects.toThrow(
      "this week is already published; for a corrected PDF pass --corrected",
    );
  });

  it("refuses a period that is not one or two weeks, and a file that is not a PDF", async () => {
    const source = download("porad.pdf", "%PDF");
    await expect(stagePorad(env, { source, validFrom: "2026-10-04", validTo: "2026-11-04" })).rejects.toThrow(
      "the period 2026-10-04 – 2026-11-04 looks wrong",
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
    expect(lines[1]).toBe("Added the sheet 2099-10-04 – 2099-10-11 to src/content/ohlasky.json");
    expect(written).toEqual([env.ohlaskyFile]);
    expect(JSON.parse(readFileSync(env.ohlaskyFile, "utf8")).sheets.at(-1)).not.toHaveProperty("rev");
  });

  it("stages a released week's corrected PDF as the next rev, then replaces it under that name", async () => {
    const week = { validFrom: "2099-10-04", validTo: "2099-10-11", record: record() };
    await stagePorad(env, { ...week, source: download("porad.pdf", "%PDF first") });
    const lastSheet = () => JSON.parse(readFileSync(env.ohlaskyFile, "utf8")).sheets.at(-1);
    // Only the first PDF is on the server.
    fetchMock.mockImplementation(async (url: string) => {
      return new Response(null, { status: url.endsWith("/2099-10-04-porad-bohosluzeb.pdf") ? 200 : 404 });
    });
    await expect(stagePorad(env, { ...week, source: "porad.pdf" })).rejects.toThrow("pass --corrected");
    const fixed = download("porad oprava.pdf", "%PDF fixed");
    await expect(
      stagePorad(env, { source: fixed, validFrom: "2099-10-04", validTo: "2099-10-11", corrected: true }),
    ).rejects.toThrow("--corrected needs the week's --record");
    const { lines } = await stagePorad(env, { ...week, source: fixed, corrected: true });
    expect(lines[0]).toBe("Staged uploads/porady_bohosluzeb/2099-10-04-porad-bohosluzeb-r2.pdf");
    expect(lines[1]).toBe("Replaced the sheet 2099-10-04 – 2099-10-11 with rev 2 in src/content/ohlasky.json");
    expect(lastSheet().rev).toBe(2);
    // Corrected again before the release, and a plain rerun: both keep rev 2.
    const again = download("porad oprava 2.pdf", "%PDF fixed again");
    await stagePorad(env, { ...week, source: again, corrected: true });
    await stagePorad(env, { ...week, source: again });
    expect(lastSheet().rev).toBe(2);
    expect(readFileSync(uploaded("porady_bohosluzeb", "2099-10-04-porad-bohosluzeb-r2.pdf"), "utf8")).toBe(
      "%PDF fixed again",
    );
  });

  it("refuses --corrected for a week not in ohlasky.json", async () => {
    const source = download("porad.pdf", "%PDF");
    await expect(
      stagePorad(env, { source, validFrom: "2099-10-04", validTo: "2099-10-11", corrected: true, record: record() }),
    ).rejects.toThrow("no sheet of 2099-10-04 in ohlasky.json");
  });

  it("stages nothing for a record it refuses, and only validates with check", async () => {
    const source = download("porad.pdf", "%PDF");
    const week = { source, validFrom: "2099-10-04", validTo: "2099-10-11" };
    await expect(stagePorad(env, { ...week, record: { ...record(), days: [] } })).rejects.toThrow("missing 2099-10-04");
    expect(existsSync(uploaded("porady_bohosluzeb"))).toBe(false);
    // The real sheets copied into the temp folder may add "Would remove …" lines in between: assert the ends only.
    const before = readFileSync(env.ohlaskyFile, "utf8");
    const checked = await stagePorad(env, { ...week, record: record(), check: true });
    expect(checked.lines[0]).toBe("Would add the sheet 2099-10-04 – 2099-10-11 to src/content/ohlasky.json");
    expect(checked.lines.at(-1)).toBe("Would stage uploads/porady_bohosluzeb/2099-10-04-porad-bohosluzeb.pdf");
    expect(readFileSync(env.ohlaskyFile, "utf8")).toBe(before);
  });
});
