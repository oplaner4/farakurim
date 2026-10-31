# Content pipelines

How content reaches the site without the local skills: the service sheet and events by e-mail, each as a pull
request, the `@claude` comments that fix such a PR, and the content release its merge starts. The GitHub App,
the repository and the `check` ruleset they rely on are in [github-setup.md](github-setup.md); a release by hand is
in [deployment.md](deployment.md#release).

## Service sheet by e-mail

The parish (or the webmaster) e-mails the year's service sheet DOCX to the service sheet mailbox. Each sender must be
in `SHEET_SENDERS` in `scripts/lib/mail/senders.ts` (the senders every content workflow shares) and carry its
provider's DKIM signature.
`.github/workflows/service-sheet.yml` (on the cron's schedule,
[started by the hosting's cron](hosting.md#starting-the-workflows-on-time), or **Run workflow** by hand) then:

1. reads the unseen mail over IMAP (`pnpm sheet-mail`): only an accepted sender's DKIM-signed message with exactly
   one DOCX is a sheet, any other mail is filed in `Odmítnuto`;
2. lets Claude run the service sheet skills unattended on the DOCX (workload identity federation, no API key): it
   drafts, corrects and stages the weeks and writes a report;
3. commits the change to `src/content/` as the GitHub App's bot (no test or build: [`check.yml`](github-setup.md#checks-on-content-prs)
   checks the PR) and opens (or adds a commit to)
   the one `service-sheet/*` pull request, its body the report (a later run gets the previous report, keeps its weeks
   and question ids, so the body and title describe every week in the PR, and turns it back into a draft on a new
   blocking question). The conversation is locked: only
   collaborators with write access can comment. Every e-mail is about the DOCX's newest week: a new week is created,
   a week already on the site is replaced from the new draft (a correction, never compared with the published sheet),
   so a resend opens a PR you close when nothing changed;
4. files the mail in `Zpracováno` once the outcome is done, so a run that breaks retries the sheet on the next run.

The DOCX (it holds intentions with names) never leaves the `sheet` job: it is not uploaded, cached or logged. Claude's
file tools may write only in the job's scratch folder, never in the checkout. The second job, `publish`, uses the App
key from a fresh checkout and has no id-token, so it cannot act as Claude.

**Answering the PR:** a **squash merge** means yes (the PR title becomes the commit) and releases the site; close
means no, and nothing happens (the branch stays). A **draft** PR has a blocking question in its body: answer it, mark
the PR ready, merge. A correction or a failed check is an [`@claude` comment](#fixing-content-prs-with-comments) in the
PR's conversation, a commit pushed to the PR's branch, or made locally with the skills
(`parish-correct-service-sheet`).

The merge releases the site through the [content release](#content-release). Each run of the sheet workflow uploads
only the PDFs it staged, as the artifact `content-uploads-<sha>` of its commit (the PDFs under `porady_bohosluzeb/`).
An agent never logs in to the mailbox and never runs the dry run below.

The run goes **red** (and its summary says why) on a refused week, a document error, a parish e-mail without exactly
one DOCX, or a failed step. A failed step leaves the mail unseen for the next run.

### Service sheet setup (once)

- **Mailbox** (at the host, [hosting.md](hosting.md#providers)): create a mailbox for the service sheets and note its
  IMAP host (its address is the secret `IMAP_USER` below). The script creates the folders `Zpracováno` and `Odmítnuto` itself.
- **Environment** `service-sheet-publish` (repository Settings → Environments), for both jobs of the sheet workflow:
  variable `IMAP_HOST` (the host name only, as the provider gives it), secrets `IMAP_USER` and `IMAP_PASSWORD`,
  and the variable `ANTHROPIC_FEDERATION_RULE_ID` (Claude Console, below). It may have no required reviewers (the scheduled run would wait), and its deployment branches must allow `main`.

- **GitHub App** (Settings → Developer settings → GitHub Apps), e.g. "Farakurim content": one App for every workflow
  that commits content and opens PRs (a later one for events reuses it), installed on this repository only,
  repository permissions `contents: write` and `pull-requests: write` (the latter also covers locking the PR). Its
  Client ID (the App's page, `Iv23…`, not the numeric App ID) is the repository variable `CONTENT_APP_CLIENT_ID`; a
  generated private key is the **repository** secret
  `CONTENT_APP_PRIVATE_KEY`, shared by the sheet workflow and the release (whose `release` job runs in `Production`).
  GitHub never shows a secret again: to replace a lost key, generate a new one in the App (**Private keys**), store it
  in the secret and delete the old key. If `main` has a ruleset or
  branch protection that restricts who may push (or requires a check, [GitHub setup](github-setup.md)), add the App as a bypass actor of that
  ruleset alone: the release commit and tag are pushed with its token, so that the tag starts `deploy.yml`. A ruleset
  that only blocks force pushes or deletions needs no bypass.
- **Squash merging** allowed (Settings → General → Pull Requests): the release counts only a PR's squash commit.
- **Actions policy** allowing `pull_request_target` (Settings → Actions → Policies → Restrict events), scoped to
  `.github/workflows/content-release.yml`: from 2 December 2026 GitHub blocks the event in public repositories without
  one, and a merge would no longer release the site.
- **Claude Console** (Settings → Workload identity → Connect workload → GitHub Actions): an issuer for
  `https://token.actions.githubusercontent.com`, a service account for the pipeline and one federation rule:
  `subject_prefix` exactly `repo:<owner>@<owner-id>/<repo>@<repo-id>:environment:service-sheet-publish` ([the
  IDs](github-setup.md); for this site `repo:oplaner4@38047115/farakurim@1403139652:environment:service-sheet-publish`;
  no `*`; GitHub's subject carries the account and repository IDs after the names, so a recreated repo of the same
  name does not match; the Console's workload identity History shows the subject a run sent), audience
  `https://api.anthropic.com`, the narrowest scope that runs Claude Code (`workspace:inference` if it suffices), token
  lifetime 3600 s. Then the rule's ID as the variable `ANTHROPIC_FEDERATION_RULE_ID` of the environment
  `service-sheet-publish` (each mail workflow's environment holds its own rule, with no repository-wide fallback), and
  the repository variables `ANTHROPIC_ORGANIZATION_ID`, `ANTHROPIC_SERVICE_ACCOUNT_ID` and `ANTHROPIC_WORKSPACE_ID`,
  shared by both mail workflows. Never set `ANTHROPIC_API_KEY`: a leftover one, even
  empty, wins over federation. A denial is a bare 401; the reason is in the Console's workload identity history.
- **Repository variable** `GOOGLE_CALENDAR_API_KEY` (already set, [GitHub setup](github-setup.md)) for the build in
  `publish`.

### Service sheet first run

The maintainer does this after the setup; an agent never does (it reads the mailbox). Send a test e-mail with the
DOCX from an address in `SHEET_SENDERS` and one from another address, run the workflow by hand,
and check in the run:

- the IMAP login works and both folders exist;
- DKIM is accepted and the stranger's mail is filed in `Odmítnuto`;
- the federation exchange succeeds (on a 401, see the Console's history);
- the skills load and the report is written;
- Claude could not write in the checkout: the log shows its Write and Edit calls only under the scratch folder
  (`…/_temp/sheet/`), and any attempt elsewhere was denied;
- LibreOffice produces the sheet's PDF page;
- the PR is opened and locked, and a draft when the report has a blocking question;
- a second run while the PR is open adds a commit to it, keeps the question ids of the previous report, updates the
  title and turns the PR back into a draft when the new report has a blocking question;
- after you squash merge the PR, the release run uploads its PDF, the tag's deploy run is green, and the PR gets the
  comment "Released in vX.Y.Z" and loses its branch.

## Events by e-mail

An accepted sender e-mails new events to the events mailbox: one of `EVENT_SENDERS` in
`scripts/lib/mail/senders.ts` (the senders every content workflow shares, and more), each with its provider's DKIM
signature. `.github/workflows/events.yml`
(started by the hosting's cron, or **Run workflow** by hand) takes the oldest unread event mail and:

1. reads it (`pnpm event-mail fetch`): the subject, the new text (without a quoted reply or the signature) and the
   attachments a poster can be made from (PDF, PNG, JPG, WebP). A stranger's mail is filed in `Odmítnuto` silently;
   a mail with neither such an attachment nor both a subject and a text is refused;
2. lists the known events (`pnpm event-mail known`): the upcoming ones on `main` and those the open `events/*` PRs
   add;
3. lets Claude run `parish-create-event` unattended ("Unattended run"): it groups the attachments into events (one
   attachment is one event; related ones are one event with its poster and attachments; others it drops, described
   in the report), takes each title from the subject or its poster, fills the text from the attachments, pins only
   when the mail asks for "Doporučujeme", and refuses a **correction** (oprava, změna, posun, přesun, zrušeno, nekoná,
   …: make it with `parish-correct-event` or `parish-cancel-event`) and a **duplicate** of a known event;
4. commits the new events as the GitHub App's bot (no test or build: [`check.yml`](github-setup.md#checks-on-content-prs) checks the
   PR) and opens **one PR per mail** on a branch
   `events/<date>`, its body the report (only what is published is quoted: the PR is public), locked, a draft when
   the report has a blocking question. Its body ends with the [calendar sync](calendar-sync.md) preview's lines
   that need a person (an `ask:` or `cannot pair` line, or that the calendar was not checked), so the reviewer can fix
   Události before the merge releases the site. It refuses an id an open events PR already holds (`pnpm event-mail
check-ids`). The staged files go into the artifact `content-uploads-<sha>`;
5. files the mail in `Zpracováno` once its PR exists, or in `Odmítnuto` when it added nothing.

While accepted mail remains, the run starts the next one, up to 5 runs per start of the cron.

**When you hear of it:** the run fails, so GitHub tells you, when an accepted sender's mail added nothing (every event
refused, or neither an attachment nor a subject and a text), when a known sender's DKIM check failed (a forwarded
mail, a new provider: their address is named), or on a technical failure (the mail stays unread for the next run).
A PR, a draft with a question, or a PR with some events refused (listed in it) leaves the run green: the PR tells
you. Nothing is sent to the senders.

**A mail that fails every run:** the workflow always takes the oldest unread event mail, so a mail that fails for a
reason that does not go away (an id an open PR holds) fails each run and the mails
after it wait. Fix the cause, or move that mail to `Odmítnuto` (or `Zpracováno`) in the mailbox by hand.

**Answering the PR:** as for sheets, a squash merge publishes through the [content release](#content-release), close
means no. Fix an event or a failed check with an [`@claude` comment](#fixing-content-prs-with-comments) in the PR's
conversation, a commit to the PR's branch (the release goes ahead when it links no new file), or the local skills.
Two events PRs that add events at the same place in a month conflict once one is merged: resolve it in GitHub's
editor, or close the PR and send the mail again.

### Events setup (once)

- **Mailbox** (at the host, [hosting.md](hosting.md#providers)): create a mailbox for the events (its address is the
  secret `IMAP_USER` below); the script creates `Zpracováno` and `Odmítnuto`.
- **Environment** `events-publish`, deployment branches allowing `main`, no required reviewers: variable `IMAP_HOST`,
  secrets `IMAP_USER` and `IMAP_PASSWORD` of that mailbox, and the variable `ANTHROPIC_FEDERATION_RULE_ID` of the
  rule below (the sheet's rule is the same variable of `service-sheet-publish`).
- **Claude Console:** a second federation rule for the same service account, `subject_prefix` exactly
  `repo:<owner>@<owner-id>/<repo>@<repo-id>:environment:events-publish` (for this site
  `repo:oplaner4@38047115/farakurim@1403139652:environment:events-publish`), audience `https://api.anthropic.com`,
  the same scope and lifetime as the sheet's rule.
- **Cron:** `cron-scripts/04-50/events.php` is synced by `pnpm release`; the cron of its folder
  ([hosting.md](hosting.md#starting-the-workflows-on-time)) starts it.
- The GitHub App, its key and squash merging are the sheet pipeline's.

### Events first run

The maintainer does this after the setup; an agent never does (it reads the mailbox). Send a poster from an
address in `EVENT_SENDERS`, a mail with two unrelated posters, one with "Oprava" in the subject, and one from another
address, run the workflow by hand, and check: the stranger is filed silently; the poster becomes a PR with the event
and its files; the two posters become two events in one PR; the correction is refused and the run is red; the next
run starts while mail remains; after the merge the content release publishes the event.

## Fixing content PRs with comments

A comment containing `@claude` in the **conversation** of an open content PR (a `service-sheet/*` or `events/*` PR of
this repo) makes Claude correct the PR on its branch. Review comments and inline comments on the diff do nothing: only
conversation comments count (a review comment's run would not be on `main`, so the release would not trust its
files). Comments are **text only**: a file attached to a comment is not read.

| PR     | A comment may                                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| sheets | correct a week the PR holds (services, intentions, announcements; the record only, as the run has no DOCX); answer a question              |
| events | correct an event the PR adds (text, date, time, place, programme, links, its staged files' labels, which is the poster); answer a question |
| both   | fix a [failing check](github-setup.md#checks-on-content-prs) the PR's content causes                                                       |

Anything else (a new, dropped, pinned or split event, a new or replaced file, a week or event the PR does not hold)
changes nothing, and the reply says what to do instead (close the PR, push a commit, run a skill locally, or
`parish-pin-event` after the merge). A fact no document has is made as asked, and the reply says the site will then
differ from the parish's document. An answer to a question ("@claude q2: correct as is") is recorded in the report.

`.github/workflows/content-fix.yml` runs on every new comment (an edited one does not run again): only one from a
commenter with write access (`OWNER`, `MEMBER` or `COLLABORATOR`, and the repo permission `write`, `maintain` or
`admin`), never from a bot. It reacts with 👀, so you see the comment was picked up, and starts
`.github/workflows/content-fix-run.yml`, which runs one comment at a time per PR, the oldest unanswered first:

1. `fix` reads the PR (closed or merged meanwhile: nothing happens), downloads its staged files from the
   `content-uploads-<sha>` artifacts of its commits, the failed `check` run's log and, for events, the known events,
   then lets Claude run `parish-correct-service-sheet` or `parish-correct-event` as a comment run ("Comment run") on
   the PR's head, with the comment and the PR's report as its only input (never the rest of the thread). Its file
   tools write only in the job's scratch folder, as in the mail workflows.
2. `publish` (a fresh checkout, the App key, no id-token) checks the report, applies the change only if it touches
   nothing but the kind's files, commits it as the App's bot with the report's `fix:` message, uploads the files it
   staged as `content-uploads-<sha>` and only then pushes without force (so no pushed commit lacks its files), and
   updates the PR's body (and for events its Události lines) and title; a new blocking question turns the PR back
   into a draft. Before committing it reads the PR again: merged, closed or moved since `fix` read it, nothing is
   pushed. No test or build: [`check.yml`](github-setup.md#checks-on-content-prs) checks the pushed commit.
3. It **replies** on the PR with what changed or why nothing did, and the run's link. Every reply carries a hidden
   marker naming the comment it answers (`<!-- content-fix: <comment id> -->`), so a comment is answered once and a
   later run takes the next unanswered one (up to 10 runs per start).

**Failures:** on a technical failure (Claude's step, a report without its header lines, a change outside the allowed
files) the run is red (GitHub tells you) and the reply says "The fix failed" with the run's link, never the comment's
or a file's content. A failed comment is not retried: write it again. A PR merged, closed or moved meanwhile (a new
sheet mail, your own push), seen before the push or as a rejected push, gets nothing pushed and the reply "The PR
changed or was merged meanwhile: write the comment again if it still applies". A failed upload of the staged files
pushes nothing either. A reply that could not be posted stops the chain, so the comment is not applied again run
after run (the next `@claude` comment starts from the oldest unanswered one, which may be that comment). An expired
artifact (after 30 days) means the PR has to be recreated. A refusal is a reply and a green run.

The run uses the PR head's own scripts and skills, so a PR whose branch was made before this workflow existed gets
only a failure reply: correct it with a commit or locally.

### Comment fixes setup (once)

- **Environment** `content-fix` (repository Settings → Environments), for both jobs of `content-fix-run.yml`:
  deployment branches allowing `main`, no required reviewers, and the variable `ANTHROPIC_FEDERATION_RULE_ID` of the
  rule below. It holds no IMAP login; the App key stays the repository secret `CONTENT_APP_PRIVATE_KEY`.
- **Claude Console:** a third federation rule for the pipelines' service account, `subject_prefix` exactly
  `repo:<owner>@<owner-id>/<repo>@<repo-id>:environment:content-fix` (for this site
  `repo:oplaner4@38047115/farakurim@1403139652:environment:content-fix`), audience `https://api.anthropic.com`, the
  same scope and lifetime as the sheet's rule.
- **The `check` ruleset** on `main` ([GitHub setup](github-setup.md)), so a red PR cannot be merged (the App and the
  repository admin role bypass it).
- The GitHub App, its key and the repository variables `ANTHROPIC_*` are the sheet pipeline's.

## Content release

`.github/workflows/content-release.yml` releases the site when you squash-merge a content PR: a `service-sheet/*` PR of
the [service sheet workflow](#service-sheet-by-e-mail) or an `events/*` PR of the [events workflow](#events-by-e-mail).
It runs on `pull_request_target: closed`, so your own pushes to `main` and `pnpm release` never start it; `pnpm
content-release` plans it. Every merged content PR since the last tag goes out in one release, in merge order: the
release downloads the artifact `content-uploads-<sha>` of every commit of each PR, oldest first, and `pnpm
content-release apply` copies them into the staged `UPLOADS_PATH` (a later correction overwrites an earlier file of the
same path). It first checks each file: a regular file of a type the site links, under its PR's folder
(`porady_bohosluzeb/` for a sheet, `aktuality/` for events); one wrong file stops the release before anything is
uploaded. Then it runs `pnpm release --yes` with the App token, waits for the deploy, comments "Released in vX.Y.Z" with
the PR's page and deletes its branch. The PR's conversation is locked, and not even the App may comment on a locked one,
so each comment unlocks it and locks it again; once the deploy is green, a comment that fails only warns.

Other unreleased commits on `main` go out with the PRs, except those only a release by hand may publish:

- a `feat` commit: a feature goes live when you release it;
- a commit with the `content` scope (`feat(content)`, `fix(content)`): your own content may have staged files only
  on your machine;
- a breaking change (`!`) or a header that is not a Conventional Commit.

A merge commit (a Dependabot PR) is not judged itself; the commits it brings in are. The release publishes nothing and
comments why when:

- `main` has such a commit;
- an artifact expired (they stay 30 days);
- a PR links an uploaded file no artifact holds: a commit you pushed to its branch yourself links a file staged only
  on your machine;
- a commit you pushed to a sheet PR's branch yourself has no artifact: a sheet record links no file (the code names
  its PDF), so its PDF may exist only on your machine;
- a step failed: the comment links the run.

A commit you push to an events PR's branch yourself (a text fix, a conflict resolved in GitHub's editor) goes out
with the PR: the release checks the uploaded-file links the PR adds, in the whole of `src/content/` before and after its squash
commit, against the files the artifacts staged. One limit: a file you stage again by hand under the **same** name an
artifact holds (the same unreleased poster corrected twice) goes out in the artifact's version; fix the text, or close
the PR and send the mail again.

Then release by hand, below (with your corrected files staged in `UPLOADS_PATH` for a commit of your own). Only
artifacts of runs on this repository's `main` count, never one a fork's pull request run uploaded under the same name. A
merge that lands while the release runs goes out with it.

**Releasing by hand:** plan the release on your machine, download the artifacts the plan names and let `apply` check
and stage them, then release. The plan takes only artifacts of runs on `main` (never a fork's of the same name), and
`apply` the files each PR's kind may upload; it stages a blocked plan's artifacts too:

```sh
git switch main && git pull
export GH_TOKEN=$(gh auth token) GITHUB_REPOSITORY=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
tmp=$(mktemp -d)
pnpm --silent content-release > "$tmp/plan.json"
jq . "$tmp/plan.json"
jq -r '.pulls[]?.artifacts[] | "\(.runId) \(.name)"' "$tmp/plan.json" | while read -r run name; do
  gh run download "$run" -n "$name" -D "$tmp/$name"
done
pnpm content-release apply "$tmp/plan.json" "$tmp"
pnpm release
```

An expired artifact is missing from the plan, and a commit you pushed yourself has none: stage their files with the
skill before `apply`, which checks that every file the PRs link is staged.
