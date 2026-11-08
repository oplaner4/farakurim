// pnpm content-pr: the checks between Claude's run and the commit of a content PR, run by the mail workflows (service
// sheet, events) and the comment fix on a fresh checkout. No skill uses it.
//
// `apply` checks Claude's report (line 1 `blocking: yes|no`, line 2 `commit: <message>`, then one `## ` section per
// week or event with exactly one `Outcome:` line) against the patch: a change needs an item created (or a week
// corrected), no change needs a report explaining it. It then applies the patch, only if it touches nothing but the
// kind's content files (sheets: src/content/*.json; events: the news month files), and prints
// `{ changed, draft, message }`: `draft` unless the report says exactly `blocking: no`, `message` the report's commit
// message when commitlint accepts it, else a default. A refused report or patch fails and applies nothing. `patch`
// only checks and applies a patch. `body` prints the PR body: the report, its end marker, the Události lines that need
// a person (`--calendar`, the output of `pnpm calendar-sync --calendar events --problems`) and the footer; with
// `--fix`, the report is a comment fix's (`pnpm content-fix report`'s body.md) and the footer names the last correction. `outcomes`
// prints `- <item>: <outcome>` for each item of the report (`--failed`: only those not published), nothing without it.
//
// Usage: pnpm --silent content-pr apply --kind <sheet|events> <report.md> <content.patch>
//        pnpm content-pr patch --kind <sheet|events> <content.patch>
//        pnpm --silent content-pr body --kind <sheet|events> --run-url <url> [--calendar <file>] [--fix] <report.md>
//        pnpm --silent content-pr outcomes --kind <sheet|events> [--failed] <report.md>
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/content-pr/command";

runCommand("content-pr", import.meta.url, parseCommand, execute);
