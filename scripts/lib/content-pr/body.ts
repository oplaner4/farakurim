// The body of a content PR: Claude's report, the end marker (so a comment fix can replace the report), the Události
// lines that need a person for events, and the footer naming the workflow.

import type { Kind } from "../content-release/plan";
import { REPORT_END } from "../content-fix/body";

const FOOTER = {
  sheet: { workflow: "the service sheet workflow (`service-sheet.yml`)", files: "staged PDFs" },
  events: { workflow: "the events workflow (`events.yml`)", files: "staged files" },
} as const satisfies Record<Kind, unknown>;

export type BodyOptions = {
  kind: Kind;
  /** The report, without its header lines. */
  report: string;
  /** This run's URL. */
  runUrl: string;
  /** What `pnpm calendar-sync --calendar events --problems` printed: the events that need a person in Události. */
  calendar?: string;
};

export function pullBody({ kind, report, runUrl, calendar }: BodyOptions): string {
  const { workflow, files } = FOOTER[kind];
  const events = calendar?.trim()
    ? [
        "## Události",
        "",
        "Needs a person in Události before the merge (an `ask:` event stays out of the calendar until then):",
        "",
        "```text",
        calendar.trim(),
        "```",
        "",
      ]
    : [];
  return [
    report.trim(),
    "",
    REPORT_END,
    "",
    ...events,
    "---",
    "",
    `Opened by ${workflow}. Squash merge to publish: the merge releases the site.`,
    "Comment `@claude …` in this conversation to correct it (`content-fix-run.yml`).",
    `The ${files} are in the artifact \`content-uploads-<sha>\` of each commit; this run: ${runUrl}`,
    "",
  ].join("\n");
}
