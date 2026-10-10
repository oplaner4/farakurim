import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { commandExitCode, errorMessage } from "./command";

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
