# Service sheet by e-mail: design

Status: draft. The pipeline runs the service sheet skills themselves; their "confirm with the user" step becomes the
PR. No plan yet. Date: 2026-10-16, updated 2026-10-17.

## Intent

Today the maintainer receives the parish's DOCX ("Pořad bohoslužeb 2026.docx"), runs `parish-create-service-sheet`
(or `parish-correct-service-sheet`) in Claude Code, answers its questions and releases with `pnpm release`. The goal is
that the parish e-mails the DOCX and the week is ready to publish without the maintainer at a computer: a pull request
is waiting in the morning, the maintainer reviews it in a few minutes and merges, and the merge releases the site.

**Why:** the weekly run needs the maintainer's machine and attention. The time saved is modest (about 10 hours a year);
the gain is that the work becomes a short review that can be done anywhere.

## Goals

- The parish sends the year's DOCX to `porad@farakurim.cz`; by the next morning every week that is new or changed has a
  PR ready for review, or the maintainer is told why not.
- The pipeline runs the same skills as the maintainer does locally (`parish-create-service-sheet`,
  `parish-correct-service-sheet`), so the rules live in one place and a local run and a pipeline run do the same.
- What is published as fact (dates, services, times, places, intentions, announcement text) comes only from the
  document; the maintainer's review of the PR checks it, as their confirmation does locally today.
- The maintainer's merge is the explicit "yes" to publish; the release still goes through a `vX.Y.Z` tag and the
  existing `.github/workflows/deploy.yml`.
- Every e-mail is about the DOCX's newest week: a new week is created, a week already on the site is corrected
  (replaced from the new draft). A resend that changes nothing still opens a PR, which the maintainer closes.

## Non-goals

- No publishing without a human approval, and no approval by e-mail.
- **No e-mail is ever sent**, to the parish or anyone else (the maintainer's decision). The parish only sends; the
  maintainer gets every outcome through GitHub and talks to the parish themselves, as today.
- No corrections from e-mail text without a document ("v pátek mše nebude"): the parish sends the updated DOCX, or the
  maintainer makes the change.
- No changes to the Google Calendars: the PR lists what to mirror, the maintainer does it. (Superseded: the release
  now keeps the Bohoslužby calendar in line, see `docs/superpowers/specs/2026-10-24-bohosluzby-calendar-sync-design.md`.)
- No schedule exceptions (`parish-create-exception`), events or other content through this pipeline.
- No PDF sources: the pipeline reads the DOCX only (the PDF path stays local).

## Anti-goals (a failure even if it works)

- A mass, time or intention on the site that is not in the parish's document, or one missing that is.
- Announcement text reworded, summarised or invented by the model.
- The year's DOCX (a year of intentions with names) stored anywhere: artifact, repo, logs, PR, cache.
- A sheet release shipping unreleased code changes from `main`.
- A forged e-mail leading to anything but a rejection; any e-mail sent by the pipeline.
- A deploy key or push token readable by the model.
- Rules for the sheet written a second time for the pipeline, so they drift from the skills.

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
- The accepted senders: `fara.kurim@seznam.cz` (the parish) and `oplaner4@gmail.com` (the webmaster, who may send a
  DOCX on the parish's behalf), compared exactly (lowercased, dots significant: Seznam does not ignore them), each
  with its own provider's DKIM domain (`seznam.cz`, `gmail.com`).

### Claude authentication (workload identity federation)

The pipeline holds no Anthropic API key: the Claude steps authenticate with GitHub's OIDC token through the Claude
Platform's workload identity federation (the maintainer's preference), which `claude-code-action@v1` supports with its
`anthropic_federation_rule_id`, `anthropic_organization_id`, `anthropic_service_account_id` and
`anthropic_workspace_id` inputs.

- Console (Settings › Workload identity › Connect workload › GitHub Actions): an issuer for
  `https://token.actions.githubusercontent.com`, a service account for the pipeline, and one federation rule.
- The rule matches only this repo's sheet jobs: they run in the GitHub environment `service-sheet-publish`, and the
  rule's `subject_prefix` is exactly `repo:oplaner4@38047115/farakurim@1403139652:environment:service-sheet-publish`
  (GitHub's subject format with the account and repository IDs after the names; no `*`, so no other repo, branch,
  fork PR or recreated repo of the same name matches; only the job with a Claude step has an id-token); audience
  `https://api.anthropic.com`. The narrowest `oauth_scope` that runs Claude Code (`workspace:inference` if it
  suffices) and the rule's token lifetime 3600 s, longer than a run.
- The jobs with a Claude step have `permissions: id-token: write`; the IDs (rule, organization, service account,
  workspace) are repository variables, not secrets: without a token from this repo's `service-sheet-publish` environment
  they grant nothing.
- No `ANTHROPIC_API_KEY` is set anywhere in the workflows: a leftover one, even empty, silently wins over federation.
- A denial is a bare 401; the reason is in the Console's workload identity history.

### Overview

```
fara.kurim@seznam.cz ──DOCX──▶ porad@farakurim.cz
                                  │ daily IMAP poll (≈ 4:40 Prague summer, 3:40 winter)
                                  ▼
 service-sheet.yml   1 mail      accept / reject
                     2 run skill Claude (claude-code-action) runs the service sheet skills unattended:
                                 drafts, fixes and stages the weeks, writes the report
                     3 PR        test, build, commit; PR with the report (a draft PR with blocking questions)
                                 nothing changed → no PR
 service-sheet-fix.yml      @claude comments on that PR → parish-correct-service-sheet on its branch
 service-sheet-release.yml  PR merged → pnpm release --yes → tag → deploy.yml (unchanged)
```

The maintainer answers the PR as they answer the skill locally:

| Locally (Claude Code)                     | In the pipeline                                    |
| ----------------------------------------- | -------------------------------------------------- |
| the skill's summary and questions         | the PR body (from the report, §2)                  |
| "yes"                                     | merge (§7 releases)                                |
| corrections                               | a comment with `@claude` (§6)                      |
| "no, leave it"                            | close the PR without merging: nothing is published |
| a question only the maintainer can answer | the PR opens as a draft until they answer it (§3)  |

### 1. Mail (`scripts/sheet-mail.ts`, logic in `scripts/lib/services/mailbox.ts`)

- Schedule: no GitHub `cron` (it starts runs 4 to 8 hours late): the hosting's cron dispatches the workflow daily at
  04:50 (`docs/hosting.md`), plus `workflow_dispatch` by hand for a
  change that cannot wait. Daily is enough (the maintainer's call).
- Reads unseen messages in INBOX, oldest first. Folders hold the state: a message moves to `Zpracováno` or `Odmítnuto`
  only after its outcome (PR opened or updated, nothing changed, or the problem reported, §5) is done, so a crashed run retries it.
- **Accepted** only when `From` is exactly one of the accepted senders **and** the message carries a valid DKIM
  signature of that sender's domain (`d=seznam.cz` for the parish, `d=gmail.com` for the webmaster), verified by a
  DKIM library on the raw message (the signature is the provider's, made when the sender sends). An
  `Authentication-Results` header is not trusted: the providers no longer receive the mail, and unless the hosting's
  mail server is known to add and strip that header, a forged message can carry its own. Anything else moves to
  `Odmítnuto` with no reply.
- An accepted message with exactly one `.docx` attachment is a sheet. With none or several (a described change in
  the text, a PDF, a reply), it moves to `Odmítnuto` and the run reports it to the maintainer (§5); its text is never
  posted to GitHub.
- When several accepted sheets arrive between runs, only the newest is processed; the older ones move to
  `Zpracováno` as superseded, listed in the run summary.
- The DOCX is written to the runner's temp directory and processed **in the same job**; it is never uploaded as an
  artifact, cached or logged, and is deleted at the end of the job.
- Libraries: `imapflow`, `mailparser` and a DKIM verifier such as `mailauth` (check each with context7 before use, per
  `CLAUDE.md`).

### 2. Run the skills unattended (Claude)

- `anthropics/claude-code-action@v1`, authenticated by workload identity federation (below), latest Claude model, in a job with the repo checked out,
  `pnpm install` done and LibreOffice and poppler installed; the DOCX's path is given in the prompt.
- The prompt is short and holds no sheet rules: the parish sent this DOCX; run `parish-create-service-sheet`
  **unattended** (the skills' own section, below) on the DOCX's **newest week only**. Not in `service-sheets.json`: it
  is created. Already there: it is a **correction**, always: the record is built from the new draft as for a new week,
  without comparing with or starting from the published sheet, and the script replaces the sheet (the next PDF
  revision once the week is released). Corrections matter only for the newest week, typically the current one (the
  parish sends a corrected DOCX on Monday or Tuesday); the script refuses a week before the current sheet anyway. A
  week the script refuses or cannot draft (a document error) goes into the report. Older weeks are never touched.
- **The skills get one section, "Unattended run"**, which both follow when the prompt says so:
  - every "confirm with the user" or "ask the user" step writes into the report instead: the summary the step would
    show (the rows day by day, the announcements with categories and each `newsId` with its event's title and date),
    and each question with an id (`q1`, …)
    and its proposal; a later run keeps the ids and marks each question resolved or still open;
  - a question whose answer changes what is published (an unreadable row, placeholder dots, a doubtful
    cancellation) is **blocking**; the run still stages its best reading, never the placeholder dots (left as they
    are in the report and the PR stays a draft); other questions are notes;
  - the staging runs right after the report (`pnpm stage sheet … --record`, `--corrected` when the script asks for it);
  - `parish-publish-content` is not run: the workflow commits and opens the PR, and nothing is released;
  - it never asks and never waits.
- The report is a file the job reads afterwards (`report.md`: English, site content quoted in Czech, with a first
  line `blocking: yes|no`).
- Tools: Read, Write and Edit only in the job's scratch folder (the checkout denied), and Bash limited to
  `pnpm stage sheet …`, `pdftotext` and read-only commands (`--allowedTools` in `claude_args`). No git, no push, no web. The job's later steps commit and push with the App
  token, which Claude's step never sees.
- **No comparison**: nothing decides whether a resent DOCX differs. A correction of a released week always changes
  `service-sheets.json` (its `rev`), so a PR opens and the maintainer closes it when nothing really changed. Only a
  correction of a week not released yet can leave the file unchanged: then no PR, and the summary says so.

### 3. PR

- At most one open sheet PR: the branch `service-sheet/<date of the e-mail>` with one commit by the bot; a later
  e-mail while it is open runs on that branch and adds a commit (never a force-push), so `service-sheets.json` never
  conflicts between two sheet PRs. Its report accumulates: Claude gets the previous one and keeps the sections of the
  weeks already in the PR, so the body and the title (the `commit:` line, the squash commit on `main`) always describe
  every week the PR holds. Message as `parish-publish-content` says:
  `feat(content): publish the service sheet for 19.–25. 10. 2026`, or `fix(content): correct the service sheet for …`.
- Before the PR: `pnpm test` and `pnpm build` with the calendar key (Superseded by 2026-10-26-content-pr-comment-fixes-design.md § Checks; the pipeline no longer tests or builds,
  `check.yml` does). The staged PDFs are uploaded as an artifact named
  after the PR head commit, retention 30 days (longer than any PR stays open), outside git.
- The body: the report (§2), with "Mirror in the calendar": the week's services, to check against the
  "Bohoslužby" calendar, and a link to the run's PDF artifact. No images (the maintainer's call): the report is what
  the skill shows locally, and the PR diff shows the change to `service-sheets.json`; hosting images would need a
  branch or another store that grows with every run.
- `blocking: yes` opens the PR as a **draft**. GitHub cannot merge a draft, so a blocking question cannot be
  published by mistake: the maintainer answers it (§6) and marks the PR ready.
- Committed with the GitHub App token, so `check.yml` runs on it.
- The App **locks the PR's conversation** right after opening it (the repo is public): on a locked conversation only
  collaborators with write access can comment, the same people who can merge, so only the maintainer (or a reviewer
  they add as a collaborator) can answer or correct the sheet.

### 4. A correction of a released week (example)

The week 19.–25. 10. was released with `2026-10-19-porad-bohosluzeb.pdf`; on Wednesday the parish sends the DOCX with
a funeral added on Friday. The week is the DOCX's newest and already on the site, so Claude treats it as a
correction: it drafts the week, builds the record from the draft, and the script, finding the PDF on the server, asks
for `--corrected` and stages `2026-10-19-porad-bohosluzeb-r2.pdf` with `rev: 2`. The PR
(`fix(content): correct the service sheet for 19.–25. 10. 2026`) shows the change in its diff and the calendar item to
mirror.
The merge releases it (§7); the old PDF stays on the server, the site links the new one. A change that cannot wait is
run by hand (`workflow_dispatch`) or made locally.

### 5. Telling the maintainer (no e-mail)

Everything goes to the maintainer through GitHub (my call on the channel; the maintainer decided no e-mail is sent):

- What concerns a PR (questions, what changed) is in the PR, as §3 says; GitHub notifies the maintainer of new PRs
  and comments.
- Every run writes a job summary listing each message (accepted, rejected, superseded) and its outcome (PR opened or
  updated with its link, nothing changed, refused week, document error with week and day).
- A run **fails** (red, so GitHub notifies the maintainer) when something needs action without a PR: a document error,
  an accepted message without exactly one `.docx`, a refused week. A run with only rejected strangers' mail, or a
  correction that changed nothing, stays green.
- Questions only the parish can answer are questions to the maintainer, who asks the parish as today.
- The repo is public: summaries and logs carry dates, days and error messages, never message text, intentions or the
  sender's other content.

### 6. Comments (`service-sheet-fix.yml`)

Superseded by 2026-10-26-content-pr-comment-fixes-design.md (`content-fix-run.yml`, for both pipelines).

- Triggers: `issue_comment`, `pull_request_review_comment`, `pull_request_review` on PRs whose branch starts with
  `service-sheet/` **and whose head repository is this repo** (a fork can name its branch the same).
- Only comments containing `@claude`, and only from users with write access, the same role that merges: the job
  runs only when the comment's `author_association` is `OWNER`, `MEMBER` or `COLLABORATOR`, and the action's own
  write-access check stays on (never `allowed_non_write_users`). The lock (§3) already keeps others from commenting;
  this filter holds even if a comment gets in (before the lock, or on an unlocked PR).
- Claude's prompt carries only the triggering comment, never the rest of the PR thread.
- `concurrency` per PR, queued, never cancelled.
- The job checks out the branch, downloads the PR's PDF artifact into `uploads/porady_bohosluzeb/`, and runs Claude
  with `parish-correct-service-sheet` unattended, the comment being the user's correction ("a correction the user
  describes"); the source is the staged PDF, as locally when only the record changes. Then the same steps as §3:
  test, build, report, commit, PDF artifact, PR body updated; a reply comment says what changed.
- An answer that settles a question without a change ("@claude q2: correct as is") is recorded in the report; when no
  blocking question is left, the maintainer marks the PR ready.
- A comment asking for a fact the document does not have is made as asked: the maintainer is the one confirming, as
  locally. Claude says in its reply that the site will then differ from the parish's document.
- The maintainer may also push commits to the branch directly; `check.yml` runs on them.

### 7. Release on merge (`service-sheet-release.yml`)

1. Trigger: `pull_request: closed`, merged, branch `service-sheet/*`. Squash merge (the PR title is the commit).
2. Environment `Production` (holds `DEPLOY_SSH_KEY`); `concurrency: release`, queued.
3. Check out `main` (clean, not behind `origin`, as `release.sh` checks). Stop with a PR comment unless **every**
   commit since the last tag is the squash commit of a merged `service-sheet/*` PR ("main has other unreleased
   commits: release by hand"). So two sheet PRs merged close together (a correction and the next week) go out in one
   release; the second job then finds nothing to release and ends green. A draft PR cannot be merged, so open
   blocking questions never reach this job.
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

- A GitHub App installed on this repo only, `contents: write`, `pull-requests: write`. Its key is a secret of the jobs
  that push; never in Claude's step environment. `main` keeps today's rules (no required checks),
  so the maintainer's direct pushes and local `pnpm release` keep working unchanged.
- Environments: `service-sheet-publish` (the IMAP host as a variable, the IMAP user and password and the App key as
  secrets; every job of the sheet workflows runs in it, the federation rule matches it; no required reviewers, `main`
  allowed), `Production` (existing). One environment is enough: Claude writes only in its scratch folder and runs only
  `pnpm stage sheet` and `pdftotext` to stdout, so it cannot run code of its own to reach a secret its step does not
  name.
- Repository variables: the federation IDs (above) and, as today, those for the build. No Anthropic secret.

## Phases

The maintainer's earlier assessment: the full pipeline saves little time and adds upkeep. So it is built in phases,
each useful alone, and stops when one is enough (agreed with the maintainer):

1. **Mail → PR**: the skills' "Unattended run" section, §1–§5. Without the comment workflow (§6) and the release job
   (§7): the maintainer fixes a PR by pushing to its branch (or locally with the skills), merges, then downloads the
   PDF artifact into `uploads/porady_bohosluzeb/` (`gh run download`) and runs `pnpm release` locally.
2. **Full**: §6 and §7.

## Open checks before building

- Workload identity federation from a job in the `service-sheet-publish` environment: the token exchange succeeds
  with the rule above, `workspace:inference` is enough for Claude Code, and the action refreshes the token in a run
  longer than the GitHub identity token's few minutes (the action's docs do not describe it yet).

- An IMAP login to `porad@farakurim.cz` from a GitHub runner works (the hosting may limit IMAP by IP or rate), and
  the folders `Zpracováno` and `Odmítnuto` can be created there.
- A test e-mail from `fara.kurim@seznam.cz` reaches the mailbox with Seznam's DKIM signature (`d=seznam.cz`) intact
  and verifiable (no forwarding or rewriting on the way); another Seznam account cannot send with that `From`.
- claude-code-action loads the project's skills from `.claude/skills/` in agent mode (a custom `prompt`), and
  `--allowedTools` in `claude_args` can limit Bash to the commands in §2; whether its comment mode commits on its own
  (then use agent mode for §6 too and commit in a later step).
- LibreOffice converts the DOCX on `ubuntu-24.04` the way the local run does (`docx-to-pdf.ts`).

## Left to the builder

- The names of the workflows, jobs, the App and the scripts beyond those given here.
- The exact prompt text, the report's layout beyond its first line, the PR body and run summary layout.
- Updating `README.md`, `docs/deployment.md` and the two skills (their "Unattended run" section) to describe the new
  path.
