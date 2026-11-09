import { describe, expect, it } from "vitest";
import { ask, next, refusal, refusalReason, state, tell } from "./output";

describe("the tagged lines", () => {
  it("tags a line", () => {
    expect(tell("Days without services: 4. 10.")).toBe("tell: Days without services: 4. 10.");
    expect(ask("Which dates does the week have?")).toBe("ask: Which dates does the week have?");
    expect(next("pass --corrected")).toBe("next: pass --corrected");
    expect(state("staged")).toBe("state: staged");
  });

  it("puts a refusal's reason first and its tagged lines under it", () => {
    const error = refusal("the issue 2025-4 is already added", next("pass --corrected for a corrected PDF"));
    expect(error.message).toBe("the issue 2025-4 is already added\nnext: pass --corrected for a corrected PDF");
    expect(refusalReason(error.message)).toBe("the issue 2025-4 is already added");
  });
});
