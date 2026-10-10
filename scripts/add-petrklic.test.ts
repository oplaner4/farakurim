import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PetrklicRecord } from "@/content/types/petrklic";
import { issueId } from "@/lib/petrklic/issues";
import { addPetrklic, petrklicLines, readPetrklic } from "./add-petrklic";

const record = (year: number, number: number, fields: Partial<PetrklicRecord> = {}): PetrklicRecord => ({
  year,
  number,
  pageCount: 24,
  ...fields,
});

describe("addPetrklic on a temp petrklic.json", () => {
  let dir: string;
  let file: string;
  const save = (issues: PetrklicRecord[]) => writeFileSync(file, `${JSON.stringify({ issues }, null, 2)}\n`);
  const raw = () => readFileSync(file, "utf8");
  const ids = () => readPetrklic(file).issues.map(issueId);

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "petrklic-"));
    file = join(dir, "petrklic.json");
    save([record(2026, 1), record(2025, 4), record(2025, 3)]);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("puts the next issue first, as the current one", () => {
    const result = addPetrklic(file, record(2026, 2, { pageCount: 36 }));
    expect(ids()).toEqual(["2026-2", "2026-1", "2025-4", "2025-3"]);
    expect(result).toMatchObject({ id: "2026-2", position: 1, written: [file] });
    expect(petrklicLines(result, false)).toEqual([
      "Added 2/2026 (36 pages) at position 1 in src/content/petrklic.json (the current issue)",
    ]);
  });

  it("inserts an older issue in order and says it is not current", () => {
    const result = addPetrklic(file, record(2025, 3, { note: "mimořádné" }));
    expect(ids()).toEqual(["2026-1", "2025-4", "2025-3-mimoradne", "2025-3"]);
    expect(petrklicLines(result, false)).toEqual([
      "Added 3/2025 (mimořádné) (24 pages) at position 3 in src/content/petrklic.json" +
        " (not the current issue: newer issues come first)",
    ]);
  });

  it("puts a new part before the older parts", () => {
    save([record(2012, 1, { note: "1. část" })]);
    addPetrklic(file, record(2012, 1, { note: "2. část" }));
    expect(ids()).toEqual(["2012-1-2-cast", "2012-1-1-cast"]);
  });

  it("refuses an issue already there and an invalid one", () => {
    expect(() => addPetrklic(file, record(2025, 4))).toThrow("the issue 2025-4 is already in petrklic.json");
    expect(() => addPetrklic(file, record(2026, 0))).toThrow(/the issue is not valid/);
  });

  it("replaces the issue's record with a corrected PDF's rev, where it is", () => {
    const result = addPetrklic(file, record(2025, 4, { rev: 2, pageCount: 28 }));
    expect(readPetrklic(file).issues[1]).toEqual(record(2025, 4, { rev: 2, pageCount: 28 }));
    expect(ids()).toEqual(["2026-1", "2025-4", "2025-3"]);
    expect(petrklicLines(result, false)).toEqual([
      "Replaced 4/2025 with rev 2 (28 pages) at position 2 in src/content/petrklic.json" +
        " (not the current issue: newer issues come first)",
    ]);
    // The same rev again (rerunning before the release); a lower one is refused.
    expect(addPetrklic(file, record(2025, 4, { rev: 2 }), { check: true }).replaced).toBe(true);
    addPetrklic(file, record(2025, 4, { rev: 3 }));
    expect(() => addPetrklic(file, record(2025, 4, { rev: 2 }))).toThrow("already has rev 3: pass --rev 4");
  });

  it("asks for a rev for an issue already there and refuses a rev for a new one", () => {
    expect(() => addPetrklic(file, record(2025, 4))).toThrow("for a corrected PDF pass --rev 2");
    expect(() => addPetrklic(file, record(2026, 2, { rev: 2 }))).toThrow("the issue 2026-2 is not in petrklic.json");
  });

  it("only says what it would do with check", () => {
    const before = raw();
    const result = addPetrklic(file, record(2026, 2), { check: true });
    expect(result).toMatchObject({ position: 1, written: [] });
    expect(petrklicLines(result, true)[0]).toMatch(/^Would add 2\/2026 /);
    expect(raw()).toBe(before);
  });

  it("stops on a broken petrklic.json, also with check, and leaves it unchanged", () => {
    writeFileSync(file, '{ "issues": [');
    expect(() => addPetrklic(file, record(2026, 2))).toThrow(/petrklic\.json is not valid JSON/);
    save([record(2025, 4), record(2026, 1)]);
    const before = raw();
    expect(() => addPetrklic(file, record(2026, 2), { check: true })).toThrow(/petrklic\.json is not valid:\n/);
    expect(raw()).toBe(before);
  });
});
