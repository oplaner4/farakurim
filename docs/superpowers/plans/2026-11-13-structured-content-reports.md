# Structured Content PR Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The mail and comment-fix runs write their report as JSON checked by a zod schema, kept as a per-commit
artifact, and the scripts derive the draft state, the commit messages, the PR body and the job summary from it.

**Architecture:** A schema module defines the reports; pure modules merge a sheet run into the PR's report, check its
facts against git (the whole PR against its merge base with `main`), derive messages and render Markdown. `pnpm
content-pr` gains `check` (the agent's self-check), `stored` (find the PR's report artifact) and a reworked `apply`
used by all three workflows; the content-PR action uploads `content-report-<sha>` beside `content-uploads-<sha>`.
The Markdown report parsers in `content-pr` and `content-fix` are deleted.

**Tech Stack:** TypeScript (tsx scripts), zod 4, vitest, GitHub Actions, `gh`.

**Spec:** `docs/superpowers/specs/2026-11-13-structured-content-reports-design.md`

## Global Constraints

- Report artifact: name `content-report-<sha>`, `retention-days: 30`, uploaded before the push it belongs to.
- Every report has `version: 1`; another version fails with: `The PR's report is missing or from another version:
close the PR and send the sheet or event again.`
- Question ids match `^q[1-9]\d*$` and are unique across a whole (merged) report.
- Facts are checked for the whole PR against `git merge-base HEAD origin/main`.
- Draft = any question with `blocking: true` and `status: "open"`; a fix run only ever turns a ready PR into a draft.
- Default messages: sheet `feat(content): update the service sheets`, events `feat(content): add events`, fix
  `fix(content): apply a comment correction`. Every message passes `commitlintAccepts` or falls back.
- Nothing parses the PR body. No fallback for Markdown reports (deploy when no content PR is open).
- `.claude/rules/structure.md`: entry points in `scripts/`, logic in `scripts/lib/`, tests beside modules, no
  re-exports, imports `./x` or `@/…`/`../x` as the repo does today.
- Check zod 4 APIs with context7 before use (`z.discriminatedUnion`, `z.iso.date`, `superRefine`, `z.prettifyError`
  or `error.issues`).
- Commit types: `ci(content-pr)` / `ci(content-fix)` / `ci` for scripts and workflows, `docs` / `docs(skills)` for
  docs and skills; never `feat` or the `content` scope (`blocksRelease` would hold the next content release).
- Push only after the last task: the intermediate commits change the contract between scripts and workflows.
- Verification per task: `pnpm exec vitest run --project scripts <files>`; at the end the scripts check
  `pnpm format && pnpm test:scripts && pnpm lint && pnpm exec tsc --noEmit`. `commitlintAccepts`' own test fails on
  Windows on a clean tree too (it spawns the `.bin` shim); it passes on CI.

## Review Focus

1. Czech prose with quotes, backslashes and line breaks in JSON fields renders into the PR body unchanged (Task 3).
2. A PR whose head commit was pushed by hand has no report artifact: the newest earlier commit's report is used (Task
   6).
3. A fix run that only answers a question (no patch) still passes the git check and uploads the updated report for the
   unchanged head (Task 7).
4. A week across New Year or a two-week holiday period renders and names commits correctly (Tasks 3, 5).
5. A sheet run that reuses an existing question id for a new question, or updates an unknown id, fails instead of
   overwriting (Task 4).

---

### Task 1: The report schema

**Files:**

- Create: `scripts/lib/content-pr/report-schema.ts`
- Test: `scripts/lib/content-pr/report-schema.test.ts`

**Interfaces:**

- Produces:
  - `REPORT_VERSION = 1`
  - types (from `z.infer`): `Question`, `WeekOutcome`, `WeekEntry`, `SheetReport`, `SheetRunReport`, `EventOutcome`,
    `EventEntry`, `EventsReport`, `Report = SheetReport | EventsReport`, `FixResult`
  - `parseSheetReport(value: unknown): SheetReport`, `parseSheetRunReport(value: unknown): SheetRunReport`,
    `parseEventsReport(value: unknown): EventsReport`, `parseFixResult(value: unknown): FixResult`,
    `parseReport(kind: Kind, value: unknown): Report` — each throws `ReportError`
  - `class ReportError extends Error { issues: string[] }`, message = issues joined by `\n`, each `<path>: <message>`
    (path dotted, e.g. `weeks.1.validTo`)

Shapes (spec § The schema):

```ts
Question     { id: /^q[1-9]\d*$/, blocking: boolean, status: "open"|"resolved", where: string, text: string,
               proposal?: string, answer?: string }
WeekOutcome  { kind: "created" } | { kind: "corrected" } | { kind: "refused", reason } | { kind: "document-error", reason }
WeekEntry    { validFrom: isoDate, validTo: isoDate, outcome: WeekOutcome, summary: string,
               notOnTheNewest?: string, senderNote?: string[], questions: Question[] }
SheetReport  { version: 1, kind: "sheet", weeks: WeekEntry[], questions: Question[] }
SheetRunReport { version: 1, kind: "sheet", week: WeekEntry, questions: Question[],
                 questionUpdates: { id, status: "open"|"resolved", answer?: string }[] }
EventOutcome { kind: "created", id: string } | { kind: "refused", reason: string }
EventEntry   { title: string, outcome: EventOutcome, origin?: string,
               venues: ({ kind: "new", id, name, address, pin } | { kind: "alias", id, text })[], questions: Question[] }
EventsReport { version: 1, kind: "events", events: EventEntry[], questions: Question[], droppedAttachments: string[] }
FixResult    { version: 1, outcome: "changed"|"unchanged", fixMessage: string, reply: string }
```

Objects are strict (unknown keys are issues). Cross-field rules (`superRefine`): `validFrom <= validTo`; no two weeks
with the same `validFrom`; question ids unique across the whole report (week, event and report-level questions).

- [ ] **Step 1: Write the failing tests** — `report-schema.test.ts`:
  - `parses a sheet report and an events report` (minimal valid fixtures round-trip to equal objects)
  - `rejects another version`: `parseSheetReport({ ...valid, version: 2 })` throws `ReportError` with an issue starting
    `version:`
  - `names the path of each issue`: a week with `validTo: "2026-13-01"` → issues contain `weeks.0.validTo:`
  - `rejects a backwards week, a repeated week and a repeated question id` (three cases, each one issue)
  - `rejects unknown keys`: `{ ...validWeek, Outcome: "created" }` → issue mentions `Outcome`
  - `parses a run report with question updates` and rejects `questionUpdates[0].status: "done"`
  - `parses a fix result` and rejects `outcome: "maybe"`
- [ ] **Step 2: Run** `pnpm exec vitest run --project scripts scripts/lib/content-pr/report-schema.test.ts` — FAIL
      (module missing)
- [ ] **Step 3: Implement** the schemas and parse functions in `report-schema.ts` (check zod 4 docs first).
- [ ] **Step 4: Run** the same command — PASS
- [ ] **Step 5: Commit** `ci(content-pr): add the zod schema of the content PR reports`

### Task 2: Report queries and the job summary

**Files:**

- Modify (rewrite): `scripts/lib/content-pr/report.ts`, `scripts/lib/content-pr/report.test.ts`
- Modify: `scripts/lib/content-pr/summary.ts:5-6,60-160`, `scripts/lib/content-pr/summary.test.ts`

**Interfaces:**

- Consumes: Task 1 types.
- Produces (`report.ts`, replacing everything there today):
  - `allQuestions(report: Report): Question[]` (report-level and every item's, in order)
  - `openBlockingIds(report: Report): string[]`
  - `isDraft(report: Report): boolean`
  - `itemLabel(report: Report, index: number): string` (`formatWeeks([week])` or the event's title)
  - `outcomeText(outcome: WeekOutcome | EventOutcome): string` (`created`, `corrected`, `refused: <reason>`,
    `document error: <reason>`)
  - `outcomeLines(report: Report | undefined, { failed = false } = {}): string[]` — `<label>: <outcome>`; `failed`
    keeps only refused / document-error items; `[]` without a report
- `summary.ts`: `summarize(kind, state, report: Report | undefined)` (was `report: string`); the lines it builds stay as
  today.

- [ ] **Step 1: Write the failing tests** — `report.test.ts`: `counts report-level, week and event questions`,
      `is a draft only with an open blocking question` (resolved blocking → false; open note → false),
      `labels weeks with formatWeeks and events with their title`, `lists outcome lines, or only the failed ones`.
      Update `summary.test.ts` fixtures from Markdown strings to report objects; expected lines unchanged.
- [ ] **Step 2: Run** `pnpm exec vitest run --project scripts scripts/lib/content-pr/report.test.ts
scripts/lib/content-pr/summary.test.ts` — FAIL
- [ ] **Step 3: Implement** `report.ts` and adapt `summary.ts`.
- [ ] **Step 4: Run** the same command — PASS (`command.ts` may not compile until Task 7; run only these files)
- [ ] **Step 5: Commit** `ci(content-pr): query the JSON report for questions and outcomes`

### Task 3: Rendering the PR body

**Files:**

- Create: `scripts/lib/content-pr/render.ts`, `scripts/lib/content-pr/render.test.ts`
- Modify: `scripts/lib/content-pr/body.ts`, `scripts/lib/content-pr/body.test.ts`

**Interfaces:**

- Consumes: Task 1 types, `itemLabel`, `outcomeText` (Task 2), `formatWeeks` (`weeks.ts`).
- Produces: `renderReport(report: Report): string`; `pullBody` keeps its options (`report` is the rendered Markdown)
  but no longer writes `<!-- report-end -->` (`REPORT_END` import goes).

Rendering (spec § Rendering), weeks oldest first, events in report order:

```
## <label>
Outcome: <outcomeText>
<notOnTheNewest>            (if any)

<summary | origin>
<venue lines: "New venue <id>: <name>, <address> — pin: <pin>" / "New alias \"<text>\" for <id>">

### Sender's note           (if any; one "- " line each)
### Questions               (if any)
- **q1** (blocking, open) <where>: <text> — proposal: <proposal> — answer: <answer>
```

then report-level `## Questions` (if any) and, for events, `## Dropped attachments` (one `- ` line each, if any).

- [ ] **Step 1: Write the failing tests** — `render.test.ts`: `renders a sheet report oldest first`,
      `renders a week across New Year as 28. 12. 2026–3. 1. 2027`, `renders a two-week period as 21. 12. 2026–3. 1.
2027`, `keeps Czech prose with quotes, backslashes and line breaks as written` (summary `„Mše" \\ v 8:00\nřádek 2`
      appears verbatim), `renders questions with status, proposal and answer`, `renders events with venues, report-level
questions and dropped attachments`. `body.test.ts`: drop the `splitPullBody`/marker expectations; the footer and
      Události block stay.
- [ ] **Step 2: Run** `pnpm exec vitest run --project scripts scripts/lib/content-pr/render.test.ts
scripts/lib/content-pr/body.test.ts` — FAIL
- [ ] **Step 3: Implement** `renderReport`; remove the marker from `pullBody`.
- [ ] **Step 4: Run** the same command — PASS
- [ ] **Step 5: Commit** `ci(content-pr): render the PR body from the JSON report`

### Task 4: Merging a sheet run into the PR's report

**Files:**

- Create: `scripts/lib/content-pr/merge.ts`, `scripts/lib/content-pr/merge.test.ts`

**Interfaces:**

- Consumes: Task 1 types and `parseSheetReport`.
- Produces: `mergeSheetReport(previous: SheetReport | undefined, run: SheetRunReport): SheetReport` — throws `Error`
  on an unknown update id or a new question id already in `previous`.

Algorithm (spec § Merging): start from `previous` (or an empty v1 sheet report); drop weeks whose outcome is `refused`
or `document-error`; replace the week with `run.week.validFrom` or insert it, keeping weeks sorted by `validFrom`;
append `run.questions` to the report-level questions; apply each `questionUpdates` entry by id to any question outside
`run.week` (set `status`, set `answer` when given); finally `parseSheetReport` the result.

- [ ] **Step 1: Write the failing tests** — `starts a report from the first run`, `replaces the handled week and keeps
the others in date order`, `drops previous refused and document-error weeks`, `resolves a question of another week
by id`, `fails on an update of an unknown id`, `fails when a new question reuses an id of the previous report`.
- [ ] **Step 2: Run** `pnpm exec vitest run --project scripts scripts/lib/content-pr/merge.test.ts` — FAIL
- [ ] **Step 3: Implement** `mergeSheetReport`.
- [ ] **Step 4: Run** — PASS
- [ ] **Step 5: Commit** `ci(content-pr): merge a sheet run into the PR's report`

### Task 5: Facts against git, and the messages

**Files:**

- Modify: `scripts/lib/content-pr/changes.ts`, `scripts/lib/content-pr/changes.test.ts`
- Modify: `scripts/lib/content-pr/weeks.ts` (delete `parseWeekHeading` and its imports), `weeks.test.ts`

**Interfaces:**

- Consumes: Task 1 types, `formatWeeks`, `git` (`../git`).
- Produces:
  - `type ContentChanges = { kind: "sheet"; added: Week[]; changed: Week[] } | { kind: "events"; added: NewsRecord[];
changed: NewsRecord[] }` (`NewsRecord = { id: string; title: string }`)
  - `contentChanges(cwd: string, kind: Kind, base: string): ContentChanges` — `base` is any commit-ish; compares
    `git show <base>:<path>` with the working tree (new files included)
  - `mergeBase(cwd: string, ref: string): string` — `git merge-base HEAD <ref>`
  - `changesProblem(report: Report, changes: ContentChanges): string | undefined` — message
    `The report does not match the change (<problem>): not applied.`
  - `commitMessage(report: Report, changes: ContentChanges): string | undefined`
  - `fixCommitMessage(changes: ContentChanges): string | undefined` (changes of the fix alone, against `HEAD`)

Rules (spec § Publishing 3–4), `changes` being the whole PR against the merge base:

- sheet: each added or changed week has an entry `created`/`corrected` with equal `validFrom` and `validTo`; each
  `created`/`corrected` entry is added or changed; no `refused`/`document-error` entry is.
- events: the added records' ids equal the `created` events' ids as sets; each such event's `title` equals its
  record's `title` exactly.
- `commitMessage`: sheet `feat(content): publish the service sheet(s) for <formatWeeks(created+corrected entries)>`
  when `changes.added` is non-empty, else `fix(content): correct the service sheet(s) for …`; events `feat(content):
add the <title> event` / `feat(content): add <n> events`; `undefined` when nothing is published.
- `fixCommitMessage`: sheet `fix(content): correct the service sheet(s) for <formatWeeks(added+changed)>`; events
  `fix(content): correct the <title> event` / `fix(content): correct <n> events`; `undefined` without changes.

- [ ] **Step 1: Write the failing tests** — in `changes.test.ts` replace the heading-based cases: `lists the weeks the
PR adds and changes against a base commit`, `lists events added and changed against a base, in new month files
too`, `accepts a report whose created and corrected weeks are exactly the PR's`, `refuses a week the PR adds that the
report gives as refused`, `refuses a created week the PR does not hold`, `refuses an event whose title differs from
its record` (a renamed event: report title `Hody`, record `Hody 2026`), `names a feat for an added week and a fix for
corrections only`, `names a week across New Year` (`publish the service sheet for 28. 12. 2026–3. 1. 2027`),
      `names a fix commit from the fix's own changes`. Delete the `parseWeekHeading` tests in `weeks.test.ts`.
- [ ] **Step 2: Run** `pnpm exec vitest run --project scripts scripts/lib/content-pr/changes.test.ts
scripts/lib/content-pr/weeks.test.ts` — FAIL
- [ ] **Step 3: Implement** the new `changes.ts`; remove `parseWeekHeading`.
- [ ] **Step 4: Run** — PASS
- [ ] **Step 5: Commit** `ci(content-pr): check the JSON report's facts against the whole PR`

### Task 6: Finding the PR's stored report

**Files:**

- Create: `scripts/lib/content-pr/stored.ts`, `scripts/lib/content-pr/stored.test.ts`

**Interfaces:**

- Consumes: `GitHubReader`, `Artifact` (`../content-release/sources`).
- Produces:
  - `reportArtifactName(sha: string): string` → `content-report-<sha>`
  - `storedReportOf(pr: number, github: GitHubReader): Promise<{ name: string; runId: number } | undefined>` — the
    PR's commits newest first; the first with a trusted, unexpired artifact of its name; among several, the highest
    `runId`

- [ ] **Step 1: Write the failing tests** (fake `GitHubReader`) — `takes the head's report`, `takes the newest run's
report when a fix run uploaded it again for the same head`, `falls back to the newest earlier commit when the head
was pushed by hand`, `ignores untrusted and expired artifacts`, `gives none without any`.
- [ ] **Step 2: Run** `pnpm exec vitest run --project scripts scripts/lib/content-pr/stored.test.ts` — FAIL
- [ ] **Step 3: Implement** `stored.ts`.
- [ ] **Step 4: Run** — PASS
- [ ] **Step 5: Commit** `ci(content-pr): find the PR's stored report artifact`

### Task 7: The `content-pr` command

**Files:**

- Modify: `scripts/lib/content-pr/command.ts`, `scripts/lib/content-pr/command.test.ts`, `scripts/content-pr.ts`
  (header: usage and options)

**Interfaces:**

- Consumes: Tasks 1–6, `applyContentPatch`/`hasChange` (`patch.ts`), `pullBody`, `gitHubReader`, `requiredEnv`.
- Produces the command line (the workflows in Task 9 use exactly these):

```
pnpm content-pr check --kind <sheet|events> [--run] [--previous <report.json>] [--fix <fix.json>] <report.json>
pnpm content-pr stored --pr <n>                       (prints "<runId> <name>" or nothing; GH_TOKEN, GITHUB_REPOSITORY)
pnpm content-pr apply --kind <k> --base <ref> --out <dir> [--run] [--previous <report.json>] [--fix <fix.json>]
                      <report.json> <content.patch>
pnpm content-pr body --kind <k> --run-url <url> [--calendar <file>] [--fix] <report.json>
pnpm content-pr summary --kind <k> <report.json>
```

- `check`: parses as `apply` would (with `--run`: `parseSheetRunReport`, then `mergeSheetReport` against
  `--previous` when given; else `parseReport`; `--fix`: `parseFixResult`), prints `The report is valid.`; on failure
  throws with the issues (exit 1). No git.
- `apply` (spec § Publishing): read the previous report (missing or invalid → the Global Constraints' "close and
  resend" error) and the report as `check` does → `final`; `changed = hasChange(patch)`; with `--fix` the result's
  `outcome` must agree with `changed`; if changed: `fixChanges = …` is computed after `applyContentPatch` against
  `HEAD`; then `changesProblem(final, contentChanges(cwd, kind, mergeBase(cwd, base)))` — on a problem reverse the
  patch (if applied) and throw; write `<out>/report.json` (`final`, 2-space JSON); print
  `{ changed, draft: isDraft(final), message, fix? }` where `message` = first of `commitMessage(final, …)` and the
  kind's default that `io.lint` accepts, and `fix` (with `--fix` and a change) = first of `fixMessage`,
  `fixCommitMessage(fixChanges)`, the fix default that `io.lint` accepts. Warn (`::warning::`) on each fallback and,
  as now, nothing about `blocking:` (it no longer exists).
- `summary`: reads a full report, else a sheet run report as `mergeSheetReport(undefined, run)` (the agent's file when
  `apply` failed), else `undefined` (missing or invalid; the summary still renders). Test: `summarizes the agent's
run report when apply failed` (its refused week appears under "Weeks not published").
- `patch` action is removed (the fix workflow uses `apply`).

- [ ] **Step 1: Write the failing tests** in `command.test.ts` (temp git repo with a `main` branch and a PR branch,
      as `repoWithPatch` does today): `parses each action`, `checks a run report against the previous one`, `applies a
sheet run, merges it and names the commit`, `makes a draft of an open blocking question`, `fails with "close and
resend" on a previous report of another version`, `undoes a change the report does not give`, `accepts a fix that
only answers a question (no patch) and keeps the PR's facts`, `refuses a fix whose outcome disagrees with the
patch`, `falls back to the default messages when commitlint refuses`, `renders the body from report.json`,
      `summarizes without a report`.
- [ ] **Step 2: Run** `pnpm exec vitest run --project scripts scripts/lib/content-pr/command.test.ts` — FAIL
- [ ] **Step 3: Implement** the actions; update `scripts/content-pr.ts`'s header.
- [ ] **Step 4: Run** `pnpm exec vitest run --project scripts scripts/lib/content-pr` and `pnpm exec tsc --noEmit` —
      PASS (except `commitlintAccepts` on Windows)
- [ ] **Step 5: Commit** `ci(content-pr): check, apply and render the JSON reports`

### Task 8: Remove the Markdown report from `content-fix`

**Files:**

- Delete: `scripts/lib/content-fix/report.ts`, `report.test.ts`, `body.ts`, `body.test.ts`
- Modify: `scripts/lib/content-fix/command.ts` (drop the `report` action and `fixInput` from `next`),
  `command.test.ts`, `scripts/content-fix.ts` (header)

**Interfaces:**

- Consumes: nothing new. `next` no longer writes `report.md` (the workflow downloads the stored report, Task 9).

- [ ] **Step 1: Update the tests** — `next` writes only `comment.md`; `parseCommand(["report", …])` throws `Usage:`.
- [ ] **Step 2: Run** `pnpm exec vitest run --project scripts scripts/lib/content-fix` — FAIL
- [ ] **Step 3: Implement** the removals.
- [ ] **Step 4: Run** the same command and `pnpm exec tsc --noEmit` — PASS
- [ ] **Step 5: Commit** `ci(content-fix): drop the Markdown report`

### Task 9: Workflows and the content-PR action

**Files:**

- Modify: `.github/actions/content-pr/action.yml`, `.github/workflows/service-sheet.yml`, `.github/workflows/events.yml`,
  `.github/workflows/content-fix-run.yml`

**Interfaces:**

- Consumes: Task 7's command lines; `reportArtifactName` naming.

Changes:

- `content-pr/action.yml`: new required input `report-file`; an `actions/upload-artifact` step (same pinned SHA as the
  uploads step) named `content-report-${{ steps.commit.outputs.sha }}`, `retention-days: 30`, right after the uploads
  step, before the push.
- `service-sheet.yml` `sheet` job: `permissions: actions: read`; in "Check out the sheet branch", for an open PR replace
  `gh pr view … body` with `pnpm --silent content-pr stored --pr "$pr"` → `gh run download "$id" -n "$name" -D …` →
  copy `report.json` to `$RUNNER_TEMP/run/previous-report.json` (clean) and `$RUNNER_TEMP/sheet/previous-report.json`
  (the agent's); no artifact for an open PR → fail with the "close and resend" message. Prompt: the report file is
  `report.json`, the previous report `previous-report.json`, and "run `pnpm content-pr check --kind sheet --run
[--previous …] <file>` until it passes"; `commands:` adds `pnpm content-pr check:*`. "Collect the outcome" copies
  `report.json`. `publish`: checkout with `fetch-depth: 0`; `apply --kind sheet --run --base origin/main --out
"$RUNNER_TEMP/out" [--previous "$run/previous-report.json"] "$run/report.json" "$run/content.patch"`; `body` and
  `summary` read `$RUNNER_TEMP/out/report.json` (summary falls back to the agent's when `apply` failed); the action gets
  `report-file: $RUNNER_TEMP/out/report.json`.
- `events.yml`: the same without `--run`/`--previous` and without reading a stored report.
- `content-fix-run.yml` `fix` job: `permissions: actions: read`; after "Read the PR", download the stored report to
  `$RUNNER_TEMP/fix/report.json` (missing → reply with the "close and resend" message); prompt: correct
  `report.json` in place, write `fix.json`, run `pnpm content-pr check --kind <k> --fix <fix.json> <report.json>`;
  commands add `pnpm content-pr check:*`; collect `report.json` and `fix.json`; the `title=` output from `report.md`
  goes. `publish`: checkout `fetch-depth: 0` and `git fetch origin main`; "Apply the change" becomes `pnpm --silent
content-pr apply --kind "$KIND" --fix "$run/fix.json" --base origin/main --out "$out" "$run/report.json" "$patch"`
  (outputs `changed`, `draft` as `blocking`, `fix`, `message` as `title`) followed by the existing `check-ids` for
  events; upload `content-report-<new sha>` before the push when a commit was made, else `content-report-<head sha>`
  after "Update the PR"; the reply uses `fix.json`'s `reply`.
- Update each workflow's header comment where it describes the report.

- [ ] **Step 1: Edit** the four files as above.
- [ ] **Step 2: Verify** `pnpm exec vitest run --project scripts scripts/lib/uploads-path.test.ts` — PASS (it reads
      the workflows' env), and read each changed `run:` block against Task 7's usage lines.
- [ ] **Step 3: Commit** `ci: keep the JSON content reports as per-commit artifacts`

### Task 10: Skills and docs

**Files:**

- Modify: `.claude/skills/parish-create-service-sheet/unattended.md` ("The report" and the run rules),
  `.claude/skills/parish-create-event/unattended.md` ("The report"), `.claude/content-pr/comment-run.md`,
  `docs/content-pipelines.md` (report descriptions, §§ service sheet, events, comment fixes),
  `docs/github-setup.md` (checks on content PRs)

Each skill section gets: the file name, a JSON example of its report kind with every field (the schema module named as
the source), the rule "run `pnpm content-pr check …` until it passes", the sheet run's `week` + `questionUpdates` +
read-only `previous-report.json`, the fix run's full `report.json` + `fix.json`, and the privacy rule applying to every
field. Remove `blocking:`/`commit:`/`fix:` lines, `## Reply`, heading formats and status-in-parentheses wording.

- [ ] **Step 1: Edit** the five files.
- [ ] **Step 2: Verify** `pnpm exec vitest run --project scripts scripts/lib/skill-quotes.test.ts` — PASS, and
      `pnpm exec prettier --check .claude docs`.
- [ ] **Step 3: Commit** `docs(skills): describe the JSON content reports`

### Task 11: Final check

- [ ] **Step 1:** `pnpm format && pnpm test:scripts && pnpm lint && pnpm exec tsc --noEmit` — all pass (except
      `commitlintAccepts` on Windows).
- [ ] **Step 2:** `rg -n "report-end|parseMailReport|parseFixReport|fixInput|outcomeOf|questionOf|parseWeekHeading"
scripts .github .claude docs --glob '!docs/superpowers/**'` — no matches.
- [ ] **Step 3:** Report to the maintainer: push only with no content PR open; the first live runs to watch are one
      sheet mail, one events mail and one `/fix` comment.
