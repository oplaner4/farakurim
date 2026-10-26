export type FixReport = {
  blocking: boolean;
  commit: string;
  fix: string;
  changed: boolean;
  report: string;
  reply: string;
};

// As `OUTCOME_SED` in the pipelines: a list marker and bold around `Outcome:` are dropped.
function outcomeOf(line: string): string | null {
  const plain = line
    .replace(/^\s*[-*]\s+/, "")
    .replace(/^\*\*(Outcome:[^*]*)\*\*/, "$1")
    .replace(/^\*\*Outcome\*\*:/, "Outcome:");
  const match = /^Outcome:\s*(.*)$/.exec(plain);
  return match ? match[1].trim() : null;
}

/** Reads Claude's fix report: three header lines, the report, and `## Reply` led by an `Outcome:` line. */
export function parseFixReport(text: string): FixReport {
  const lines = text.split(/\r?\n/);
  const blocking = /^blocking: (yes|no)$/.exec(lines[0] ?? "");
  if (!blocking) throw new Error("The report lacks its first line, `blocking: yes|no`.");
  const commit = /^commit: (.+)$/.exec(lines[1] ?? "");
  if (!commit) throw new Error("The report lacks its second line, `commit: <message>`.");
  const fix = /^fix: (.+)$/.exec(lines[2] ?? "");
  if (!fix) throw new Error("The report lacks its third line, `fix: <message>`.");
  const replyAt = lines.findIndex((line, i) => i >= 3 && line.trim() === "## Reply");
  if (replyAt === -1) throw new Error("The report lacks its `## Reply` section.");
  const section = lines.slice(replyAt + 1);
  const outcomeAt = section.findIndex((line) => outcomeOf(line) !== null);
  if (outcomeAt === -1) throw new Error("The `## Reply` section lacks its `Outcome:` line.");
  const outcome = outcomeOf(section[outcomeAt]);
  if (outcome !== "changed" && outcome !== "unchanged") {
    throw new Error("The `Outcome:` line says neither `changed` nor `unchanged`.");
  }
  return {
    blocking: blocking[1] === "yes",
    commit: commit[1].trim(),
    fix: fix[1].trim(),
    changed: outcome === "changed",
    report: lines.slice(3, replyAt).join("\n").trim(),
    reply: section
      .slice(outcomeAt + 1)
      .join("\n")
      .trim(),
  };
}
