# Fixing content PRs with `@claude` comments: design

Status: draft. A comment with `@claude` on an open `service-sheet/*` or `events/*` PR makes Claude correct the PR on
its branch. Date: 2026-10-26.

## Intent

The service sheet and events pipelines (`2026-10-16-service-sheet-email-pipeline-design.md`,
`2026-10-22-events-email-pipeline-design.md`) open a PR the maintainer reviews and merges. Today a wrong field, a
wrong poster or the answer to a blocking question means pushing a commit or running a skill on a computer. The events
pipeline's goal, a review "that can be done anywhere", breaks exactly there, and events arrive several times a week
from several senders, with more guessing (titles, grouping, duplicates) than sheets.

This builds the service sheet spec's §6 ("Comments", never built), generalised to both kinds of content PR, as one
workflow. It replaces the planned `service-sheet-fix.yml` and lifts the events spec's non-goal "No `@claude` comments
on the PR yet".

## Goals

- The maintainer writes a comment containing `@claude` in the conversation of an open content PR; Claude makes the
  change on the PR's branch with the same skills as locally, the PR is updated (commit, staged files, body), and a
  reply says what changed.
- `check.yml` is the only test and build of a content PR: the pipelines stop testing and building before they commit,
  and a red check is fixed with a comment (§ Checks).
- Comments are text only (the maintainer's decision): no files come with a comment.
- An answer to a question without a change ("@claude q2: correct as is") is recorded in the report.
- A fix commit merges and releases like any commit of the PR: the content release finds its staged files.

## Non-goals

- **Review comments and inline comments** (`pull_request_review`, `pull_request_review_comment`) do not trigger it
  (the maintainer's decision). Their runs are not runs on `main`, so the content release would not trust their
  artifacts (`trusted` in `scripts/lib/content-release/sources.ts`). Only PR conversation comments (`issue_comment`)
  count. The docs say so.
- **Dropping an event from an events PR, and pinning or unpinning one, are forbidden** (the maintainer's decision). A
  comment asking for either changes nothing and gets a reply saying so (drop: close the PR, or push a commit; pin: run
  `parish-pin-event` after the merge). The same holds for anything else outside the allowed changes below.
- No comments on merged or closed PRs, on forks' PRs, or on other PRs.
- No new mail is read and no e-mail is sent.

## Anti-goals (a failure even if it works)

- Anyone without write access getting Claude to change a PR, or a fork's PR getting a run.
- A step holding the App key or the deploy key running code from a workspace Claude touched (the pipelines' two-job
  split).
- A fix commit the content release cannot release (an untrusted or missing artifact for a file the commit links).
- The rest of the PR thread reaching Claude's prompt.
- Text from a mail quoted in the public PR beyond what gets published.

## Constraints

- Static export, the pipelines' setup: `anthropics/claude-code-action` with workload identity federation, the content
  GitHub App (`CONTENT_APP_CLIENT_ID`, `CONTENT_APP_PRIVATE_KEY`), pinned actions by SHA, `ubuntu-24.04`.
- The release applies each commit's `content-uploads-<sha>` in commit order, newest file of a path wins
  (`artifactsOfPull` in `scripts/lib/content-release/plan.ts`), and trusts only artifacts of runs on this repo's
  `main`. An `issue_comment` run is one.
- The conversation of a content PR is locked: only collaborators with write access can comment.
- The repo is public: logs, summaries, replies and the PR body never carry more than what gets published.

## Decisions

### Workflow (`content-fix.yml`)

- Trigger: `issue_comment: created` only (the maintainer's decision). An edited comment does not re-run.
- Runs only when all hold: the issue is a PR, open; its head branch starts with `service-sheet/` or `events/`; its head
  repository is this repo; the comment contains `@claude`; the comment's `author_association` is `OWNER`, `MEMBER` or
  `COLLABORATOR`; and the author is not a bot (the App's own replies never trigger it). The action's own write-access
  check stays on (never `allowed_non_write_users`).
- **Environment `content-fix`** (the maintainer's decision), for the Claude job and the publish job: deployment
  branches allowing `main`, no required reviewers, the variable `ANTHROPIC_FEDERATION_RULE_ID` holding a third Claude
  Console federation rule for the pipelines' service account (`subject_prefix`
  `repo:oplaner4@38047115/farakurim@1403139652:environment:content-fix`, set up as the events rule in
  `docs/deployment.md`). It holds no IMAP login. The App key stays the repository secret `CONTENT_APP_PRIVATE_KEY`.
- **No comment is lost** (the maintainer's decision). GitHub keeps one pending run per concurrency group, and a newer
  run cancels the older pending one, so a run never relies on its own triggering comment alone:
  - A `gate` job outside any concurrency group runs on every matching comment: it adds an eyes reaction (the
    maintainer sees it was picked up) and does nothing else.
  - The work runs in the group `content-fix-<PR number>` (both kinds), `cancel-in-progress: false`. Each run handles
    the PR's **unanswered** comments, oldest first, one at a time: every comment on the PR that matches the filter
    above and has no bot reply yet. A bot reply carries a hidden marker naming the comment it answers
    (`<!-- content-fix: <comment id> -->`, my call), success, refusal and failure alike, so a failed comment is not
    retried forever; the maintainer writes it again.
  - So a run cancelled while pending loses nothing: the next run, or the one in progress when it finishes its
    current comment and looks again, picks the comment up.
  - Sheet PRs do not share `service-sheet.yml`'s group: a new mail adding a commit to the open sheet PR while a fix
    runs makes one of the pushes fail (never a force-push). A rejected fix push replies "the PR changed meanwhile,
    write the comment again" (my call).
- The PR's state, head and kind are read before each comment, not from the event: a PR merged or closed meanwhile is
  left alone, and each comment starts from the head the previous one pushed.
- Two jobs per comment as in `events.yml`: **`fix`** (id-token for Claude, read-only token, no App key) and
  **`publish`** (fresh checkout, App key, no id-token). They hand over a one-day artifact: the report, the patch, the
  staged files the fix changed or added, and the reply text. One comment per Claude run, the prompt holding only that
  comment. How the run loops over several comments while keeping the two-job split (a matrix of one, a re-dispatch of
  itself as `events.yml`'s `next` does, …) is the builder's call.

### `fix` job

1. Check out the PR's head commit.
2. Download the PR's staged files: every trusted `content-uploads-<sha>`
   of the PR's commits, applied in order into `uploads/`, reusing the release's plan code. An expired artifact stops
   the run with a reply (the PR has to be recreated; it does not happen within 30 days).
3. Write Claude's input to `$RUNNER_TEMP/fix/`: `comment.md` (the triggering comment only), `report.md` (the PR
   body's report part, which the bot wrote and only collaborators can edit). For events, the known events
   (`pnpm event-mail known`, as in `events.yml`) go to the artifact for `publish`'s `check-ids`, read before Claude
   runs. When the head commit's `Check` run failed:
   `check.md`, its failed steps with their log tails (the failed test names and assertion diffs, the build error), so
   "@claude fix the failing check" works; Claude cannot run the tests itself. The log holds only repo content and
   published content, so it may reach the prompt.
4. Run Claude with the same tool limits as the pipelines (file tools write only in `$RUNNER_TEMP/fix`, the checkout
   denied, the stage and add scripts allowed, `pdftotext` to stdout, no git, no network). The prompt names the kind,
   the folder and the skill's "Comment run" section; the rules live in the skills.
5. Collect: the report, the patch of `src/content/` against the head commit (as `events.yml` and `service-sheet.yml`
   build it), and the files under `uploads/` that are new or differ from what step 2 downloaded (a correction can rename, relabel or re-render a staged file).

### What a comment may do

| Kind   | Allowed                                                                                                                                    | Skill (its new "Comment run" section) |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| sheets | correct a week the PR holds (services, intentions, announcements, its PDF); answer a question                                              | `parish-correct-service-sheet`        |
| events | correct an event the PR adds (text, date, time, place, programme, links, its staged files' labels, which is the poster); answer a question | `parish-correct-event`                |
| both   | fix a failing `Check` caused by the PR's content (below, § Checks), from `check.md`                                                        | the kind's correct skill              |

- **Sources:** what the PR already holds (its record, its staged files) and the comment. A comment cannot add a file,
  so a replaced poster, an extra attachment or a replaced sheet PDF is a pushed commit, a local skill run, or a
  correction after the merge.
- **No new events** (the maintainer's decision; splitting an event the PR adds into several is out too, as too complex): the fix run has no mail (its subject and body were
  deleted with the run), no dropped attachment and no refused event's files (neither was staged), so an event the run
  left out is added locally with `parish-create-event`. Mailing
  an event again helps only when the run overlooked it (an event only in the body); a wrongly refused event (a correction trigger word in an unrelated sense,
  such as "oprava kostela"; a false duplicate match) would most likely be refused again. The reviewer sees refused
  events and dropped attachments in the report; anything else only in the mail, which stays in the mailbox's
  `Zpracováno` folder.
- **Facts not in any document:** made as asked, as locally (the maintainer is the one confirming); the reply says the
  site will then differ from the parish's document.
- **Out of bounds** (dropping, pinning, adding or splitting an event, a file, an event or week the PR does not hold, anything else): no change, the reply
  says what to do instead. The run stays green.
- Each skill's "Comment run" section never asks or waits, writes the updated report (it keeps the question ids and
  the sections of the weeks or events it did not touch, marks answered questions with their answer, and sets
  `blocking:` from the questions still open) and a reply (`## Reply`, a few lines: what changed, or why nothing did).

### `publish` job

As the pipelines' `publish`, on a fresh checkout of the PR's head:

- Apply the patch only if it touches nothing but the kind's files (sheets: `src/content/*.json` as
  `service-sheet.yml`; events: `src/content/news/YYYY/MM.json`), check new event ids against open events PRs
  (`pnpm event-mail check-ids`). No test or build: `check.yml` runs on the pushed commit (§ Checks).
- Commit as the App's bot, push without force. The comment run's report has three header lines (my call):
  `blocking: yes|no`, `commit: <message>` (the PR title: the squash commit on `main`, describing every week or event
  the PR holds, as in the pipelines) and `fix: <message>` (this commit, what the comment changed, for example
  `fix(content): correct the Sunday intention`). Both are checked by commitlint, with a default otherwise.
- Upload the changed and added staged files as `content-uploads-<sha>` of the new commit (30 days); none when the
  commit staged no file.
- Update the PR body from the report (plus the footer the pipelines add, and for events the `Události` lines), and
  the title from its `commit:` line.
- `check-ids` leaves out the events of this PR itself (they are on its branch already).
- Draft state: `blocking: yes` turns the PR back into a draft; `blocking: no` leaves it as it is (the maintainer
  marks it ready, as the sheet spec says).
- Reply on the PR with the report's `## Reply` and the run's link.
- Without a change (an answer only, or a refusal): no commit; the body is updated when the report changed, and the
  reply is posted.

### Checks: `check.yml` only (the maintainer's decision)

With comments able to fix a PR, nothing runs the tests or the build before a content commit: `service-sheet.yml`'s
and `events.yml`'s `publish` jobs drop their `Test` and `Build` steps, and `content-fix.yml` never has them.
`check.yml` (format, tests, lint, types, build) runs on every commit the App pushes to a content PR, and a red check is
fixed with "@claude fix the failing check" or a pushed commit. The tests and the build read no staged file
(`uploads/` is not in git), so `check.yml` sees what the dropped steps saw.

- **A red PR cannot be merged:** `Check` becomes a required status check on `main` in a ruleset (setup, by the
  maintainer), with the content App as a bypass actor so the release commit and tag still push. Today nothing stops a
  red merge: the content release does not look at checks, and a red merge would push a release tag whose `deploy.yml`
  check then fails.
- **The cheap guards stay** in `publish`: the patch's allowed files, `check-ids`, commitlint, the report format.
- **Retries change:** a mail whose change fails a test is no longer left unread for the next run (which mostly
  repeated the failure); it is filed and its PR opens red.
- **No notification:** a red check on a commit the bot pushed notifies nobody; the maintainer sees it when reviewing
  the PR, as before any merge.

What can make the check fail on a content PR. The content's own rules cannot: the stage and add scripts are the only
writers of `src/content/` in a run, and they format the files they write and run the content tests on them
(`formatAndTest` in `scripts/lib/content-files.ts`: `src/content/news` for events, `service-sheets.test.ts` and
`schedule-exceptions.test.ts` for sheets). A schema error, an id caught by an old-URL redirect, two pins, a wrong month
file, weeks out of order, a stale schedule exception or an announcement linking a missing event fails the script, so
the event or week is refused or fixed in the run and never reaches a commit.

One gap, closed here (my call): the scripts write the files first and test them after, and a failing test leaves the
written files in place (`execute` in `scripts/lib/stage/command.ts`, `scripts/add-event.ts`). If Claude then gives up
and reports the event refused, the patch still carries the broken record and `publish` applies it. The scripts restore
the files they wrote when their tests fail, and `publish` refuses a patch whose report creates or corrects nothing.

What is left:

| Cause                                                                                                                                                                                                                                                             | Fixed by                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `main` moved since the commit: `check.yml` checks the PR merged into `main`, so a change merged meanwhile can clash with the PR (another PR's event under a link a sheet announcement uses was changed, an exception added by hand on a day the PR's week covers) | `@claude` on the updated branch, or update the branch                               |
| A test the scripts do not run (the site's other tests, such as the sitemap's) or the build failing for content the content tests accept                                                                                                                           | `@claude`, or a code fix                                                            |
| Not the PR: `main` itself broken (a dependency update, a date-dependent test), lint or types (content cannot break them), a runner, network or `pnpm install` failure                                                                                             | re-run the check, or fix `main`; `@claude` replies that the cause is outside the PR |

A comment run that finds the failure outside the PR's content changes nothing and says so in its reply.

### Failures

The run fails (red, GitHub notifies) on a technical failure: Claude's step, a report without its three header lines, a
patch outside the allowed files, the push. A reply on the PR says it failed, with the run link,
never the comment's or the files' content. A refusal (out of bounds) is a reply and a green run.

### Docs

- `docs/deployment.md`: the setup of the `content-fix` environment and its federation rule; "Answering the PR" gains `@claude` conversation comments for both kinds (what they may do,
  review comments ignored, text only), and drops "comments with `@claude` come in phase 2".
- The PR footer of both pipelines mentions `@claude` comments.
- `docs/deployment.md` and the workflows' header comments: the pipelines no longer test or build; the `Check` ruleset
  setup; a failed test no longer leaves the mail unread.
- The sheet and events specs' "Before the PR: `pnpm test` and `pnpm build`" point to § Checks.
- The sheet spec's §6 and the events spec's non-goal point to this spec.

## Left to the builder

- Script names and where the artifact download lives (`scripts/lib/`, shared with the
  pipelines where they overlap).
- The reaction, the exact reply wording, and how the App replies and reacts on a locked conversation
  (`content-release.yml` comments on content PRs already).
- An explicit write-permission check through the API if the action's own check does not run in the chosen mode.
- Whether `claude-code-action` runs in agent mode with this prompt (as the pipelines do) or in tag mode, as long as the
  prompt holds only the triggering comment.
- Tests for the new scripts (`pnpm test:scripts`), as the pipelines have them.
