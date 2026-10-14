import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { actionVerb, commandExitCode, errorMessage, parseCommandLine, readJsonRecord } from "./command";
import { freshTempDir } from "./test-helpers";

describe("errorMessage", () => {
  it("adds the cause, as fetch() reports a network failure", () => {
    const error = new TypeError("fetch failed", { cause: new Error("getaddrinfo ENOTFOUND eu.zonerama.com") });
    expect(errorMessage(error)).toBe("fetch failed (getaddrinfo ENOTFOUND eu.zonerama.com)");
  });

  it("is the message alone without a cause, and the value itself for a non-error", () => {
    expect(errorMessage(new Error("the album has no photos"))).toBe("the album has no photos");
    expect(errorMessage("oops")).toBe("oops");
  });
});

describe("commandExitCode", () => {
  let printed: MockInstance<typeof console.error>;
  beforeEach(() => {
    printed = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => printed.mockRestore());

  const parse = (args: string[]) => {
    if (args.length !== 1) throw new Error("Usage: pnpm demo <id>");
    return { id: args[0] };
  };

  it("runs the parsed command and is 0", async () => {
    const run = vi.fn();
    expect(await commandExitCode("demo", ["hody"], parse, run)).toBe(0);
    expect(run).toHaveBeenCalledWith({ id: "hody" });
    expect(printed).not.toHaveBeenCalled();
  });

  it("is 2 for wrong arguments, without running", async () => {
    const run = vi.fn();
    expect(await commandExitCode("demo", [], parse, run)).toBe(2);
    expect(run).not.toHaveBeenCalled();
    expect(printed).toHaveBeenCalledWith("demo: Usage: pnpm demo <id>");
  });

  it("is 1 when the command fails, naming the cause", async () => {
    const run = async () => {
      throw new TypeError("fetch failed", { cause: new Error("ENOTFOUND") });
    };
    expect(await commandExitCode("demo", ["hody"], parse, run)).toBe(1);
    expect(printed).toHaveBeenCalledWith("demo: fetch failed (ENOTFOUND)");
  });

  it("awaits an async parse", async () => {
    const run = vi.fn();
    expect(await commandExitCode("demo", ["x"], async (args) => args[0], run)).toBe(0);
    expect(run).toHaveBeenCalledWith("x");
  });
});

describe("parseCommandLine", () => {
  const options = { check: { type: "boolean" }, out: { type: "string" } } as const;

  it("reads the positionals and the options", () => {
    expect(parseCommandLine(["x.json", "--check", "--out", "dir"], options, "Usage")).toEqual({
      positionals: ["x.json"],
      values: { check: true, out: "dir" },
    });
  });

  it("throws with the usage for an unknown option or a missing value", () => {
    expect(() => parseCommandLine(["--chekc"], options, "Usage: pnpm x")).toThrow(/--chekc[^]*\nUsage: pnpm x$/);
    expect(() => parseCommandLine(["--out"], options, "Usage: pnpm x")).toThrow(/\nUsage: pnpm x$/);
  });
});

describe("readJsonRecord", () => {
  const dir = freshTempDir("command");

  it("reads the JSON, or throws naming the file", () => {
    const file = join(dir(), "record.json");
    writeFileSync(file, '{ "id": "x" }');
    expect(readJsonRecord(file)).toEqual({ id: "x" });
    writeFileSync(file, "{ id");
    expect(() => readJsonRecord(file)).toThrow(`${file} is not a JSON file:`);
    expect(() => readJsonRecord(join(dir(), "missing.json"))).toThrow("missing.json is not a JSON file:");
  });
});

describe("actionVerb", () => {
  it("says what a check would do, else what was done", () => {
    expect(actionVerb(true, "add")).toBe("Would add");
    expect(actionVerb(false, "add")).toBe("Added");
    expect(actionVerb(false, "unpin")).toBe("Unpinned");
  });
});
