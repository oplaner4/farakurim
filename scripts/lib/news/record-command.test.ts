import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatAndTestNews } from "../content-files";
import { freshTempDir } from "../test-helpers/files";
import { recordCommand } from "./record-command";

vi.mock("../content-files", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../content-files")>()),
  formatAndTestNews: vi.fn(async () => {}),
}));

describe("recordCommand", () => {
  const dir = freshTempDir("record-command");
  afterEach(() => vi.restoreAllMocks());

  const command = recordCommand("Usage: pnpm x <record.json | -> [--check]", (input, check) => ({
    lines: [`${check ? "Would run" : "Ran"} on ${(input as { id: string }).id}`],
    written: check ? [] : ["2026/10.json"],
  }));

  it("reads the record file and --check, with the given usage", () => {
    expect(command.parseCommand(["-", "--check"])).toEqual({ file: "-", check: true });
    expect(command.parseCommand(["r.json"])).toEqual({ file: "r.json", check: false });
    expect(() => command.parseCommand([])).toThrow(/^Usage: pnpm x/);
  });

  it("runs on the record, prints its lines, and formats and tests the files it wrote unless it only checked", async () => {
    const file = join(dir(), "record.json");
    writeFileSync(file, JSON.stringify({ id: "hody-2026" }));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await command.execute({ file, check: true });
    expect(log).toHaveBeenLastCalledWith("Would run on hody-2026");
    expect(formatAndTestNews).not.toHaveBeenCalled();
    await command.execute({ file, check: false });
    expect(log).toHaveBeenLastCalledWith("Ran on hody-2026");
    expect(formatAndTestNews).toHaveBeenCalledWith(["2026/10.json"]);
  });
});
