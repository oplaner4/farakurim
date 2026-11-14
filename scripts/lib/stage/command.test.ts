import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SERVICE_SHEETS_TESTS } from "../content-files";
import { runStage } from "./command";
import { emptyWeek, useStageFixture } from "../test-helpers/content";

describe("runStage", { timeout: 30_000 }, () => {
  const { env, download, poster } = useStageFixture();

  it("parses each command's arguments", async () => {
    const source = download("porad.pdf", "%PDF");
    const { lines } = await runStage(env, ["sheet", source, "--from", "2099-10-04", "--to", "2099-10-11", "--check"]);
    expect(lines[0]).toBe("Would stage uploads/porady_bohosluzeb/2099-10-04-porad-bohosluzeb.pdf");

    const sheetFile = join(env.home, "sheet.json");
    writeFileSync(
      sheetFile,
      JSON.stringify({
        days: emptyWeek("2099-10-04", "2099-10-11"),
        announcements: [],
      }),
    );
    const sheet = await runStage(env, [
      "sheet",
      source,
      "--from",
      "2099-10-04",
      "--to",
      "2099-10-11",
      "--record",
      sheetFile,
    ]);
    expect(sheet.format).toEqual({ files: [env.serviceSheetsFile], tests: SERVICE_SHEETS_TESTS });

    const recordFile = join(env.home, "record.json");
    writeFileSync(recordFile, JSON.stringify({ id: "x-2026", title: "T", start: "2026-10-20", place: "P", text: "T" }));
    // The id is the record's.
    const staged = await runStage(env, [
      "event",
      await poster(),
      "Leták",
      "--no-poster",
      "--record",
      recordFile,
      "--check",
    ]);
    expect(staged.lines).toEqual(["Would add the record x-2026", "Would stage uploads/aktuality/x-2026-letak.jpg"]);
  });

  it("refuses missing arguments, another command's options and the old --rev", async () => {
    // An unpaired source (also the old id before the files), and --poster (the first file is the poster unless
    // --no-poster).
    await expect(runStage(env, ["event", "a.jpg"])).rejects.toThrow("wrong arguments\nUsage: pnpm stage");
    await expect(runStage(env, ["event", "x", "a.jpg", "Plakát"])).rejects.toThrow("wrong arguments");
    await expect(runStage(env, ["event", "a.jpg", "Plakát", "--poster"])).rejects.toThrow("wrong arguments");
    await expect(runStage(env, [])).rejects.toThrow(/Largest source file: event \d+ MB, sheet \d+ MB, petrklic \d+ MB/);
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
    // The issue's PDF or --from, never both or neither.
    await expect(runStage(env, ["petrklic", "--year", "2026", "--number", "1"])).rejects.toThrow("wrong arguments");
    await expect(
      runStage(env, ["petrklic", "a.pdf", "--from", "2026-1", "--year", "2026", "--number", "2"]),
    ).rejects.toThrow("wrong arguments");
    await expect(runStage(env, ["tisk", "a.pdf"])).rejects.toThrow("wrong arguments");
    await expect(runStage(env, ["sheet", "a.pdf", "--rev", "2"])).rejects.toThrow("Unknown option '--rev'");
    // Each sheet subcommand takes only its own options and positionals.
    await expect(runStage(env, ["sheet", "--from", "2099-10-04", "--to", "2099-10-11"])).rejects.toThrow(
      "wrong arguments",
    );
    await expect(runStage(env, ["sheet", "draft", "a.docx", "--record", "r.json"])).rejects.toThrow("wrong arguments");
    await expect(runStage(env, ["sheet", "draft", "a.docx"])).rejects.toThrow("sheet draft needs --out");
    await expect(runStage(env, ["sheet", "draft", "a.pdf", "--out", "d.json"])).rejects.toThrow(
      "a draft is read from the parish's DOCX",
    );
    await expect(runStage(env, ["petrklic", "a.pdf", "--year", "2026", "--number", "1", "--rev", "2"])).rejects.toThrow(
      "Unknown option '--rev'",
    );
  });

  it("takes an event's id from its record, else from --id for --corrected only", async () => {
    const recordFile = join(env.home, "record.json");
    writeFileSync(recordFile, JSON.stringify({ title: "T" }));
    const files = ["a.jpg", "Plakát"];
    await expect(runStage(env, ["event", ...files, "--check"])).rejects.toThrow("a new event needs --record");
    await expect(runStage(env, ["event", ...files, "--id", "x-2026", "--check"])).rejects.toThrow(
      "a new event needs --record",
    );
    await expect(runStage(env, ["event", ...files, "--record", recordFile, "--check"])).rejects.toThrow(
      "the record has no id",
    );
    await expect(
      runStage(env, ["event", ...files, "--corrected", "--id", "x-2026", "--record", recordFile, "--check"]),
    ).rejects.toThrow("--id or --record, not both");
    await expect(runStage(env, ["event", ...files, "--corrected", "--check"])).rejects.toThrow(
      "--corrected needs --record or --id",
    );
    // --corrected with --id: the record on the site, here none.
    await expect(runStage(env, ["event", ...files, "--corrected", "--id", "nic-2026", "--check"])).rejects.toThrow(
      "there is no event nic-2026",
    );
  });

  it("refuses a lone --from or --to and a date that does not exist", async () => {
    const runSheet = (...options: string[]) => runStage(env, ["sheet", "a.pdf", ...options]);
    const dates = "wrong arguments: --from and --to are YYYY-MM-DD dates, both or neither";
    await expect(runSheet("--from", "2026-10-04")).rejects.toThrow(dates);
    await expect(runSheet("--to", "2026-10-11")).rejects.toThrow(dates);
    await expect(runSheet("--from", "2026-10-04", "--to", "2026-10-32")).rejects.toThrow(dates);
    await expect(runSheet("--from", "4. 10. 2026", "--to", "2026-10-11")).rejects.toThrow(dates);
  });
});
