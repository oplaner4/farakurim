# Deployment

How the site gets to https://farakurim.cz/: releases, the weekly refresh, the GitHub setup, the service sheet by
e-mail and the server. An agent releases with the `parish-release` skill; the rules it must never break are in
`CLAUDE.md` § Deployment.

The site is deployed to the host's web root with rsync over SSH; the host and its provider-specific setup are in
[hosting.md](hosting.md).

## Release

`pnpm release` (`scripts/release.sh`, from a clean `main` that is not behind `origin`):

1. shows the commits since the last tag, the next version (minor when a `feat` outside the `content` scope is among
   them, patch otherwise, `--major` on request), the new files in `uploads/` and the changes the
   [calendar sync](#události-calendar-sync) will make, and asks (the yes covers them);
2. uploads those files into `/uploads/` (they are not in git, so this runs from the machine that staged them);
3. bumps the version (commit `chore(release): vX.Y.Z` and the tag `vX.Y.Z`) and pushes `main` with the tag.

The tag starts `.github/workflows/deploy.yml`, which checks and builds the tagged commit, deploys `out/` and then
applies the calendar sync. The tag must match `version` in `package.json` and point to a commit on `main`. A failed
release is fixed in a new commit and released again; a pushed tag is never moved.

**`pnpm release --local`** deploys from this machine instead, e.g. when GitHub Actions is down. It needs `.env.local`
with all three keys ([README § Keys](../README.md#keys-in-envlocal-optional)). It runs the full check (with the site's
tests only: the content tooling's tests in `scripts/` guard nothing in `out/`) and a release build, shows what the sync
will add, change and delete, and after the yes uploads the new files, checks that every linked `/uploads/…` file is on
the server, syncs `out/` and verifies the live site before it tags. Its release commit carries the trailer
`Release-Deploy: local`, so the workflow does not deploy that tag again. After the verify it applies the calendar sync
when `GOOGLE_CALENDAR_SERVICE_ACCOUNT` is set in the environment or in `.env.local` (a failure only warns), and
otherwise says it did not.

## Weekly refresh

What depends on the date (the © year, the prerendered calendars, the next mass for visitors without JS) ages with the
build. So the deploy workflow also runs on the cron's schedule
([started by the hosting's cron](hosting.md#starting-the-workflows-on-time)) and **refreshes** the latest
release tag on `main` once the last deploy is 7 days old: it checks, builds and deploys that tag like a release (a
`--local` one too). A refresh publishes nothing that was not released, so it needs no yes. When it is not due,
the run ends green after a few seconds with the `check` and `deploy` jobs skipped.

To refresh now, run the workflow by hand: Actions tab → Deploy → **Run workflow** on `main` with `refresh` left at
`now`, which skips the 7-day check (the cron sends `due`).

## GitHub setup

- **Repository**: the workflows and scripts read the repository from GitHub (`GITHUB_REPOSITORY`), so the setup
  works in any repository. Two places name it and must match the repository the site runs from: `GITHUB_REPOSITORY`
  in `cron-scripts/github.inc.php` ([hosting.md](hosting.md#starting-the-workflows-on-time)) and the Claude Console
  federation rules ([below](#setup-once)), which also need the owner's and the repository's numeric IDs
  (`gh api repos/<owner>/<repo> --jq '"\(.owner.id) \(.id)"'`). This site's: `oplaner4/farakurim`, owner ID
  `38047115`, repository ID `1403139652`.
- **`Production` environment**: the secret `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS` (secret or variable) and optionally
  the variable `CHECK_UPLOADS=false`, which skips the check that every `/uploads/…` file the build links is on the
  server.
- **Its deployment branches and tags** must allow the tags `v*` (releases) **and the branch `main`**: the scheduled and
  manual refreshes run on `main`, and without it GitHub rejects their `deploy` job ("Branch "main" is not allowed to
  deploy to Production").
- **Repository variables** `GOOGLE_CALENDAR_API_KEY`, `MATOMO_URL` and `MATOMO_SITE_ID` for the build (the build job
  has no environment).

`.github/workflows/check.yml` checks and builds pushes to `main` and pull requests with no secrets, skipping docs-only
changes and release commits. The deploy workflow calls it for the tag, so a release runs the same check (with the site's
tests only) before it builds with the variables above.

## Události calendar sync

`pnpm calendar-sync` keeps the "Události" Google Calendar in line with the event records
(`scripts/calendar-sync.ts`); its preview needs only the browser key, `--apply` writes and needs the service account.
Only a release applies it, after the site is deployed (so every URL it writes is a live page):

- **`pnpm release`** prints the preview with the commits, so the yes covers it. Without the key, or when Google does
  not answer, it says the calendar was not checked and goes on.
- **The `calendar` job of `deploy.yml`** runs after `deploy` (and its verify). On a release tag push, with the
  repository variable `CALENDAR_SYNC` set to `true`, it runs `pnpm calendar-sync --apply`; otherwise (a refresh, or the
  variable not yet `true`) it only writes the preview into the run summary. A failure ends as a warning and does not
  mark the release failed: the next release catches up. It skips a `--local` release, which applies the sync itself.
- **`pnpm release --local`** applies it after its deploy and verify, with the key in `.env.local`.

The job runs in its own environment `calendar-sync`, never `Production`: the refresh counts the Production deployments
to find the last deploy, and the service account key stays out of the job that builds the site.

### Setup (once)

- **Environment** `calendar-sync`, deployment branches and tags allowing the tags `v*` (a refresh runs on `main` and
  only previews, so it needs `main` too), with the secret `GOOGLE_CALENDAR_SERVICE_ACCOUNT` (the service account's JSON
  key). No required reviewers.
- **Service account**, by the maintainer: create it in the Google Cloud project that holds the browser key, and a JSON
  key for it. Share Události (owned by the parish's personal Gmail account) with the service account's e-mail address
  with the permission "Make changes to events". Put the JSON (or a path to it) in `.env.local` as
  `GOOGLE_CALENDAR_SERVICE_ACCOUNT` and its text in the environment's secret. Never commit it or print it.
- **First apply by hand**, before the workflow applies anything: every event that already links a calendar event is
  brought in line on the first apply (titles, times, places and descriptions written by hand change to the records').
  Read the whole list with `pnpm calendar-sync`, then run `pnpm calendar-sync --apply` (or `pnpm release --local`), and
  only then set the repository variable `CALENDAR_SYNC` to `true`. A merged content PR never makes the first apply.

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
3. tests and builds the change to `src/content/`, commits it as the GitHub App's bot and opens (or adds a commit to)
   the one `service-sheet/*` pull request, its body the report (a later run gets the previous report, keeps its weeks
   and question ids, so the body and title describe every week in the PR, and turns it back into a draft on a new
   blocking question), followed by the mirror list (`pnpm sheet-mirror`: each day's services of the weeks the PR
   adds or changes, to check against the "Bohoslužby" calendar). The conversation is locked: only
   collaborators with write access can comment. Every e-mail is about the DOCX's newest week: a new week is created,
   a week already on the site is replaced from the new draft (a correction, never compared with the published sheet),
   so a resend opens a PR you close when nothing changed;
4. files the mail in `Zpracováno` once the outcome is done, so a run that breaks retries the sheet on the next run.

The DOCX (it holds intentions with names) never leaves the `sheet` job: it is not uploaded, cached or logged. Claude's
file tools may write only in the job's scratch folder, never in the checkout. The second job, `publish`, uses the App
key from a fresh checkout and has no id-token, so it cannot act as Claude.

**Answering the PR:** a **squash merge** means yes (the PR title becomes the commit) and releases the site; close
means no, and nothing happens (the branch stays). A **draft** PR has a blocking question in its body: answer it, mark
the PR ready, merge. A correction is a commit pushed to the PR's branch, or made locally with the skills
(`parish-correct-service-sheet`); comments with `@claude` come in phase 2.

The merge releases the site through the [content release](#content-release). Each run of the sheet workflow uploads
only the PDFs it staged, as the artifact `content-uploads-<sha>` of its commit (the PDFs under `porady_bohosluzeb/`).
An agent never logs in to the mailbox and never runs the dry run below.

The run goes **red** (and its summary says why) on a refused week, a document error, a parish e-mail without exactly
one DOCX, or a failed step. A failed step leaves the mail unseen for the next run.

### Setup (once)

- **Mailbox** (at the host, [hosting.md](hosting.md#providers)): create a mailbox for the service sheets and note its
  IMAP host (its address is the secret `IMAP_USER` below). The script creates the folders `Zpracováno` and `Odmítnuto` itself.
- **Environment** `service-sheet-publish` (repository Settings → Environments), for both jobs of the sheet workflow:
  variable `IMAP_HOST` (the host name only, as the provider gives it), secrets `IMAP_USER` and `IMAP_PASSWORD`,
  and the variable `ANTHROPIC_FEDERATION_RULE_ID` (Claude Console, below). It may have no required reviewers (the scheduled run would wait), and its deployment branches must allow `main`.

- **GitHub App** (Settings → Developer settings → GitHub Apps), e.g. "Farakurim content": one App for every workflow
  that commits content and opens PRs (a later one for events reuses it), installed on this repository only,
  repository permissions `contents: write` and `pull-requests: write` (the latter also covers locking the PR). Its ID
  is the repository variable `CONTENT_APP_ID`; a generated private key is the **repository** secret
  `CONTENT_APP_PRIVATE_KEY`, shared by the sheet workflow and the release (whose `release` job runs in `Production`).
  GitHub never shows a secret again: to replace a lost key, generate a new one in the App (**Private keys**), store it
  in the secret and delete the old key. If `main` has a ruleset or
  branch protection that restricts pushes, add the App as a bypass actor: the release commit and tag are pushed with
  its token, so that the tag starts `deploy.yml`.
- **Squash merging** allowed (Settings → General → Pull Requests): the release counts only a PR's squash commit.
- **Claude Console** (Settings → Workload identity → Connect workload → GitHub Actions): an issuer for
  `https://token.actions.githubusercontent.com`, a service account for the pipeline and one federation rule:
  `subject_prefix` exactly `repo:<owner>@<owner-id>/<repo>@<repo-id>:environment:service-sheet-publish` ([the
  IDs](#github-setup); for this site `repo:oplaner4@38047115/farakurim@1403139652:environment:service-sheet-publish`;
  no `*`; GitHub's subject carries the account and repository IDs after the names, so a recreated repo of the same
  name does not match; the Console's workload identity History shows the subject a run sent), audience
  `https://api.anthropic.com`, the narrowest scope that runs Claude Code (`workspace:inference` if it suffices), token
  lifetime 3600 s. Then the rule's ID as the variable `ANTHROPIC_FEDERATION_RULE_ID` of the environment
  `service-sheet-publish` (each mail workflow's environment holds its own rule, with no repository-wide fallback), and
  the repository variables `ANTHROPIC_ORGANIZATION_ID`, `ANTHROPIC_SERVICE_ACCOUNT_ID` and `ANTHROPIC_WORKSPACE_ID`,
  shared by both mail workflows. Never set `ANTHROPIC_API_KEY`: a leftover one, even
  empty, wins over federation. A denial is a bare 401; the reason is in the Console's workload identity history.
- **Repository variable** `GOOGLE_CALENDAR_API_KEY` (already set, [GitHub setup](#github-setup)) for the build in
  `publish`.

### First run

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
4. tests and builds the new events, commits them as the GitHub App's bot and opens **one PR per mail** on a branch
   `events/<date>`, its body the report (only what is published is quoted: the PR is public), locked, a draft when
   the report has a blocking question. It refuses an id an open events PR already holds (`pnpm event-mail
check-ids`). The staged files go into the artifact `content-uploads-<sha>`;
5. files the mail in `Zpracováno` once its PR exists, or in `Odmítnuto` when it added nothing.

While accepted mail remains, the run starts the next one, up to 5 runs per start of the cron.

**When you hear of it:** the run fails, so GitHub tells you, when an accepted sender's mail added nothing (every event
refused, or neither an attachment nor a subject and a text), when a known sender's DKIM check failed (a forwarded
mail, a new provider: their address is named), or on a technical failure (the mail stays unread for the next run).
A PR, a draft with a question, or a PR with some events refused (listed in it) leaves the run green: the PR tells
you. Nothing is sent to the senders.

**A mail that fails every run:** the workflow always takes the oldest unread event mail, so a mail that fails for a
reason that does not go away (an id an open PR holds, a `main` that does not build) fails each run and the mails
after it wait. Fix the cause, or move that mail to `Odmítnuto` (or `Zpracováno`) in the mailbox by hand.

**Answering the PR:** as for sheets, a squash merge publishes through the [content release](#content-release), close
means no. Fix an event with a commit to the PR's branch (the release goes ahead when it links no new file), or with
the local skills. Two events PRs that add events at the same place in a month conflict once one is merged: resolve
it in GitHub's editor, or close the PR and send the mail again.

### Setup (once)

- **Mailbox** (at the host, [hosting.md](hosting.md#providers)): create a mailbox for the events (its address is the
  secret `IMAP_USER` below); the script creates `Zpracováno` and `Odmítnuto`.
- **Environment** `events-publish`, deployment branches allowing `main`, no required reviewers: variable `IMAP_HOST`,
  secrets `IMAP_USER` and `IMAP_PASSWORD` of that mailbox, and the variable `ANTHROPIC_FEDERATION_RULE_ID` of the
  rule below (the sheet's rule is the same variable of `service-sheet-publish`).
- **Claude Console:** a second federation rule for the same service account, `subject_prefix` exactly
  `repo:<owner>@<owner-id>/<repo>@<repo-id>:environment:events-publish` (for this site
  `repo:oplaner4@38047115/farakurim@1403139652:environment:events-publish`), audience `https://api.anthropic.com`,
  the same scope and lifetime as the sheet's rule.
- **Cron:** `cron-scripts/events.php` is synced by `pnpm release`; the cron that runs `CRON_DIR`
  ([hosting.md](hosting.md#starting-the-workflows-on-time)) starts it.
- The GitHub App, its key and squash merging are the sheet pipeline's.

### First run

The maintainer does this after the setup; an agent never does (it reads the mailbox). Send a poster from an
address in `EVENT_SENDERS`, a mail with two unrelated posters, one with "Oprava" in the subject, and one from another
address, run the workflow by hand, and check: the stranger is filed silently; the poster becomes a PR with the event
and its files; the two posters become two events in one PR; the correction is refused and the run is red; the next
run starts while mail remains; after the merge the content release publishes the event.

## Content release

`.github/workflows/content-release.yml` releases the site when you squash-merge a content PR: a `service-sheet/*` PR of
the [service sheet workflow](#service-sheet-by-e-mail) or an `events/*` PR of the [events workflow](#events-by-e-mail). It runs on
`pull_request_target: closed`, so your own pushes to `main` and `pnpm release` never start it; `pnpm content-release`
plans it. Every merged content PR since the last tag goes out in one release, in merge order: the release downloads
the artifact `content-uploads-<sha>` of every commit of each PR, oldest first, and `pnpm content-release apply`
copies them into `uploads/` (a later correction overwrites an earlier file of the same path). It first checks each
file: a regular file of a type the site links, under its PR's folder (`porady_bohosluzeb/` for a sheet, `aktuality/`
for events); one wrong file stops the release before anything is uploaded. Then it runs `pnpm release --yes` with the
App token, waits for the deploy, comments "Released in vX.Y.Z" with the PR's page and deletes its branch.

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

Then release by hand, below (with your corrected files staged in `uploads/` for a commit of your own). Only artifacts
of runs on this repository's `main` count, never one a fork's pull request run uploaded under the same name. A merge
that lands while the release runs goes out with it.

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

## Server

The server details (SSH target, web root, rsync flags, server-only folders, verify checks) live only in
`scripts/deploy.sh`, used by both the workflow and `pnpm release`. Its commands (`uploads`, `pull-uploads`,
`check-uploads`, `out`, `cron`, `verify`, with `--dry-run` where it changes the server) also work on their own.

### SSH access

`scripts/deploy.sh` runs `ssh` and `rsync` against its `SSH_TARGET` with this machine's SSH key, several times per
release, so the machine that releases needs, once:

1. **rsync** next to ssh (on Windows, Git Bash ships ssh but not rsync: add rsync to it, e.g. from MSYS2).
2. **A key pair** (`ssh-keygen -t ed25519`) whose public key is added to the hosting account's authorized SSH keys
   (in the hosting's administration). A key with a passphrase goes into `ssh-agent`, or every connection asks.
3. **The server's host key** in `~/.ssh/known_hosts`: connect once with `ssh <SSH_TARGET> exit` and accept it after
   checking the fingerprint against the hosting's.

Then `pnpm pull-uploads` (it only downloads) shows that the access works. GitHub Actions uses its own key and host
key (`DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, [GitHub setup](#github-setup)), not this machine's.

### What the sync keeps

- The sync deletes files that are no longer in `out/`, except four folders that live only on the server: `/uploads/`,
  `/nahrane/` (the old site's uploads), `/virtualni_prohlidka/` (the old site's virtual tour) and `/cache/` (the last
  vira.cz verse).
- Old `_next/static/` chunks stay 30 days, so a page opened before a release still loads the chunks it asks for later.
  Pages and their `*.txt` payloads are sent with `Cache-Control: no-cache`, so a visit after a release never gets an
  old page whose chunks are gone.
- `trailingSlash: true` produces `page/index.html`, so Apache serves the pages without rewrite rules;
  `public/.htaccess` serves `404.html` for missing URLs and redirects the old URLs that moved.
