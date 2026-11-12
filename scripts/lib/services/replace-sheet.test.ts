import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { readServiceSheets } from "./add-service-sheet";
import { parseCommand, replaceSheet } from "./replace-sheet";
import { emptyWeek, useStageFixture } from "../test-helpers";

describe("replaceSheet", () => {
  const { env } = useStageFixture();
  const week = { validFrom: "2099-10-04", validTo: "2099-10-11" };
  const record = (html: string) => ({
    days: emptyWeek(week.validFrom, week.validTo),
    announcements: [{ category: "info", html }],
  });
  const lastSheet = () => readServiceSheets(env.serviceSheetsFile).sheets.at(-1);

  // A corrected week alone and no later changes, so the real content going out of date never changes the lines.
  beforeEach(() => {
    const sheet = { ...week, rev: 2, ...record("<p>Sbírka.</p>") };
    writeFileSync(env.serviceSheetsFile, JSON.stringify({ sheets: [sheet] }));
    writeFileSync(env.exceptionsFile, JSON.stringify({ exceptions: [] }));
  });

  it("replaces the record of a sheet, keeping its rev, and names what changed", () => {
    const fixed = record("<p>Sbírka na opravy.</p>");
    expect(replaceSheet(env, { ...week, record: fixed, check: true }).lines).toEqual([
      "Would replace the sheet 2099-10-04 – 2099-10-11 with rev 2",
      "Changed: announcement 1",
    ]);
    expect(lastSheet()?.announcements[0].html).toBe("<p>Sbírka.</p>");
    const { lines, written } = replaceSheet(env, { ...week, record: fixed });
    expect(lines).toEqual(["Replaced the sheet 2099-10-04 – 2099-10-11 with rev 2", "Changed: announcement 1"]);
    expect(written).toEqual([env.serviceSheetsFile]);
    expect(lastSheet()).toMatchObject({ rev: 2, announcements: [{ html: "<p>Sbírka na opravy.</p>" }] });
  });

  it("says when nothing changed", () => {
    expect(replaceSheet(env, { ...week, record: record("<p>Sbírka.</p>"), check: true }).lines.at(-1)).toBe(
      "Nothing changed",
    );
  });

  it("refuses a sheet that is not there, and a record with the week in it", () => {
    expect(() => replaceSheet(env, { validFrom: "2099-10-11", validTo: "2099-10-18", record: {} })).toThrow(
      "no sheet of 2099-10-11 – 2099-10-18 is added",
    );
    expect(() => replaceSheet(env, { ...week, record: { ...record("<p>x</p>"), rev: 3 } })).toThrow(
      "leave validFrom, validTo and rev out of the record",
    );
  });
});

describe("parseCommand", () => {
  const { env } = useStageFixture();

  it("reads the record file, the week and --check", () => {
    const file = join(env.home, "record.json");
    writeFileSync(file, JSON.stringify({ days: [], announcements: [] }));
    expect(parseCommand([file, "--from", "2099-10-04", "--to", "2099-10-11", "--check"])).toEqual({
      validFrom: "2099-10-04",
      validTo: "2099-10-11",
      record: { days: [], announcements: [] },
      check: true,
    });
  });

  it("refuses a missing week, a bad date, no record and an unknown option", () => {
    expect(() => parseCommand(["r.json", "--from", "2099-10-04"])).toThrow("Usage: pnpm replace-sheet");
    expect(() => parseCommand(["r.json", "--from", "2099-10-4", "--to", "2099-10-11"])).toThrow("Usage");
    expect(() => parseCommand(["--from", "2099-10-04", "--to", "2099-10-11"])).toThrow("Usage");
    expect(() => parseCommand(["r.json", "--from", "2099-10-04", "--to", "2099-10-11", "--corrected"])).toThrow(
      "Unknown option '--corrected'",
    );
  });
});
