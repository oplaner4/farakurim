import { describe, expect, it } from "vitest";
import { fixInput, REPORT_END, splitPullBody } from "./body";

const footer = "---\n\nOpened by the events workflow (`events.yml`). Squash merge to publish.\nThe staged files: run.";

describe("splitPullBody", () => {
  it("splits at the report end marker", () => {
    const body = `## Hody\n\nOutcome: created\n${REPORT_END}\n## Události\n\n- Hody\n\n${footer}\n`;
    expect(splitPullBody(body)).toEqual({
      report: "## Hody\n\nOutcome: created",
      rest: `## Události\n\n- Hody\n\n${footer}`,
    });
  });

  it("falls back to the Události section or the footer", () => {
    const events = `## Hody\n\nOutcome: created\n\n## Události\n\n- Hody\n\n${footer}`;
    expect(splitPullBody(events).report).toBe("## Hody\n\nOutcome: created");
    const sheet = `## Sheet\n\nText\n\n${footer}`;
    expect(splitPullBody(sheet)).toEqual({ report: "## Sheet\n\nText", rest: footer });
    expect(splitPullBody("## Only\n")).toEqual({ report: "## Only", rest: "" });
  });
});

describe("fixInput", () => {
  it("writes the fix input with the PR's draft state and title", () => {
    expect(fixInput({ title: "feat(content): add the Hody event", draft: true, body: `## Hody\n\n${footer}` })).toBe(
      "blocking: yes\ncommit: feat(content): add the Hody event\n\n## Hody\n",
    );
  });
});
