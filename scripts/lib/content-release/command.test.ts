import { describe, expect, it } from "vitest";
import { parseCommand } from "./command";

describe("parseCommand", () => {
  it("takes no arguments", () => {
    expect(parseCommand([])).toEqual({ action: "plan" });
    expect(parseCommand(["apply", "p.json", "d"])).toEqual({ action: "apply", plan: "p.json", from: "d" });
    expect(() => parseCommand(["apply"])).toThrow(/apply <plan.json> <dir>/);
    expect(() => parseCommand(["abc"])).toThrow(/unexpected argument abc/);
  });
});
