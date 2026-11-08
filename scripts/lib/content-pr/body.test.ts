import { describe, expect, it } from "vitest";
import { splitPullBody } from "../content-fix/body";
import { pullBody } from "./body";

describe("pullBody", () => {
  const runUrl = "https://github.com/o/r/actions/runs/1";

  it("ends the report with the marker and the sheet footer", () => {
    expect(pullBody({ kind: "sheet", report: "## A\n\nOutcome: created\n", runUrl })).toBe(
      [
        "## A\n\nOutcome: created",
        "",
        "<!-- report-end -->",
        "",
        "---",
        "",
        "Opened by the service sheet workflow (`service-sheet.yml`). Squash merge to publish: the merge releases the site.",
        "Comment `@claude …` in this conversation to correct it (`content-fix-run.yml`).",
        `The staged PDFs are in the artifact \`content-uploads-<sha>\` of each commit; this run: ${runUrl}`,
        "",
      ].join("\n"),
    );
  });

  it("adds the Události lines for events, after the marker, so a comment fix keeps the report alone", () => {
    const body = pullBody({ kind: "events", report: "## Pouť", runUrl, calendar: "ask: Pouť\n" });
    expect(body).toContain("## Události\n\nNeeds a person in Události");
    expect(body).toContain("```text\nask: Pouť\n```");
    expect(body).toContain("The staged files are in the artifact");
    expect(splitPullBody(body).report).toBe("## Pouť");
    expect(pullBody({ kind: "events", report: "## Pouť", runUrl, calendar: "\n" })).not.toContain("Události");
  });
});
