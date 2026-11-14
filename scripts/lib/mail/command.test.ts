import { describe, expect, it } from "vitest";
import { mailboxCommand } from "./command";

describe("mailboxCommand", () => {
  it("reads fetch and file", () => {
    expect(mailboxCommand("fetch", { out: "x" }, "Usage")).toEqual({ action: "fetch", out: "x" });
    expect(mailboxCommand("file", { processed: "1,3", rejected: "2" }, "Usage")).toEqual({
      action: "file",
      processed: [1, 3],
      rejected: [2],
    });
    expect(mailboxCommand("file", {}, "Usage")).toEqual({ action: "file", processed: [], rejected: [] });
  });

  it("refuses a uid that is not a number", () => {
    expect(() => mailboxCommand("file", { processed: "a" }, "Usage")).toThrow("not a message uid");
  });

  it("leaves another action to the caller and refuses a fetch without --out", () => {
    expect(mailboxCommand("known", { out: "x" }, "Usage")).toBeUndefined();
    expect(mailboxCommand(undefined, {}, "Usage")).toBeUndefined();
    expect(() => mailboxCommand("fetch", {}, "Usage: x")).toThrow("fetch needs --out\nUsage: x");
  });
});
