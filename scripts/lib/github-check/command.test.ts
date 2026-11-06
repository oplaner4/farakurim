import { describe, expect, it } from "vitest";
import { parseCommand, repositoryOfRemote } from "./command";

describe("repositoryOfRemote", () => {
  it("reads owner/name from an ssh or https remote", () => {
    expect(repositoryOfRemote("git@github.com:oplaner4/farakurim.git\n")).toBe("oplaner4/farakurim");
    expect(repositoryOfRemote("https://github.com/oplaner4/farakurim")).toBe("oplaner4/farakurim");
    expect(repositoryOfRemote("https://github.com/oplaner4/farakurim.git/")).toBe("oplaner4/farakurim");
    expect(repositoryOfRemote("https://gitlab.com/oplaner4/farakurim.git")).toBeNull();
  });
});

describe("parseCommand", () => {
  it("takes no arguments", () => {
    expect(parseCommand([])).toEqual({});
    expect(() => parseCommand(["extra"])).toThrow("unexpected argument extra");
    expect(() => parseCommand(["--fix"])).toThrow("Usage: pnpm github-check");
  });
});
