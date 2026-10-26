# Content PR comment fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `@claude` comment in the conversation of an open `service-sheet/*` or `events/*` PR makes Claude correct
the PR on its branch; `check.yml` becomes the only test and build of a content PR.

**Architecture:** A small `content-fix.yml` reacts to each matching comment and dispatches `content-fix-run.yml` on
`main` (so its artifacts are trusted). That run, serialised per PR, takes the PR's oldest unanswered comment, runs
Claude on it in a `fix` job (no App key), and commits, uploads, updates the PR and replies in a `publish` job (no
id-token), then dispatches itself again while unanswered comments remain. The logic lives in a new `pnpm content-fix`
command; the skills get a "Comment run" section.

**Tech Stack:** GitHub Actions, `anthropics/claude-code-action` (workload identity federation), TypeScript scripts run
with `tsx`, vitest, `gh`.

**Spec:** `docs/superpowers/specs/2026-10-26-content-pr-comment-fixes-design.md`

## Global Constraints

- English everywhere except content values and the parish's terms (`docs/conventions.md`); Conventional Commits via the
  `commit` skill, never `--no-verify`.
- Scripts: one entry point per `pnpm` command in `scripts/`, a `runCommand()` call with a header documenting it; logic
  and tests in `scripts/lib/<group>/` (`.claude/rules/structure.md`). Helpers used by 2+ scripts go to a shared module.
- Actions pinned by commit SHA with the version in a comment, as the other workflows pin them; `ubuntu-24.04`.
- Model `claude-opus-5-5`, as `events.yml` and `service-sheet.yml` pass it.
- Environment `content-fix`; federation rule subject `repo:oplaner4@38047115/farakurim@1403139652:environment:content-fix`.
- Concurrency group `content-fix-<PR number>`, `cancel-in-progress: false`.
- Reply marker `<!-- content-fix: <comment id> -->`; report end marker `<!-- report-end -->`.
- Comment filter: contains `@claude`; `author_association` `OWNER`, `MEMBER` or `COLLABORATOR`; author not a bot;
  author's repo permission `admin`, `maintain` or `write`.
- Fix report header: line 1 `blocking: yes|no`, line 2 `commit: <message>`, line 3 `fix: <message>`; last section
  `## Reply`, its first line `Outcome: changed` or `Outcome: unchanged`.
- Patch guards: sheets `^src/content/[^/]+\.json$`, events `^src/content/news/[0-9]{4}/[0-9]{2}\.json$`, no symlink.
- Never quote the comment, mail text or file content in logs or summaries; the reply and the PR body carry only the
  report.
- Script-only tasks finish with `pnpm format && pnpm test:scripts && pnpm lint && pnpm exec tsc --noEmit`; workflow,
  skill and doc changes are docs-only for `check.yml`, so they take `pnpm format` and `pnpm test:scripts` (the
  workflow copy tests).

## Review Focus

- **A PR merged or closed while its run waited:** `next` reports `open: false`; the run changes nothing and posts no
  reply (Task 3 test "reports a closed PR as not open").
- **A comment from a read-only collaborator** (`COLLABORATOR` association, `read` permission): never treated as a
  request, no reply, no run (Task 3 test "skips a commenter without write access").
- **A PR body written before this change** (no `<!-- report-end -->`): the report still splits at `## Události` or
  the footer (Task 2 test "falls back to the Události section or the footer").
- **A Claude report missing `## Reply` or with a non-empty patch and `Outcome: unchanged`:** the run fails, replies
  with the failure and the marker, so the comment is answered once (Task 2 test "refuses a report without its reply";
  Task 5 apply step).
- **The bot's own reply containing `@claude`:** never a request (Task 2 test "ignores bots and answered comments").

---

### Task 1: Restore the content when a content command fails

A stage or add script writes `src/content/` (and copies staged files) before running its tests; a failing test now
leaves nothing behind (spec § Checks, "One gap").

**Files:**

- Modify: `scripts/lib/content-files.ts` (add `contentRestorePoint`, `withContentRestore`)
- Test: `scripts/lib/content-files.test.ts`
- Modify (wrap `execute`): `scripts/stage.ts`, `scripts/add-event.ts`, `scripts/replace-event.ts`,
  `scripts/pin-event.ts`, `scripts/event-poster.ts`, `scripts/add-exception.ts`, `scripts/add-album.ts`; each
  header gains one line: "A failure restores src/content/ and removes the files it staged."

**Interfaces:**

- Produces: `contentRestorePoint(contentDir: string, uploadsDir: string): () => void` (snapshots every file's
  content under `contentDir` and the file list under `uploadsDir`; the returned function rewrites changed or deleted
  content files, deletes new ones in either folder, and leaves older uploads alone);
  `withContentRestore<T>(run: (command: T) => unknown, dirs = { content: join(ROOT, "src/content"), uploads: join(ROOT, UPLOADS_DIR) }): (command: T) => Promise<void>`
  (takes the restore point, runs, restores and rethrows on a throw).

- [ ] **Step 1: Write the failing tests** in `content-files.test.ts`, on a `freshTempDir` with `content/news/2026/10.json`
      and `uploads/aktuality/a.pdf`:
  - `it("restores changed and deleted content files and removes new ones")`: after the restore point, change
    `10.json`, delete another file, add `2026/11.json`; calling restore gives back the exact old contents and no
    `11.json`.
  - `it("removes the files staged after the restore point, keeping the older ones")`: add `uploads/aktuality/b.pdf`;
    after restore `a.pdf` exists, `b.pdf` does not.
  - `it("restores and rethrows when the command throws, and keeps the change when it succeeds")`: a wrapped run that
    writes `11.json` then throws `Error("tests failed")` rejects with that message and leaves no `11.json`; one that
    writes and returns keeps it.
- [ ] **Step 2:** `pnpm exec vitest run scripts/lib/content-files.test.ts`: FAIL (`contentRestorePoint` is not
      exported).
- [ ] **Step 3:** Implement both in `content-files.ts` with `readdirSync(dir, { recursive: true })`; a missing
      uploads folder is an empty list.
- [ ] **Step 4:** Run the test again: PASS.
- [ ] **Step 5:** Wrap each listed entry point:
      `runCommand("add-event", import.meta.url, parseCommand, withContentRestore(execute))`, and add the header line.
- [ ] **Step 6:** `pnpm format && pnpm test:scripts && pnpm lint && pnpm exec tsc --noEmit`: all pass.
- [ ] **Step 7:** Commit `fix(scripts): restore the content when a content command fails`.

### Task 2: Pure logic of the comment run

**Files:**

- Create: `scripts/lib/content-fix/comments.ts`, `scripts/lib/content-fix/body.ts`, `scripts/lib/content-fix/report.ts`
- Test: `comments.test.ts`, `body.test.ts`, `report.test.ts` beside them

**Interfaces:**

- Produces (`comments.ts`):
  - `type IssueComment = { id: number; body: string; createdAt: string; author: string; authorType: string; association: string }`
  - `replyMarker(commentId: number): string` → `<!-- content-fix: 123 -->`
  - `isFixRequest(comment: IssueComment): boolean` (contains `@claude`, association `OWNER|MEMBER|COLLABORATOR`,
    `authorType !== "Bot"`)
  - `unansweredRequests(comments: IssueComment[]): IssueComment[]` (requests with no `Bot` comment holding their
    marker, oldest first by `createdAt`, then `id`)
- Produces (`body.ts`):
  - `REPORT_END = "<!-- report-end -->"`
  - `splitPullBody(body: string): { report: string; rest: string }` (cut at the `REPORT_END` line; without it, at the
    first `## Události` line or a `---` line followed by a line starting `Opened by the`; else all is report; both
    trimmed)
  - `fixInput({ title, draft, body }: { title: string; draft: boolean; body: string }): string` →
    `blocking: yes|no\ncommit: <title>\n\n<report>\n` (`yes` when draft)
- Produces (`report.ts`):
  - `type FixReport = { blocking: boolean; commit: string; fix: string; changed: boolean; report: string; reply: string }`
  - `parseFixReport(text: string): FixReport` (throws naming the first missing piece: a header line, `## Reply`, its
    `Outcome:` line; `report` is the text between the header and `## Reply`, `reply` the section after its
    `Outcome:` line, both trimmed; a list marker or bold around `Outcome:` is tolerated, as `OUTCOME_SED` in the
    pipelines does)

- [ ] **Step 1: Write the failing tests:**
  - `comments.test.ts`: `it("takes requests from writers' associations, oldest first")` (three comments, one
    `CONTRIBUTOR`, one created earlier: returns `[earlier, other]` ids); `it("ignores bots and answered comments")`
    (a `Bot` comment containing `@claude` is no request; a request whose id appears in a `Bot` comment's
    `replyMarker` is dropped, a non-bot comment quoting the marker does not answer it).
  - `body.test.ts`: `it("splits at the report end marker")`; `it("falls back to the Události section or the footer")`
    (an events body with `## Události` and the footer, a sheet body with only the footer: `report` ends before them);
    `it("writes the fix input with the PR's draft state and title")` → exact string
    `"blocking: yes\ncommit: feat(content): add the Hody event\n\n## Hody\n"`.
  - `report.test.ts`: `it("reads the header, the report and the reply")` (a full report with `- **Outcome:** changed`
    gives `changed: true`, the three messages, `report` without `## Reply`); `it("refuses a report without its
reply")` and `it("refuses a report without the fix line")` (`toThrow(/## Reply/)`, `toThrow(/fix:/)`).
- [ ] **Step 2:** `pnpm exec vitest run scripts/lib/content-fix`: FAIL (modules missing).
- [ ] **Step 3:** Implement the three modules.
- [ ] **Step 4:** Run the tests: PASS.
- [ ] **Step 5:** Commit `feat(scripts): read comments, PR bodies and reports for comment fixes`.

### Task 3: `pnpm content-fix` and a shared GitHub client

**Files:**

- Create: `scripts/lib/github.ts` (shared REST client), `scripts/lib/content-fix/github.ts`,
  `scripts/lib/content-fix/command.ts`, `scripts/content-fix.ts`
- Modify: `scripts/lib/content-release/sources.ts` and `scripts/lib/news/known-events.ts` (use `gitHubGet`),
  `scripts/lib/content-release/plan.ts` (export `artifactsOfPull`)
- Test: `scripts/lib/github.test.ts`, `scripts/lib/content-fix/command.test.ts`; existing `sources.test.ts` and
  `known-events.test.ts` stay green unchanged

**Interfaces:**

- Consumes: Task 2's modules; `artifactsOfPull(pull: { number: number; kind: Kind }, github: GitHubReader)`;
  `applyArtifacts({ plan, from, uploads })`; `KINDS`.
- Produces:
  - `scripts/lib/github.ts`: `gitHubGet(repo: string, token: string, fetchImpl?: typeof fetch): <T>(path: string) => Promise<T>`
    (the headers `sources.ts` sends; throws `GitHub <path>: <status>`) and `gitHubText(...)` for a job log (follows
    the redirect, returns text).
  - `content-fix/github.ts`: `fixReader(repo, token, fetchImpl?)` with `pull(n)` →
    `{ open: boolean; head: string; branch: string; headRepo: string | null; title: string; draft: boolean; body: string }`,
    `comments(n)` → `IssueComment[]` (all pages of `per_page=100`), `permission(user)` → string,
    `failedCheck(sha)` → `{ step: string; log: string }[]` (the `check` check run of `sha`, when its conclusion is
    `failure`: each failed step's name and the last 150 lines of the job log; `[]` otherwise).
  - `pnpm content-fix` subcommands (the entry point's header documents them; all read `GITHUB_REPOSITORY`, `GH_TOKEN`
    except `report` and `apply`):
    - `next --pr <n> --out <dir>`: prints `{ open, kind, head, branch, comment, remaining }` (`kind` `sheet`,
      `events` or `null` for another branch or a fork; `comment` the oldest unanswered request's id or `null`;
      `remaining` the requests after it) and, when there is one, writes `<dir>/comment.md` and `<dir>/report.md`
      (`fixInput`). Requests whose author's permission is not `admin`, `maintain` or `write` are left out.
    - `artifacts --pr <n> --kind <kind>`: prints `<runId> <name>` per artifact, oldest first; an expired one throws
      `PR #<n> has an expired artifact: recreate the PR`.
    - `apply --pr <n> --kind <kind> <dir>`: copies the downloaded artifacts (each in `<dir>/<name>/`) into
      `uploads/` through `applyArtifacts` (a `release` plan holding this one PR), printing each path.
    - `check-log --sha <sha> --out <file>`: writes the failed steps as Markdown (`## <step>` and the log in a
      ` ```text ` block) when `check` failed, else writes nothing; prints `failed` or `ok`.
    - `report <report.md> --out <dir>`: writes `<dir>/body.md` (report, blank line, `REPORT_END`) and
      `<dir>/reply.md`, prints `{ blocking, commit, fix, changed }`.

- [ ] **Step 1: Write the failing tests** in `content-fix/command.test.ts` with a fake `fetch` answering by path (as
      `sources.test.ts` does):
  - `it("writes the oldest unanswered request and counts the rest")`: two requests, one answered → `comment` is the
    other's id, `remaining: 0`, `comment.md` holds only its body, `report.md` starts `blocking: no\ncommit: `.
  - `it("skips a commenter without write access")`: `permission` `read` → `comment: null`.
  - `it("reports a closed PR as not open")` and `it("gives no kind for a fork or another branch")`.
  - `it("lists the artifacts oldest first and refuses an expired one")`.
  - `it("writes the failed steps of a failed check, nothing for a passing one")`.
  - `it("writes the body with the report end marker and the reply")` for `report`.
  - `github.test.ts`: `it("sends the API headers and names the path of a failed request")`.
- [ ] **Step 2:** `pnpm exec vitest run scripts/lib/content-fix scripts/lib/github.test.ts`: FAIL.
- [ ] **Step 3:** Implement `scripts/lib/github.ts`, switch `sources.ts` and `known-events.ts` to it, export
      `artifactsOfPull`, then `content-fix/github.ts`, `content-fix/command.ts` (`parseCommand`, `execute`) and the
      entry point.
- [ ] **Step 4:** `pnpm format && pnpm test:scripts && pnpm lint && pnpm exec tsc --noEmit`: all pass.
- [ ] **Step 5:** Commit `feat(scripts): add pnpm content-fix for the comment fix workflow`.

### Task 4: The pipelines stop testing and building, and mark the report's end

**Files:**

- Modify: `.github/workflows/service-sheet.yml`, `.github/workflows/events.yml`
- Modify: `docs/deployment.md` (§ Service sheet by e-mail, § Events by e-mail, § GitHub setup)
- Modify: `docs/superpowers/specs/2026-10-16-service-sheet-email-pipeline-design.md` (§3 "Before the PR", §6),
  `docs/superpowers/specs/2026-10-22-events-email-pipeline-design.md` (the `@claude` non-goal, the test/build line)

- [ ] **Step 1:** In both `publish` jobs remove the `Test` and `Build` steps (keep the calendar key where
      `calendar-sync --problems` uses it); update the header comments that mention testing and building and "the mail
      stays unread" on a failed test.
- [ ] **Step 2:** In both "Apply the change" steps, after `tail -n +3 "$report"`, print a blank line and
      `<!-- report-end -->` before the Události section and the footer; add to the footer:
      "Comment `@claude …` in this conversation to correct it (`content-fix-run.yml`)."
- [ ] **Step 3:** Refuse a patch that creates or corrects nothing: in `events.yml` a non-empty patch without
      `Outcome: created` fails with `::error::The report creates nothing, but the change is not empty: not applied.`;
      in `service-sheet.yml` the same without `Outcome: (created|corrected)`.
- [ ] **Step 4:** `docs/deployment.md`: the pipelines no longer test or build before the PR (`check.yml` checks it);
      a failed check is fixed with `@claude` or a commit; under § GitHub setup a ruleset on `main` requiring the
      status check `check`, with the content App as a bypass actor. Point the two older specs to the new one.
- [ ] **Step 5:** `pnpm format && pnpm test:scripts`: pass (the workflow copy tests read these files).
- [ ] **Step 6:** Commit `ci: leave the content PR checks to check.yml and mark the report's end`.

### Task 5: "Comment run" sections in the correction skills

**Files:**

- Modify: `.claude/skills/parish-correct-event/SKILL.md`, `.claude/skills/parish-correct-service-sheet/SKILL.md`

Each skill gains `## Comment run` before `## Common mistakes`, holding the spec's rules, in the skill's style:

- Only when the prompt says it is a **comment run**: the input folder holds `comment.md` (the maintainer's
  instruction, the only request), `report.md` (the PR's report with its two header lines) and maybe `check.md` (a
  failed check). It never asks or waits.
- **Allowed:** correct an event the PR adds (events: text, date, time, place, programme, links, labels, which
  attachment is the poster, through steps 2 to 5 with `pnpm replace-event` and `pnpm event-poster`) or a week the PR
  holds (sheets: the record only, `pnpm stage sheet --from --to --record`, as there is no DOCX); answer a question;
  fix what `check.md` shows when the PR's content causes it.
- **Out of bounds**, answered without a change: a new event, dropping, pinning or splitting one, a file, an event or
  week the PR does not hold, a check failure outside the content (say so), anything else. Say what to do instead
  (close the PR, push a commit, `parish-pin-event` after the merge, a local skill run).
- A fact no document has is made as asked; the reply says the site will then differ from the parish's document.
- **The report** is the input report updated: the header `blocking:`, `commit:` (the PR title, describing everything
  the PR holds), and a third line `fix: fix(content): <what this comment changed>`; the untouched sections kept as
  they are, the question ids kept, answered questions marked with their answer, `blocking:` from the questions still
  open; then `## Reply` with `Outcome: changed` or `Outcome: unchanged` and a few lines for the maintainer.
- Skip "Publish": no commit, no release.

- [ ] **Step 1:** Write both sections; the descriptions stay as they are (the prompt names the section).
- [ ] **Step 2:** `pnpm format`; re-read each section against the spec's "What a comment may do".
- [ ] **Step 3:** Commit `docs(skills): add a comment run to the correction skills`.

### Task 6: The workflows and their docs

**Files:**

- Create: `.github/workflows/content-fix.yml`, `.github/workflows/content-fix-run.yml`
- Modify: `docs/deployment.md` (new § "Fixing content PRs with comments" with its setup), `README.md` if it lists the
  workflows

**`content-fix.yml`** (name `Content fix comment`), `on: issue_comment: types: [created]`, one job `gate`:

- `if:` the issue is a PR, open, the comment contains `@claude`, its association is one of the three, its author not
  a bot. Permissions `actions: write`, `issues: write`, `pull-requests: read`.
- Reads the PR (`gh api repos/$GITHUB_REPOSITORY/pulls/<n>`): only a branch starting `service-sheet/` or `events/`
  from this repo continues. Adds the `eyes` reaction to the comment, then `gh workflow run content-fix-run.yml --ref
main -f pr=<n>`.

**`content-fix-run.yml`** (name `Content fix`), `on: workflow_dispatch` with inputs `pr` (required) and `chain`
(default `"1"`, at most 10); workflow-level `concurrency: { group: content-fix-${{ inputs.pr }}, cancel-in-progress: false }`;
`permissions: contents: read`. Header comment in the style of `events.yml` (what each job may do and why).

1. Job **`fix`** (environment `content-fix`; `contents: read`, `pull-requests: read`, `actions: read`,
   `checks: read`, `id-token: write`):
   - checkout `main`, pnpm, node, `pnpm install --frozen-lockfile`;
   - `pnpm --silent content-fix next --pr "$PR" --out "$RUNNER_TEMP/fix"` → outputs `open`, `kind`, `head`, `comment`,
     `remaining`; every later step runs only when `open == true`, `kind != null` and `comment` is set;
   - `git fetch origin "$HEAD" && git checkout --detach "$HEAD"`; `pnpm install --frozen-lockfile` again;
   - download the artifacts (`content-fix artifacts`, then `gh run download` per line into `$RUNNER_TEMP/artifacts`,
     then `content-fix apply`); snapshot `find uploads -type f -exec sha256sum {} +` into `$RUNNER_TEMP/run/uploads.sum`;
   - events: `pnpm --silent event-mail known --out "$RUNNER_TEMP/run/known.json"`;
   - `pnpm --silent content-fix check-log --sha "$HEAD" --out "$RUNNER_TEMP/fix/check.md"`;
   - poppler for events; Claude with the tool limits of `events.yml`, `--add-dir $RUNNER_TEMP/fix`, the stage and
     news scripts the skill uses (`pnpm stage event:*`, `pnpm stage sheet:*`, `pnpm replace-event:*`,
     `pnpm event-poster:*`), and the prompt:
     "A maintainer commented on this <kind> PR. Run <skill> as a comment run (its "Comment run" section). The input
     is $RUNNER_TEMP/fix (comment.md, report.md, check.md when present), the report file is
     $RUNNER_TEMP/fix/fix-report.md and the scratchpad is $RUNNER_TEMP/fix. Don't read README.md, docs/ or design/.";
   - collect into `$RUNNER_TEMP/run`: `fix-report.md`, the `src/content` patch (`git add --intent-to-add`, `git diff
--binary HEAD`), the files whose sum changed or that are new (`sha256sum -c` against the snapshot plus new
     paths) under `uploads/`, `pr`, `comment`, `kind`, `head`; upload `content-fix-<run id>` (1 day);
     `rm -rf "$RUNNER_TEMP/fix"` always.
2. Job **`publish`** (`needs: fix`, `if: always() && needs.fix.outputs.comment != ''`, environment `content-fix`,
   `contents: read`, no id-token):
   - download the run artifact; fresh checkout of `head`; pnpm install;
   - **apply**: `content-fix report` (a throw fails the job); the patch guard of its kind; `changed` must match the
     patch (non-empty ⇔ `changed: true`); `event-mail check-ids` for events; commitlint `fix` (default
     `fix(content): apply a comment correction`) and `commit` (default: the current title);
   - App token (`contents: write`, `pull-requests: write`); commit as the bot with `fix`, `git push origin
HEAD:<branch>` without force (rejected → reply "The PR changed meanwhile: write the comment again.");
   - upload the changed files as `content-uploads-<new sha>` (30 days) when there are any;
   - PR body: `body.md`, for events the Události lines as `events.yml` builds them, the footer; title from `commit`;
     `blocking: yes` on a ready PR → `gh pr ready --undo`;
   - **reply** (`if: always()`): `reply.md`, or on any failure "The fix failed: <run link>", always ending with the
     run link and the marker `<!-- content-fix: $COMMENT -->` (`replyMarker`'s format); posted with the App token (`gh api repos/.../issues/<n>/comments`).
3. Job **`next`** (`needs: [fix, publish]`, `if: always() && needs.fix.outputs.remaining > 0 && inputs.chain < 10`,
   `actions: write`): `gh workflow run content-fix-run.yml --ref main -f pr=$PR -f chain=$((CHAIN + 1))`.

- [ ] **Step 1:** Write both workflows.
- [ ] **Step 2:** `docs/deployment.md`: what comments may do (spec table), review comments ignored, text only, the
      pick-up reaction, the reply marker, the failure reply; setup: environment `content-fix` (deployment branches
      `main`, no reviewers, variable `ANTHROPIC_FEDERATION_RULE_ID`), the third Claude Console federation rule with the
      subject above; the `Check` ruleset (Task 4). Drop "comments with `@claude` come in phase 2".
- [ ] **Step 3:** `pnpm format && pnpm test:scripts && pnpm lint && pnpm exec tsc --noEmit`: pass.
- [ ] **Step 4:** Commit `ci: fix content PRs from @claude comments`.
- [ ] **Step 5:** Tell the user the setup they must do before the first run (environment, federation rule, ruleset),
      and that the first real test is a comment on an open content PR; do not trigger it yourself.
