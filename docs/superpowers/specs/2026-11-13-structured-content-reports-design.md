# Structured content PR reports: design

Status: draft. The reports of the service sheet, events and comment fix runs become JSON checked by a zod schema,
kept between runs as per-commit artifacts; the PR body, the job summary, the draft state and the commit messages are
rendered from it. Date: 2026-11-13.

## Intent

The mail pipelines (`service-sheet.yml`, `events.yml`) and the comment fix runs (`content-fix-run.yml`) let the agent
write a Markdown report that the scripts then interpret with regular expressions: `blocking:`/`commit:` header lines,
`## <week>` headings in Czech, `Outcome:` lines with tolerated list markers and bold, question lines whose status is
read from their parentheses. Commit `394e3d2` made the scripts check that report against the change and derive the
commit message, but the input is still free text a model wrote by hand, and the sheet report's history still lives in
the PR body, which each run reads back and the agent copies forward section by section.

The maintainer wants the report to be data: a format the agent cannot get subtly wrong, because it is checked against
a schema while the agent is still running, and that the scripts can rely on without guessing. The PR body becomes
output only.

## Goals

- The agent writes the report as JSON; a zod schema defines it; the agent runs `pnpm content-pr check` on it until it
  passes, so a malformed report is fixed within the run, not retried on the next mail.
- `publish` parses the same schema again and checks the facts the report states (the weeks and their outcomes, the
  events and their ids) against the change in git, exactly (ISO dates, record ids), not by matching headings.
- The script derives what the agent used to state: the draft state (from the open blocking questions) and the PR
  title / commit message (from the items). The agent's own message survives only as the fix run's `fixMessage`.
- The report is kept between runs as an artifact per commit, `content-report-<sha>`, for 30 days, like the staged files
  (`content-uploads-<sha>`). The next mail run and every fix run read it from there.
- The sheet PR's report is merged by the script, not by the agent: the previous report's weeks are kept, the week this
  run handled replaces its entry, previous `refused`/`document-error` entries are dropped (the follow-up #4 of the
  previous change).
- The PR body, the job summary and the comment reply are rendered from the JSON. Nothing ever parses the PR body.

## Non-goals

- No change to what the agent decides (grouping, duplicates, venues, corrections) or to the content files, the staged
  files, the release or the calendar sync.
- No structured output from the model API: the agent writes a file with its file tools, as now.
- Local (non-CI) skill runs are untouched: they write no report.
- No fallback for the old Markdown reports (see Transition).

## Anti-goals

- A report the schema accepts but whose facts contradict the change must still fail (the check of `394e3d2` stays,
  made exact).
- Nothing new becomes public: the JSON holds what the PR body shows today (published content, the agent's summaries,
  the questions), never the mail's or the DOCX's text, names from intentions, or attachment file names. The skills'
  privacy rules apply to every field. (The repo is public; its artifacts are readable like its PRs.)
- No step holding a secret runs code from the agent's workspace (unchanged rule): the agent's `check` runs in the
  agent's job; `publish` validates again from a fresh checkout.

## Constraints

- Static site, GitHub Actions only; the scripts follow `.claude/rules/structure.md` (entry points in `scripts/`,
  logic in `scripts/lib/`, `parseCommand`/`execute`, tests beside each module, no re-exports).
- zod 4 (`^4.6.7`) is already a dependency (`venueFileSchema`). Check its docs (context7) before using
  `z.toJSONSchema` or other APIs.
- Artifacts: `trusted` in `scripts/lib/content-release/sources.ts` (a run on this repo's `main`) applies to report
  artifacts too; the mail and fix workflows are `workflow_dispatch` runs on `main`.
- A fix run that changes nothing (an answer, a refusal) makes no commit but changes the report.
- Commits pushed by hand to a PR branch have no report artifact.

## Approaches

1. **The agent writes the whole `report.json`, checks it with `pnpm content-pr check`, and `publish` re-validates and
   compares the facts with git.** One writer; the schema catches the shape, git catches the facts. The agent still
   copies outcomes from the stage scripts' output, but a wrong copy fails loudly in the run. **Chosen by the
   maintainer.**
2. The stage and replace scripts write the facts into the report (`--report <file>`), the agent adds prose and
   questions. Removes copying, but five scripts gain a CI-only option and several outcomes (a document error from
   `sheet draft`, a refused correction or duplicate, dropped attachments) arise outside them, so the agent stays a
   second writer.
3. The agent builds the report only through `pnpm report …` commands. Strongest guarantee, but many commands and
   multi-line Czech prose as arguments; too heavy for reports this small.

Persistence was chosen separately (the maintainer): per-commit artifacts over a hidden JSON comment in the PR body, a
file committed on the branch (it would reach `main` with the squash merge) or a custom git ref (invisible, needs
cleanup). The maintainer confirmed the PR description is never edited by hand, so rendering it is safe, and that
content PRs are merged within a week, so 30 days of retention is plenty.

## Design

### The schema (`scripts/lib/content-pr/report-schema.ts`)

One module defines the report of each kind; the types are inferred from it (`z.infer`).

- **Version**: every report has `version: 1`. A reader that meets another version fails with the "close and resend"
  message (see Reading the report back), so a schema change while a PR is open is caught, not misread. (My call.)
- **Question** (both kinds): `id` (`q<n>`), `blocking` (boolean), `status` (`open` | `resolved`), `where`, `text`,
  `proposal` (optional), `answer` (optional; a fix run's answer). Ids are unique across the whole report (and, for a
  sheet PR, across the merged PR report), so a question can be addressed by id alone.
- **Report-level questions** (both kinds): a top-level `questions[]` for what belongs to no week or event (an unclear
  grouping of attachments, a dropped attachment, a mail where every event was refused); today's events report allows
  a `## Questions` section outside any event. The draft rule counts them like the others. (My call.)
- **Sheet report**: `kind: "sheet"`, `weeks[]`, each with `validFrom`, `validTo` (ISO dates), `outcome` (a
  discriminated union: `created`, `corrected`, `refused` with `reason`, `document-error` with `reason`), `summary`
  (Markdown: the announcements with categories, each `newsId` with its event's title and date), `notOnTheNewest`
  (optional; the stage script's "not the DOCX's newest week" note), `senderNote` (optional, one string per thing the
  note asks to check and whether the draft agrees), `questions[]`.
- **Events report**: `kind: "events"`, `events[]`, each with `title`, `outcome` (`created` with `id`, `refused` with
  `reason`), `origin` (optional Markdown: where the title came from, the guesses; only for created events), `venues[]`
  (optional: `{ kind: "new", id, name, address, pin }` or `{ kind: "alias", id, text }`), `questions[]`;
  `droppedAttachments[]` (descriptions such as "attachment 3, an image without event information").
- **Fix result** (comment runs only, written beside the report): `outcome` (`changed` | `unchanged`), `fixMessage`
  (`fix(content): …`), `reply` (Markdown, a few lines).
- Neither `blocking` nor `commit` is in the schema: both are derived.

### The agent's side

- The skills' "Unattended run" and "Comment run" sections describe the JSON instead of the Markdown, and say: write
  `report.json` (the prompt names it), run `pnpm content-pr check --kind <kind> <file>` (and `--fix <file>` in a
  comment run) until it passes, then stop. The workflows add `pnpm content-pr check:*` to the agent's commands.
- `check` prints each zod issue as `<path>: <message>` (e.g. `weeks.1.validTo: expected an ISO date`) and exits 1.
  It checks the shape and what needs no git: unique question ids, ISO dates in order, no week twice.
- The skills get the schema's shape from a generated JSON Schema or a short field list in the skill (the builder's
  call; the schema module is the source of truth either way).
- A sheet mail run's prompt gives the previous report as `previous-report.json` (when the PR has one), **read-only
  input**: the agent writes a report holding only the week it handled, plus `questionUpdates[]` (`id`, `status`,
  optional `answer`) for questions of other weeks or of the report level it settles, with new questions numbered after
  the highest id there. `check` takes `--previous <file>` to check those ids exist. (My call: the agent never edits the
  PR's history.)
- A comment (fix) run gets the PR's full report as `report.json` and returns the **full report**, corrected, plus the
  fix result: a comment may touch any week or event the PR holds, so the fix run replaces the report rather than
  merging it, for both kinds. (My call.)

### Publishing (`pnpm content-pr apply`, `content-fix` publish)

1. Parse the report with the schema (a failure leaves the mail unread, as now).
2. Apply the patch (unchanged guard: only the kind's files).
3. Compare the facts with git, **the whole PR against its merge base with `main`** (after the patch is applied), with
   the full report (merged for a sheet mail run, as returned for a fix run). One rule for every run, so a fix run is
   checked as strictly as a mail run, and a fix that renames an event shows up. (My call; the jobs fetch enough
   history for `git merge-base`.)
   - Sheets: every week the PR adds or changes against `main` has an entry `created` or `corrected` (a week staged
     earlier in the same PR and sent again is `corrected` although `main` lacks it); no `refused` or `document-error`
     week is in the diff.
   - Events: the records the PR adds against `main` are exactly the `created` events, by `id`, and each `title`
     equals its record's `title`.
   - On a mismatch the patch is undone and the run fails (as in `394e3d2`).
4. Derive: draft = any open blocking question (a fix run may turn a ready PR back into a draft, never the reverse, as
   today); PR title = `commitMessage` from the same git comparison and the report: sheets `publish the service
sheet(s) for …` (`feat`) when the PR adds a week to `main`, else `correct …` (`fix`), with `formatWeeks`; events
   `add the <title> event` / `add <n> events`; the kind's default when commitlint refuses it. A fix commit's message
   is the fix result's `fixMessage`, falling back to a derived `fix(content): correct …` naming the items the fix's
   patch changed.
5. Render the PR body, the job summary and (fix runs) the reply from the JSON.
6. Upload the merged report as `content-report-<sha>` (30 days) before the push, beside `content-uploads-<sha>`, in
   `.github/actions/content-pr` and in `content-fix-run.yml`'s publish job.

### Merging the sheet report

The sheet PR's report covers the whole PR. The script merges, the agent no longer copies:

- Start from a **clean copy** of the previous report that the `sheet` job saves into `$RUNNER_TEMP/run` (outside the
  agent's reach) right after the trusted lookup; never from the agent's scratch folder.
- Replace the entry of the week this run's report gives (matched by `validFrom`), or add it; drop previous `refused`
  and `document-error` entries (those weeks are not in the PR). The replaced entry's questions are the ones the agent
  wrote for it.
- Apply `questionUpdates[]` by id to the other weeks' and the report-level questions; an unknown id fails the run.
- Fix runs do not merge (they return the full report, see "The agent's side"); an events mail run has no previous
  report (one PR per mail).

### Reading the report back

- `content-report-<sha>` is looked up for the PR's head; when the head has none (a commit pushed by hand), the newest
  of the PR's commits that has one (`commitsOfPull`, newest first). Several artifacts of the same name (a fix run that
  changed nothing uploads the report again for the same head) resolve to the newest run, as `artifactsOfPull` already
  does for uploads. Only `trusted` artifacts count.
- The mail sheet run reads it in its `sheet` job (it needs `actions: read`) and hands it to the agent as
  `previous-report.json`, and to `publish` through the run artifact for the merge.
- The fix run reads it in `fix` (`pnpm content-fix next`, which already downloads the PR's uploads) instead of
  `fixInput` from the PR body, and hands it to the agent as `report.json` and to `publish`.
- A PR whose report cannot be found or has another `version` (expired, a PR from before this change, or a schema
  change while it was open) fails the run with a message saying to close the PR and send the sheet or event again.
- The report is read with `main`'s code (the fix job's `next` step, the sheet job) but checked by `check` and
  `publish` with the PR head's code; `version` keeps the two from disagreeing silently.

### Rendering

- **PR body**: per week (`## 19.–25. 10. 2026` via `formatWeeks`, oldest first) or event (`## <title>`), the
  `Outcome:` line, the prose, `### Sender's note`, `### Questions` (`- **q1** (blocking, open) <where>: <text> —
proposal: <proposal>`); for events `## Dropped attachments`; then, as today, the Události block (events) and the
  footer. No `<!-- report-end -->` marker: nothing splits the body any more.
- **Job summary** (`content-pr summary`): the outcome lines from the JSON, as `outcomeLines` gives them today.
- **Reply** (fix runs): the fix result's `reply` with the existing marker.

### What goes away

`outcomeOf`, `questionOf`, `splitHeader`/`parseMailReport` and the Markdown `checkReport` (content-pr);
`parseFixReport`, `splitPullBody`, `fixInput` and `REPORT_END` (content-fix); `parseWeekHeading` (weeks are ISO dates
now; `formatWeeks` stays). The `blocking:`/`commit:`/`fix:` header lines and the `## Reply` section disappear from the
skills and `.claude/content-pr/comment-run.md`.

## Transition

My call: no fallback for Markdown reports. Deploy when no content PR is open (they are merged within a week); a run on
an older PR fails with the "close and resend" message above. The docs that describe the report
(`docs/content-pipelines.md`, `docs/github-setup.md`, the workflow headers) are updated with the change.

## Left to the builder

- Module boundaries within `scripts/lib/content-pr/` and `content-fix/` (schema, render, merge, changes), and whether
  `check` is an action of `content-pr` or its own command.
- How the skills show the schema (generated JSON Schema file vs. a field list), as long as the schema module stays the
  one source.
- Exact wording of rendered Markdown, beyond keeping today's sections and order.
- Test fixtures and how the artifact lookup is faked in tests (`GitHubReader` is injectable).
