# Service sheet by e-mail: design

Status: draft. The pre-flight (§2) now routes on the week check `pnpm stage sheet` runs on every run, `--draft`
included: it refuses a released week without `--corrected`, a week before the current sheet and one overlapping
another, and names a week already in `service-sheets.json`. No plan yet. Date: 2026-10-16, updated 2026-10-17.

## Intent

Today the maintainer receives the parish's DOCX ("Pořad bohoslužeb 2026.docx"), runs `parish-create-service-sheet`
(or `parish-correct-service-sheet`) in Claude Code, answers its questions and releases with `pnpm release`. The goal is
that the parish e-mails the DOCX and the week is ready to publish without the maintainer at a computer: a pull request
is waiting in the morning, the maintainer reviews it in a few minutes and merges, and the merge releases the site.

**Why:** the weekly run needs the maintainer's machine and attention. The time saved is modest (about 10 hours a year);
the gain is that the work becomes a short review that can be done anywhere, and that a deterministic check proves the
published facts match the parish's document.

## Goals

- The parish sends the year's DOCX to `porad@farakurim.cz`; by the next morning every week that is new or changed has a
  PR ready for review, or the maintainer is told why not.
- What is published as fact (dates, services, times, places, intentions, announcement text) comes only from the
  document, and code, not the model, proves it.
- The maintainer's merge is the explicit "yes" to publish; the release still goes through a `vX.Y.Z` tag and the
  existing `.github/workflows/deploy.yml`.
- Corrections to weeks already in the PR or on the site, duplicates and resends are handled without new PRs or API
  calls where nothing changed.

## Non-goals

- No publishing without a human approval, and no approval by e-mail.
- **No e-mail is ever sent**, to the parish or anyone else (the maintainer's decision). The parish only sends; the
  maintainer gets every outcome through GitHub and talks to the parish themselves, as today.
- No corrections from e-mail text without a document ("v pátek mše nebude"): the parish sends the updated DOCX, or the
  maintainer makes the change.
- No changes to the Google Calendars: the PR lists what to mirror, the maintainer does it.
- No schedule exceptions (`parish-create-exception`), events or other content through this pipeline.
- No PDF sources: the pipeline reads the DOCX only (the PDF path stays local).

## Anti-goals (a failure even if it works)

- A mass, time or intention on the site that is not in the parish's document, or one missing that is.
- Announcement text reworded, summarised or invented by the model.
- The year's DOCX (a year of intentions with names) stored anywhere: artifact, repo, logs, PR, cache.
- A sheet release shipping unreleased code changes from `main`.
- A forged e-mail leading to anything but a rejection; any e-mail sent by the pipeline.
- A deploy key or push token readable by the model.

## Constraints

- Everything in `CLAUDE.md` § Deployment holds: only the scripts reach the server, a pushed tag is never moved, server-only
  folders are never touched.
- Static export, pnpm, the conventions in `docs/conventions.md` (English code and docs, Czech site content), the `scripts/` layout in `.claude/rules/structure.md` (entry point per command, logic and
  tests in `scripts/lib/`).
- Messages to the maintainer (PR body, PR comments, run summaries) are English with site content quoted in Czech.
- The repo is public, so PRs, comments, logs and artifacts are world-readable. Intentions with names may appear there
  before approval (the maintainer's decision: they are public anyway); the parish's e-mail text and the year's DOCX
  never do.
- seznam.cz publishes DMARC `p=none`: mail claiming `From: fara.kurim@seznam.cz` from elsewhere is delivered, so the
  address alone proves nothing.
- The mailbox is at the hosting provider (cesky-hosting.cz), which also hosts the site, but it is a mail service, not
  the web server: the workflow reads it over IMAP only. `CLAUDE.md` § Deployment still holds for the web server, and
  an agent never logs in to the mailbox either.

## Decisions

### Addresses

- Mailbox: `porad@farakurim.cz` at cesky-hosting.cz, a mailbox for the pipeline only, read only over IMAP on port 993
  (TLS) at the host the hosting's mail settings give; no SMTP. The username is the whole address, the password is the
  mailbox's own password, used for nothing else.
- The only accepted sender: `fara.kurim@seznam.cz`, compared exactly (lowercased, dots significant: Seznam does not
  ignore them).

### Overview

```
fara.kurim@seznam.cz ──DOCX──▶ porad@farakurim.cz
                                  │ daily IMAP poll (≈ 4:40 Prague summer, 3:40 winter)
                                  ▼
 service-sheet.yml   1 mail      accept / reject
                     2 pre-flight route every week the site shows (no LLM)
                     3 draft      pnpm stage sheet --draft (no LLM)
                     4 review     Claude (claude-code-action): record.json + report
                     5 guard      record vs. draft, vs. the base (no LLM)
                     6 stage+test pnpm stage sheet --record, tests, build, screenshot
                     7 PR         branch service-sheet/<validFrom>, body from the report
                     8 summary    run summary for the maintainer; the run fails when they must act
 service-sheet-fix.yml      @claude comments on those PRs → steps 4–7 on the branch
 service-sheet-release.yml  PR merged → pnpm release --yes → tag → deploy.yml (unchanged)
```

### 1. Mail (`scripts/sheet-mail.ts`, logic in `scripts/lib/services/mailbox.ts`)

- Schedule: `cron: "40 2 * * *"` (UTC; before 5:00 Prague all year, off the full hour) plus `workflow_dispatch` for a
  change that cannot wait. Daily is enough (the maintainer's call).
- Reads unseen messages in INBOX, oldest first. Folders hold the state: a message moves to `Zpracováno` or `Odmítnuto`
  only after its outcome (PR opened or updated, or the problem reported, §8) is done, so a crashed run retries it.
- **Accepted** only when `From` is exactly `fara.kurim@seznam.cz` **and** the message carries a valid DKIM signature with
  `d=seznam.cz`, verified by a DKIM library on the raw message (the signature is Seznam's, made when the parish
  sends). An `Authentication-Results` header is not trusted: Seznam no longer receives the mail, and unless the
  hosting's mail server is known to add and strip that header, a forged message can carry its own. Anything else
  moves to `Odmítnuto` with no reply.
- An accepted message with exactly one `.docx` attachment is a sheet. With none or several (a described change in
  the text, a PDF, a reply), it moves to `Odmítnuto` and the run reports it to the maintainer (§8); its text is never
  posted to GitHub.
- When several accepted sheets arrive between runs, only the newest is processed; the older ones move to
  `Zpracováno` as superseded, listed in the run summary.
- The DOCX is written to the runner's temp directory and processed **in the same job**; it is never uploaded as an
  artifact, cached or logged, and is deleted at the end of the job.
- Libraries: `imapflow`, `mailparser` and a DKIM verifier such as `mailauth` (check each with context7 before use, per
  `CLAUDE.md`).

### 2. Pre-flight: routing (no LLM)

From the DOCX, draft **every week the site still shows** (the current sheet in `service-sheets.json` on `main` and any
later ones) plus the newest week of the DOCX (§3). The draft run checks the week against `service-sheets.json` (today
in Prague) and the server, and the pre-flight routes on its answer, adding only what the script cannot know (an open
PR) and "same content". A week with an open PR `service-sheet/<validFrom>` is drafted on that branch, every other week
on `main`:

| The draft run's answer for the week                                         | Route                    | Base                  |
| --------------------------------------------------------------------------- | ------------------------ | --------------------- |
| a new week (not in `service-sheets.json`)                                   | create                   | the draft             |
| on its open PR's branch: already there, not released                        | correct the PR           | the PR branch's sheet |
| on `main`: already there, not released (merged, `pnpm release` not run yet) | correct (staged)         | the sheet on `main`   |
| released (its PDF is on the server): drafted again with `--corrected`       | correct (published)      | the sheet on `main`   |
| refused: before the current sheet                                           | refused                  | —                     |
| refused: overlaps another sheet (a heading's dates do not fit the sheets)   | document error           | —                     |
| facts equal to the base (see "Same content")                                | unchanged: nothing to do | —                     |

- The pre-flight calls the stage logic (`stageSheet()` in `scripts/lib/stage/sheet.ts`) instead of parsing the
  command's text, and routes on a typed result: the builder makes it return the week's state (new, already there,
  released) and throw a typed refusal (before the current sheet, overlap), where today it prints a line or throws a
  message.

- A document error the draft script throws (a date outside the week, a weekday that does not fit, times that do not
  pair with services, a table outside the heading's dates) is reported to the maintainer with the week and day (§8),
  and that week stops. The other weeks continue.
- Whether a week is released is decided by the existing logic in `pnpm stage sheet` (`stage()` and `correctedRev()`
  in `scripts/lib/stage/core.ts`, a HEAD request to the public `https://farakurim.cz/uploads/…` URL through
  `onServer()` in `scripts/lib/uploads.ts`): without `--corrected` it refuses a week whose PDF is on the server, and
  with it the PDF takes the next `rev`. A week already there but not released takes no `--corrected`: its staged PDF
  is replaced under the same name. This is the script's own public HTTP check, not an SSH connection, so it stays within
  `CLAUDE.md` § Deployment (my call). The server, not git, is the truth here, because `release.sh` uploads before it
  tags.
- **Same content**: the guard's comparison (§5) of the new draft with the base returns "facts equal". The DOCX's bytes
  are never compared (Word changes them on every save). Formatting-only changes count as unchanged.
- Each changed week becomes its own PR. Weeks are processed one after another in one job.
- **A correction of a released week** (example): the week 19.–25. 10. was released with
  `2026-10-19-porad-bohosluzeb.pdf`; on Wednesday the parish sends the DOCX with a funeral added on Friday. The run
  routes the week to "correct (published)", drafts it with `--corrected`, Claude starts from the sheet on `main`, the
  guard compares facts with the new draft and kept fixes with the published sheet, and staging finds the PDF on the
  server, so it stages `2026-10-19-porad-bohosluzeb-r2.pdf` and the sheet's `rev` becomes 2. The PR (branch
  `service-sheet/2026-10-19-r2`, `fix(content): correct the service sheet for 19.–25. 10. 2026`) shows only what
  differs and the calendar items to mirror. The merge releases it as any other (§10); the old PDF stays on the
  server, the site links the new one. It is published the next morning at the earliest, after the maintainer's
  review; a change that cannot wait is run by hand (`workflow_dispatch`) or made locally.
- A week before the current sheet (a newer sheet has started and the script removed it) is refused by the draft run
  itself and reported: past weeks are not corrected, as locally.

### 3. Draft (no LLM)

`pnpm stage sheet "<docx>" --from <validFrom> --to <validTo> [--corrected] --draft <tmp>/draft.json` for each week to
create or correct. Existing behaviour: the same run gives §2 its answer (the week check against
`service-sheets.json` and the server), so a week is drafted once, again only with `--corrected` when it is released.

### 4. Review (Claude)

- `anthropics/claude-code-action@v1`, `ANTHROPIC_API_KEY`, latest Claude model. Tools: read the repo, write only
  `record.json` (and nothing else: no shell, no git, no web). The job holds no deploy key, no App token in Claude's
  environment.
- Instructions: the judgement parts of `parish-create-service-sheet` §2a (create) or `parish-correct-service-sheet` §2
  (correct: start from the base, take over only the differences in the text, keep `<strong>`, categories, `newsId`),
  without the "confirm with the user" step: every question goes into the report instead.
- Output through `--json-schema` (step output `structured_output`):

  ```json
  {
    "summary": "…",
    "changes": [{ "where": "announcements[2].category", "from": "info", "to": "invitation", "reason": "…" }],
    "questions": [
      {
        "id": "q1",
        "severity": "blocking | note",
        "where": "days[3].rows[1]",
        "text": "…",
        "proposal": "…"
      }
    ],
    "previous": [{ "id": "q1", "status": "resolved | open | obsolete", "how": "…" }]
  }
  ```

- `previous` answers every question of the last report (read from the PR body, §7). A question it omits stays open.

### 5. Guard (`pnpm sheet-guard`, logic in `scripts/lib/services/sheet-guard.ts`, no LLM)

Compares `record.json` with the draft and, for a correction, with the base:

- **Facts, vs. the draft, must be identical**: every date, the number of rows per day, each row's `time`, `place`,
  `title`, `detail`.
- **Announcement text, vs. the draft**: tags stripped and whitespace normalised, the joined text equals the draft's,
  minus only the drops the skill allows (paragraphs without words, editorial markers such as "[V Kuřimi:]"). This
  allows merging, splitting into lists and `<strong>`, and catches rewording, summaries and inventions.
- **Kept fixes, vs. the base (corrections only)**: `category`, `newsId`, `<strong>`, `feast`, `solemnity`, `mass`,
  `service` of an announcement or row whose text did not change stay as in the base.
- **Allowed changes are listed**, never silent: every flag, category, feast, `newsId` that differs from the draft (or
  the base) goes into the PR as "draft → record". Each `newsId` is shown with its event's title and date.
- Placeholder dots ("……") anywhere in the record are a guard failure.
- A guard failure is a blocking item that only a corrected DOCX or the maintainer's `override-guard` label clears;
  Claude cannot mark it resolved. With the label, the PR body shows the override prominently.
- The same comparison is what §2 calls "facts equal".

The guard is also run by `pnpm stage sheet --record` locally (phase 1), so the local skills get it too (my calls):

- With a DOCX source, the script drafts the week itself and runs the full guard; a failure stops it and prints the
  differences.
- With a PDF source, or a record-only correction (the source is the staged PDF), there is no draft: only the
  placeholder check and, for a correction, the kept-fixes check against the sheet on disk run.
- `--override-guard` lets an intentional fact change through locally; the script prints every overridden difference
  and the skills show them to the user before staging.

### 6. Stage and test

`pnpm stage sheet "<docx>" … --record record.json [--corrected]` (validates, stages the PDF in `uploads/`, updates
`service-sheets.json`, runs the service sheet tests), then `pnpm test` and `pnpm build` with the calendar key, and a
Playwright screenshot of `/porad-bohosluzeb/` at 390 and 1440 px. The week's page of the PDF is rendered to an image.
The staged PDF is uploaded as an artifact named after the week and the PR head commit, retention 30 days (my call:
longer than any PR stays open).

### 7. PR

- Branch `service-sheet/<validFrom>` (`service-sheet/<validFrom>-r<rev>` for a released week's correction), one
  commit by the bot, message as `parish-publish-content` says:
  `feat(content): publish the service sheet for 19.–25. 10. 2026`, or `fix(content): correct the service sheet for …`.
  Committed with the GitHub App token, so `check.yml` runs on it.
- A new week opens a PR; a changed week with an open PR gets a new commit on its branch (never a force-push that
  drops earlier fixes); a correction of a published week opens a new PR from `main`.
- The body is rendered by a script (`scripts/lib/services/sheet-report.ts`), never written by Claude:
  - the PDF page image next to the screenshots;
  - blocking items (questions and guard failures), then notes;
  - for a correction, published → corrected, day by day (only what differs);
  - Claude's changes to the draft;
  - "Zrcadlit v kalendáři": the services added, changed or removed against the base, for the "Bohoslužby" calendar;
  - the last report as JSON in a hidden comment (`<!-- sheet-report: … -->`).
- A status check "Pořad – otázky" fails while any blocking item is open, and with blocking items the PR opens as a
  draft. It is **not** a required check in branch protection (my call): GitHub cannot require a check only for
  `service-sheet/*` PRs, and requiring it on `main` would block the maintainer's direct pushes and `release.sh`. The
  release job (§10) enforces it instead: it refuses to release when the check was not green on the PR's head commit.
- After every later run (new DOCX, comment fix), the bot comments what changed: "Resolved: q1 (…) · New: q3 · Still
  open: q2".

### 8. Telling the maintainer (no e-mail)

Everything goes to the maintainer through GitHub (my call on the channel; the maintainer decided no e-mail is sent):

- What concerns a PR (questions, guard failures, what changed) is in the PR, as §7 says; GitHub notifies the
  maintainer of new PRs and comments.
- Every run writes a job summary listing each message (accepted, rejected, superseded) and each week (PR opened or
  updated with its link, unchanged, refused, document error with week and day).
- A run **fails** (red, so GitHub notifies the maintainer) when something needs action without a PR: a document error,
  an accepted message without exactly one `.docx`, a refused week. A run with only rejected strangers' mail or
  unchanged weeks stays green.
- Questions only the parish can answer are questions to the maintainer, who asks the parish as today. The report has
  no `audience` field.
- The repo is public: summaries and logs carry dates, days and error messages, never message text, intentions or the
  sender's other content.

### 9. Comments (`service-sheet-fix.yml`)

- Triggers: `issue_comment`, `pull_request_review_comment`, `pull_request_review` on PRs whose branch starts with
  `service-sheet/`; only comments containing `@claude`; only users with write access (the action's default; never
  `allowed_non_write_users`).
- `concurrency` per PR, queued, never cancelled.
- The job checks out the branch, downloads the week's draft (below), runs Claude with the comment, then the guard,
  stage and test, report and commit in the **same job** (a push with `GITHUB_TOKEN` would not start other workflows;
  the App token is used for the push).
- The draft for the guard: the job stores `draft.json` of each week as an artifact next to the PDF (it holds only that
  week's rows and announcements, which are published anyway; the year's DOCX never is). The comment job downloads it.
- A comment fix changes only the record; the PDF stays the one from the DOCX run. `pnpm stage sheet` needs a source for
  `--record`: the job passes the staged PDF from the artifact (as `parish-correct-service-sheet` §3 does locally).
- A comment that asks for a fact change fails the guard: the edit is dropped and Claude replies (Czech quoted) that the
  document must be corrected, unless `override-guard` is set.
- A question can be settled without a change: "@claude q2: correct as is" marks it resolved with the reason.
- The maintainer may also push commits to the branch directly; `check.yml` and the guard check run on them.

### 10. Release on merge (`service-sheet-release.yml`)

1. Trigger: `pull_request: closed`, merged, branch `service-sheet/*`. Squash merge (the PR title is the commit).
2. Environment `Production` (holds `DEPLOY_SSH_KEY`); `concurrency: release`, queued.
3. Check out `main` (clean, not behind `origin`, as `release.sh` checks). Stop with a PR comment unless **every**
   commit since the last tag is the squash commit of a merged `service-sheet/*` PR whose "Pořad – otázky" was green on
   its head commit ("main has other unreleased commits: release by hand"). So two sheet PRs merged close together (a
   correction and the next week) go out in one release; the second job then finds nothing to release and ends green.
   (My call: other unreleased commits, an event or a Petrklíč issue, have their uploads only on the maintainer's
   machine, and `check-uploads` would fail after the tag is pushed.)
4. Download the PDF artifact of each of those PRs (of its head commit) into `uploads/porady_bohosluzeb/`; stop with a
   comment if one expired. Per week only the **newest** merged PR's PDF is taken: a week merged but not released and
   then corrected has two PDFs of the same name (its PDF was not on the server yet, so the correction replaced it at
   the same `rev`), and only the correction's is right.
5. `pnpm release --yes`: uploads the PDF (`scripts/deploy.sh uploads`, adds only), bumps the patch version, commits
   `chore(release): vX.Y.Z`, tags, and pushes `main` with the tag. The push uses the GitHub App token, so the tag
   starts `deploy.yml`.
6. `deploy.yml` runs unchanged: tag checks, check, build, `check-uploads`, deploy, verify.
7. After the deploy succeeds: PR comment "Released in vX.Y.Z" with the link to `/porad-bohosluzeb/`, branch deleted. A failed deploy is fixed in a new commit and released again (never move a tag).

### GitHub setup

- A GitHub App installed on this repo only, `contents: write`, `pull-requests: write`, `checks: write`. Its key is a
  secret of the jobs that push; never in Claude's step environment. `main` keeps today's rules (no required checks),
  so the maintainer's direct pushes and local `pnpm release` keep working unchanged.
- Environments: `Mailbox` (IMAP host, user and password), `Production` (existing).
- Secret `ANTHROPIC_API_KEY`; repository variables as today for the build.

## Phases

The maintainer's earlier assessment: the full pipeline saves little time and adds upkeep. So it is built in phases,
each useful alone, and stops when one is enough (agreed with the maintainer; phase 1 first):

1. **Local**: the guard (§5), the all-weeks comparison and "same content" (§2) inside `pnpm stage sheet` and the two
   skills. About a day. The week check §2 routes on is already there; its typed result comes with phase 2.
2. **Mail → PR**: §1–§8, routing and corrections included (a resent DOCX updates or opens PRs as §2 says); without
   the comment workflow (§9) and the release job (§10). The maintainer fixes a PR by pushing to its branch, merges,
   then downloads the week's PDF artifact into `uploads/porady_bohosluzeb/` (`gh run download`) and runs
   `pnpm release` locally.
3. **Full**: §9 and §10.

## Open checks before building

- An IMAP login to `porad@farakurim.cz` from a GitHub runner works (the hosting may limit IMAP by IP or rate), and
  the folders `Zpracováno` and `Odmítnuto` can be created there.
- A test e-mail from `fara.kurim@seznam.cz` reaches the mailbox with Seznam's DKIM signature (`d=seznam.cz`) intact
  and verifiable (no forwarding or rewriting on the way); another Seznam account cannot send with that `From`.
- claude-code-action: `--json-schema` and `structured_output` as documented; whether its comment mode commits on its
  own (then use a custom `prompt`, agent mode, which makes no commits, and commit in a later step); whether
  `--append-system-prompt` passes through `claude_args`.
- LibreOffice converts the DOCX on `ubuntu-24.04` the way the local run does (`docx-to-pdf.ts`).

## Left to the builder

- The names of the workflows, jobs, the App and the scripts beyond those given here.
- The exact prompt text for Claude, the PR body and run summary layout.
- How the comparison normalises text, as long as it meets §5.
- Updating `README.md`, `docs/deployment.md` and the two skills to describe the new path.
