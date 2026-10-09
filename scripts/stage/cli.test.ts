import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { weekDays } from "./porad";
import { runCommand } from "./cli";
import { useStageFixture } from "../test-helpers";

describe("runCommand", { timeout: 30_000 }, () => {
  const { env, download, poster } = useStageFixture();

  it("parses each command's arguments", async () => {
    const source = download("porad.pdf", "%PDF");
    const { lines } = await runCommand(env, [
      "porad",
      source,
      "--from",
      "2026-10-04",
      "--to",
      "2026-10-11",
      "--rev",
      "3",
      "--check",
    ]);
    expect(lines[0]).toBe("Would stage uploads/porady_bohosluzeb/2026-10-04-porad-bohosluzeb-3.pdf");

    const sheetFile = join(env.home, "sheet.json");
    writeFileSync(
      sheetFile,
      JSON.stringify({
        days: weekDays("2099-10-04", "2099-10-11").map((d) => ({ date: d.slice(3), rows: [] })),
        announcements: [],
      }),
    );
    const sheet = await runCommand(env, [
      "porad",
      source,
      "--from",
      "2099-10-04",
      "--to",
      "2099-10-11",
      "--record",
      sheetFile,
    ]);
    expect(sheet.format).toEqual({ files: [env.ohlaskyFile], tests: "src/content/ohlasky.test.ts" });

    const recordFile = join(env.home, "record.json");
    writeFileSync(recordFile, JSON.stringify({ id: "x-2026", title: "T", start: "2026-10-20", place: "P", text: "T" }));
    const aktualita = await runCommand(env, [
      "aktualita",
      await poster(),
      "x-2026",
      "Leták",
      "--no-poster",
      "--record",
      recordFile,
      "--check",
    ]);
    expect(aktualita.lines).toEqual([
      "Would add the record to src/content/news/2026/10.ts",
      "Would stage uploads/aktuality/x-2026-letak.jpg",
    ]);
  });

  it("refuses missing arguments, another command's options and a bad --rev", async () => {
    await expect(runCommand(env, ["aktualita", "a.jpg", "x"])).rejects.toThrow("wrong arguments\nUsage: pnpm stage");
    await expect(runCommand(env, [])).rejects.toThrow(
      /Largest source file: aktualita \d+ MB, porad \d+ MB, petrklic \d+ MB/,
    );
    await expect(runCommand(env, ["petrklic", "a.pdf", "2026-1", "--rev", "2"])).rejects.toThrow("wrong arguments");
    await expect(runCommand(env, ["tisk", "a.pdf"])).rejects.toThrow("wrong arguments");
    await expect(runCommand(env, ["porad", "a.pdf", "--rev", "1"])).rejects.toThrow("--rev is a number from 2");
  });
});
