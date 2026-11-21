import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appendStepOutputs, stepOutputLines } from "./step-outputs";
import { freshTempDir } from "./test-helpers/files";

describe("stepOutputLines", () => {
  it("writes each value between its name and the delimiter", () => {
    expect(stepOutputLines({ changed: "true", message: "feat(content): add events", fix: "" }, "EOF")).toBe(
      "changed<<EOF\ntrue\nEOF\nmessage<<EOF\nfeat(content): add events\nEOF\nfix<<EOF\n\nEOF\n",
    );
  });

  it("keeps a value with a newline in its own output", () => {
    expect(stepOutputLines({ message: "one\nevil=true" }, "EOF")).toBe("message<<EOF\none\nevil=true\nEOF\n");
  });

  it("refuses a value holding the delimiter and a name a workflow cannot read", () => {
    expect(() => stepOutputLines({ message: "a\nEOF\nb" }, "EOF")).toThrow("The output message holds the delimiter");
    expect(() => stepOutputLines({ "a=b": "x" }, "EOF")).toThrow('"a=b" is not a step output name');
  });

  it("draws a new delimiter each time", () => {
    const delimiter = (lines: string) => lines.split("\n")[0].replace("pr<<", "");
    expect(delimiter(stepOutputLines({ pr: "7" }))).not.toBe(delimiter(stepOutputLines({ pr: "7" })));
  });
});

describe("appendStepOutputs", () => {
  const dir = freshTempDir("step-outputs");

  it("appends to what the step wrote before", () => {
    const file = join(dir(), "output");
    writeFileSync(file, "fetched=true\n");
    appendStepOutputs(file, { pr: "7" });
    expect(readFileSync(file, "utf8")).toMatch(/^fetched=true\npr<<(ghadelimiter_[\w-]+)\n7\n\1\n$/);
  });
});
