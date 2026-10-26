// pnpm content-fix: the steps of the content-fix workflow, which fixes a content PR (service sheet, events) from a
// `@claude` comment on it. Only that workflow runs it. The subcommands that read the GitHub API take the repository
// and the token from GITHUB_REPOSITORY and GH_TOKEN.
//
// `next` prints `{ open, kind, head, branch, comment, remaining }` for the PR: `kind` is `sheet` or `events` (null for
// another branch or a fork), `comment` the id of the oldest request no reply answers yet (null for none) and
// `remaining` the requests after it. Only a commenter with write access asks. For a request it writes
// `<dir>/comment.md` (the comment) and `<dir>/report.md` (the PR's state, commit message and report, for Claude to
// correct). `artifacts` prints `<run id> <name>` for each artifact of the PR's commits, oldest first, and fails on an
// expired one. `apply` copies the downloaded artifacts (each in `<dir>/<name>/`) into uploads/, checked as
// `content-release apply` does. `check-log` writes the failed steps of the commit's `check` run to a file and prints
// `failed`, or prints `ok` and writes nothing. `report` reads Claude's report and writes `<dir>/body.md` (the PR body's
// report, ended by the report end marker) and `<dir>/reply.md` (the reply to the comment), and prints
// `{ blocking, commit, fix, changed }`.
//
// Usage: pnpm content-fix next --pr <n> --out <dir>
//        pnpm content-fix artifacts --pr <n> --kind <sheet|events>
//        pnpm content-fix apply --pr <n> --kind <sheet|events> <dir>
//        pnpm content-fix check-log --sha <sha> --out <file>
//        pnpm content-fix report <report.md> --out <dir>
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/content-fix/command";

runCommand("content-fix", import.meta.url, parseCommand, execute);
