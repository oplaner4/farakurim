export const REPORT_END = "<!-- report-end -->";

/** Where a body written before the end marker ends its report: the events section or the footer. */
function fallbackEnd(lines: string[]): number {
  return lines.findIndex(
    (line, i) => line.startsWith("## Události") || (line === "---" && (lines[i + 2] ?? "").startsWith("Opened by the")),
  );
}

/** Splits a PR body into the report and what the workflow added after it (events section, footer). */
export function splitPullBody(body: string): { report: string; rest: string } {
  const lines = body.split(/\r?\n/);
  let end = lines.findIndex((line) => line.trim() === REPORT_END);
  const marked = end !== -1;
  if (!marked) end = fallbackEnd(lines);
  if (end === -1) return { report: body.trim(), rest: "" };
  return {
    report: lines.slice(0, end).join("\n").trim(),
    rest: lines
      .slice(marked ? end + 1 : end)
      .join("\n")
      .trim(),
  };
}

/** The input Claude gets: the PR's state and commit message, then the report it may correct. */
export function fixInput({ title, draft, body }: { title: string; draft: boolean; body: string }): string {
  return `blocking: ${draft ? "yes" : "no"}\ncommit: ${title}\n\n${splitPullBody(body).report}\n`;
}
