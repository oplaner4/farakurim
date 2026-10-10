import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { weekDays } from "./porad";
import { runStage } from "./cli";
import { useStageFixture } from "../test-helpers";

describe("runStage", { timeout: 30_000 }, () => {
  const { env, download, poster } = useStageFixture();

  it("parses each command's arguments", async () => {
    const source = download("porad.pdf", "%PDF");
    const { lines } = await runStage(env, ["porad", source, "--from", "2026-10-04", "--to", "2026-10-11", "--check"]);
    expect(lines[0]).toBe("Would stage uploads/porady_bohosluzeb/2026-10-04-porad-bohosluzeb.pdf");

    const sheetFile = join(env.home, "sheet.json");
    writeFileSync(
      sheetFile,
      JSON.stringify({
        days: weekDays("2099-10-04", "2099-10-11").map((d) => ({ date: d.slice(3), rows: [] })),
        announcements: [],
      }),
    );
    const sheet = await runStage(env, [
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
    const aktualita = await runStage(env, [
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
      "Would add the record to src/content/news/2026/10.json",
      "Would stage uploads/aktuality/x-2026-letak.jpg",
    ]);
  });

  it("refuses missing arguments, another command's options and the old --rev", async () => {
    await expect(runStage(env, ["aktualita", "a.jpg", "x"])).rejects.toThrow("wrong arguments\nUsage: pnpm stage");
    await expect(runStage(env, [])).rejects.toThrow(
      /Largest source file: aktualita \d+ MB, porad \d+ MB, petrklic \d+ MB/,
    );
    await expect(runStage(env, ["petrklic", "a.pdf", "--year", "2026"])).rejects.toThrow("wrong arguments");
    await expect(runStage(env, ["petrklic", "a.pdf", "--year", "2026.5", "--number", "1"])).rejects.toThrow(
      "wrong arguments",
    );
    await expect(runStage(env, ["petrklic", "a.pdf", "2026-1"])).rejects.toThrow("wrong arguments");
    await expect(runStage(env, ["petrklic", "a.pdf", "--year", "", "--number", "1"])).rejects.toThrow(
      "wrong arguments",
    );
    await expect(runStage(env, ["petrklic", "a.pdf", "--year", "2026", "--number", " "])).rejects.toThrow(
      "wrong arguments",
    );
    await expect(runStage(env, ["petrklic", "a.pdf", "--year", "0x7EA", "--number", "1"])).rejects.toThrow(
      "wrong arguments",
    );
    await expect(runStage(env, ["tisk", "a.pdf"])).rejects.toThrow("wrong arguments");
    await expect(runStage(env, ["porad", "a.pdf", "--rev", "2"])).rejects.toThrow("Unknown option '--rev'");
    await expect(runStage(env, ["petrklic", "a.pdf", "--year", "2026", "--number", "1", "--rev", "2"])).rejects.toThrow(
      "Unknown option '--rev'",
    );
  });

  it("refuses a lone --from or --to and a date that does not exist", async () => {
    const porad = (...options: string[]) => runStage(env, ["porad", "a.pdf", ...options]);
    const dates = "wrong arguments: --from and --to are YYYY-MM-DD dates, both or neither";
    await expect(porad("--from", "2026-10-04")).rejects.toThrow(dates);
    await expect(porad("--to", "2026-10-11")).rejects.toThrow(dates);
    await expect(porad("--from", "2026-10-04", "--to", "2026-10-32")).rejects.toThrow(dates);
    await expect(porad("--from", "4. 10. 2026", "--to", "2026-10-11")).rejects.toThrow(dates);
  });
});
