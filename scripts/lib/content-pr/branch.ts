// Chooses the branch of a content mail run, before the agent's step: a sheet run continues the one open sheet PR of
// this repo (its branch, and its stored report the run merges into), else a run starts a new branch named after the
// mail's date with a suffix while that name is taken on origin (by an open or closed PR's branch).

import { isIsoDate } from "@/lib/shared/prague";
import { KINDS, type Kind } from "../content-release/plan";
import type { GitHubReader } from "../content-release/sources";
import { git } from "../git";
import { storedReportOf } from "./stored";

/** The branch a run commits to; `pr` and `report` (the PR's stored report artifact) for an open sheet PR's branch. */
export type BranchChoice = {
  branch: string;
  /** The commit the agent's change is based on: the PR branch's head on origin, else HEAD. */
  base: string;
  pr?: number;
  report?: { runId: number; name: string };
};

export const MISSING_REPORT =
  "The PR's report is missing or unreadable: close the PR and send the sheet or event again.";

/** Whether origin has the branch `name` (fetched before, as the checkout's remote refs). */
const onOrigin = (cwd: string, name: string) => {
  try {
    git(cwd, "show-ref", "--quiet", "--verify", `refs/remotes/origin/${name}`);
    return true;
  } catch {
    return false;
  }
};

/** `<prefix><date>`, else with `-2`, `-3`, … while origin has the name; `date` is `today` unless it is an IsoDate. */
export function newBranchName(cwd: string, kind: Kind, date: string, today: string): string {
  const stem = `${KINDS[kind].prefix}${isIsoDate(date) ? date : today}`;
  let name = stem;
  for (let n = 2; onOrigin(cwd, name); n++) name = `${stem}-${n}`;
  return name;
}

/**
 * The branch of a run of `kind` in the checkout `cwd`: for a sheet, the newest open PR of this repo on a sheet branch
 * with its stored report (none throws MISSING_REPORT: a second PR would conflict with it), else a new branch from
 * `date` (`today` when it is not a date).
 */
export async function chooseBranch(
  kind: Kind,
  { cwd, date, today, github }: { cwd: string; date: string; today: string; github: () => GitHubReader },
): Promise<BranchChoice> {
  if (kind === "sheet") {
    const reader = github();
    const pull = (await reader.openPulls()).find((p) => !p.fork && p.branch.startsWith(KINDS.sheet.prefix));
    if (pull) {
      const report = await storedReportOf(pull.number, reader);
      if (!report) throw new Error(MISSING_REPORT);
      const base = git(cwd, "rev-parse", `refs/remotes/origin/${pull.branch}`).trim();
      return { branch: pull.branch, base, pr: pull.number, report };
    }
  }
  return { branch: newBranchName(cwd, kind, date, today), base: git(cwd, "rev-parse", "HEAD").trim() };
}

/** The choice as the step's outputs: `pr`, `report_run` and `report_name` are "" without an open PR. */
export const branchOutputs = ({ branch, base, pr, report }: BranchChoice) => ({
  branch,
  base,
  pr: pr === undefined ? "" : String(pr),
  report_run: report ? String(report.runId) : "",
  report_name: report?.name ?? "",
});
