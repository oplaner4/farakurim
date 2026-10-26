import { describe, expect, it } from "vitest";
import { parseFixReport } from "./report";

const full = `blocking: no
commit: fix(content): correct the Hody time
fix: Corrected the time

## Hody

Time changed.

## Reply

- **Outcome:** changed

Opraveno, díky.
`;

describe("parseFixReport", () => {
  it("reads the header, the report and the reply", () => {
    expect(parseFixReport(full)).toEqual({
      blocking: false,
      commit: "fix(content): correct the Hody time",
      fix: "Corrected the time",
      changed: true,
      report: "## Hody\n\nTime changed.",
      reply: "Opraveno, díky.",
    });
  });

  it("tolerates plain and bold Outcome forms", () => {
    const plain = full.replace("- **Outcome:** changed", "Outcome: unchanged");
    expect(parseFixReport(plain).changed).toBe(false);
    expect(parseFixReport(full.replace("- **Outcome:** changed", "**Outcome: changed**")).changed).toBe(true);
  });

  it("refuses a report without its reply", () => {
    expect(() => parseFixReport(full.slice(0, full.indexOf("## Reply")))).toThrow(/## Reply/);
    expect(() => parseFixReport(full.replace("- **Outcome:** changed", "Hotovo"))).toThrow(/Outcome:/);
  });

  it("refuses a report without the fix line", () => {
    expect(() => parseFixReport(full.replace("fix: Corrected the time\n", ""))).toThrow(/fix:/);
  });
});
