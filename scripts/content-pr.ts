// pnpm content-pr: the checks between the agent's run and the commit of a content PR, run by the mail workflows
// (service sheet, events) and the comment fix on a fresh checkout. The agent runs `check` on its own report (the
// "Unattended run" and "Comment run" sections of the content skills); no skill uses the other actions.
//
// Every action reads the agent's JSON report (scripts/lib/content-pr/report-schema.ts). `check` reads it as `apply`
// does and prints `The report is valid.`, or fails with each issue as `<path>: <message>`. With `--run`, the report is
// a sheet mail run's (one week and its question updates), merged into the PR's report given by `--previous` (none on
// the PR's first run); a previous report that is missing, unreadable or of another version fails with "close the PR
// and send the sheet or event again". `--fix` adds a comment fix's result (fix.json) beside the full report, and `--original` the PR's report the fix
// corrected in place: the corrected one may differ from it only where a fix may change it (an open question resolved
// with its answer; the title, origin and appended venues of an event, or the summary of a week, whose record the
// working tree changes against HEAD), else each difference is an issue.
//
// `stored` prints `<runId> <name>` of the PR's newest stored report artifact (`content-report-<sha>` of the newest
// commit that has one, trusted and live), or nothing; it reads the GitHub API with GH_TOKEN for GITHUB_REPOSITORY.
//
// `apply` reads the report as `check` does; with `--fix`, the fix result's `outcome` must agree with whether the patch
// changes anything. It applies the patch (checking a fix's report against `--original` as `check` does), only if it touches nothing but the kind's content files (sheets:
// src/content/*.json; events: the news month files and the venue list), then checks the report against the whole PR
// (the checkout against its merge base with `--base`): every week the PR adds or changes is `created` or `corrected`
// and the reverse, the events it adds are exactly the `created` ones. A mismatch undoes the patch and fails. It writes
// the final report to `<out>/report.json` and prints `{ changed, draft, message, fix? }`: `draft` when an open
// question blocks, `message` the PR's commit message named from the change (the kind's default when commitlint
// refuses it), `fix` (with `--fix` and a change) the fix's commit message: the result's `fixMessage`, else one named
// from what the fix changed, else the default. `body` prints the PR body rendered from a final report, the Události
// lines that need a person (`--calendar`, the output of `pnpm calendar-sync --calendar events --problems`) and the
// footer (with `--fix`, naming the run as the last correction). `summary` prints the job summary (the mail's lines,
// what became of the sheet or mail, the weeks or events, and what the maintainer must do) from the step results the
// workflow passes in the environment (FETCHED, SUMMARY, HANDLED, JOB_RESULT, AGENT, DOWNLOAD, APPLY, CHANGED,
// PR_OUTCOME, PR_ACTION, PR_URL; sheet: NO_DOCX, NO_WEEK, UNHANDLED, SKIPPED; events: INCOMPLETE, KNOWN_DKIM) and the
// report (a full one, else a sheet run's on its own, else none), and fails when the maintainer must act without a PR
// to look at.
//
// Usage: pnpm content-pr check --kind <sheet|events> [--run] [--previous <report.json>]
//                              [--fix <fix.json> --original <report.json>] <report.json>
//        pnpm --silent content-pr stored --pr <n>
//        pnpm --silent content-pr apply --kind <sheet|events> --base <ref> --out <dir> [--run]
//                                       [--previous <report.json>] [--fix <fix.json> --original <report.json>]
//                                       <report.json> <content.patch>
//        pnpm --silent content-pr body --kind <sheet|events> --run-url <url> [--calendar <file>] [--fix] <report.json>
//        pnpm --silent content-pr summary --kind <sheet|events> <report.json>
//
// Options: --kind      the content of the PR: sheet (service sheets) or events
//          --run       the report is a sheet mail run's, merged into --previous (sheet only)
//          --previous  the PR's stored report, as `stored` finds it (with --run)
//          --fix       check, apply: a comment fix's result file; body: the body of a comment fix
//          --original  check, apply: the PR's report the comment fix corrected (with --fix)
//          --base      the ref whose merge base with HEAD the PR's facts are checked against (origin/main)
//          --out       the folder `apply` writes the final report.json to
//          --pr        the PR number
//          --run-url   this run's URL, named in the body's footer
//          --calendar  the events that need a person in Události, shown in the body
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/content-pr/command";

runCommand("content-pr", import.meta.url, parseCommand, execute);
