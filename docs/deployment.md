# Deployment

How the site gets to https://farakurim.cz/: releases, the weekly refresh, the GitHub setup, the service sheet by
e-mail and the server. An agent releases with the `parish-release` skill; the rules it must never break are in
`CLAUDE.md` § Deployment.

The site is deployed to the web root `/farakurim.cz/` with rsync over SSH. The old PHP site is backed up in
`/stary.farakurim.cz/` on the server.

## Release

`pnpm release` (`scripts/release.sh`, from a clean `main` that is not behind `origin`):

1. shows the commits since the last tag, the next version (minor when a `feat` outside the `content` scope is among
   them, patch otherwise, `--major` on request) and the new files in `uploads/`, and asks;
2. uploads those files into `/uploads/` (they are not in git, so this runs from the machine that staged them);
3. bumps the version (commit `chore(release): vX.Y.Z` and the tag `vX.Y.Z`) and pushes `main` with the tag.

The tag starts `.github/workflows/deploy.yml`, which checks and builds the tagged commit and deploys `out/`. The tag
must match `version` in `package.json` and point to a commit on `main`. A failed release is fixed in a new commit and
released again; a pushed tag is never moved.

**`pnpm release --local`** deploys from this machine instead, e.g. when GitHub Actions is down. It needs `.env.local`
with all three keys ([README § Keys](../README.md#keys-in-envlocal-optional)). It runs the full check (with the site's
tests only: the content tooling's tests in `scripts/` guard nothing in `out/`) and a release build, shows what the sync
will add, change and delete, and after the yes uploads the new files, checks that every linked `/uploads/…` file is on
the server, syncs `out/` and verifies the live site before it tags. Its release commit carries the trailer
`Release-Deploy: local`, so the workflow does not deploy that tag again.

## Weekly refresh

What depends on the date (the © year, the prerendered calendars, the next mass for visitors without JS) ages with the
build. So the deploy workflow also runs daily (at 04:50,
[started by the hosting's cron](hosting.md#starting-the-workflows-on-time)) and **refreshes** the latest
release tag on `main` once the last deploy is 7 days old: it checks, builds and deploys that tag like a release (a
`--local` one too). A refresh publishes nothing that was not released, so it needs no yes. On a day it is not due,
the run ends green after a few seconds with the `check` and `deploy` jobs skipped.

To refresh now, run the workflow by hand: Actions tab → Deploy → **Run workflow** on `main` with `refresh` left at
`now`, which skips the 7-day check (the cron sends `due`).

## GitHub setup

- **`Production` environment**: the secret `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS` (secret or variable) and optionally
  the variable `CHECK_UPLOADS=false`, which skips the check that every `/uploads/…` file the build links is on the
  server.
- **Its deployment branches and tags** must allow the tags `v*` (releases) **and the branch `main`**: the daily and
  manual refreshes run on `main`, and without it GitHub rejects their `deploy` job ("Branch "main" is not allowed to
  deploy to Production").
- **Repository variables** `GOOGLE_CALENDAR_API_KEY`, `MATOMO_URL` and `MATOMO_SITE_ID` for the build (the build job
  has no environment).

`.github/workflows/check.yml` checks and builds pushes to `main` and pull requests with no secrets, skipping docs-only
changes and release commits. The deploy workflow calls it for the tag, so a release runs the same check (with the site's
tests only) before it builds with the variables above.

## Service sheet by e-mail

The parish e-mails the year's service sheet DOCX from `fara.kurim@seznam.cz` (or the webmaster from
`oplaner4@gmail.com`) to `porad@farakurim.cz`. Each sender must carry its provider's DKIM signature (seznam.cz,
gmail.com); the list is `SENDERS` in `scripts/lib/services/mailbox.ts`.
`.github/workflows/service-sheet.yml` (daily at 04:50,
[started by the hosting's cron](hosting.md#starting-the-workflows-on-time), or **Run workflow** by hand) then:

1. reads the unseen mail over IMAP (`pnpm sheet-mail`): only an accepted sender's DKIM-signed message with exactly
   one DOCX is a sheet, any other mail is filed in `Odmítnuto`;
2. lets Claude run the service sheet skills unattended on the DOCX (workload identity federation, no API key): it
   drafts, corrects and stages the weeks and writes a report;
3. tests and builds the change to `src/content/`, commits it as the GitHub App's bot and opens (or adds a commit to)
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
the PR ready, merge. A correction is a commit pushed to the PR's branch, or made locally with the skills
(`parish-correct-service-sheet`); comments with `@claude` come in phase 2.

The merge starts `.github/workflows/service-sheet-release.yml` (on the push to `main`; `pnpm sheet-release` plans
it). Each run of the sheet workflow uploads only the PDFs it staged, as the artifact `service-sheet-pdf-<sha>` of its
commit, so the release downloads the artifact of every commit of the PR, oldest first (a later correction overwrites
an earlier PDF of the same name), runs `pnpm release --yes` with the App token, waits for the deploy and comments
"Released in vX.Y.Z" on the PR and deletes its branch. Two PRs merged close together go out in one release. It
releases nothing and comments why when:

- `main` has other unreleased commits (an event, a Petrklíč issue: their uploads are only on your machine), or a PDF
  artifact expired (they stay 30 days): release by hand, below;
- `main` moved while it ran, or a step failed: the comment links the run.

A commit you pushed to the branch yourself has no artifact, so its PDF is not uploaded: `deploy.yml` then stops at
`check-uploads` with the live site untouched. Stage the PDF in `uploads/`, upload it with `scripts/deploy.sh uploads`
(`pnpm release` would stop at "Nothing to release" first) and re-run the failed deploy run.

**Releasing by hand:** download the artifact of every commit of the PR, oldest first, then release:

```sh
git switch main && git pull
pr=<PR number>
tmp=$(mktemp -d)
for sha in $(gh pr view "$pr" --json commits --jq '.commits[].oid'); do
  if gh run download -n "service-sheet-pdf-$sha" -D "$tmp/$sha"; then
    cp "$tmp/$sha"/*.pdf uploads/porady_bohosluzeb/
  else
    echo "No PDF artifact for $sha (a commit the workflow did not make)."
  fi
done
pnpm release
```

`gh run download -n <name>` without a run id searches the repository's runs; the names are unique, as each holds its
commit. A PDF artifact stays 30 days. A commit you pushed yourself has no artifact: stage its PDF with the skill. An
agent never logs in to the mailbox and never runs the dry run below.

The run goes **red** (and its summary says why) on a refused week, a document error, a parish e-mail without exactly
one DOCX, or a failed step. A failed step leaves the mail unseen for the next run.

### Setup (once)

- **Mailbox** (cesky-hosting.cz administration): create `porad@farakurim.cz` and note its IMAP host. The script
  creates the folders `Zpracováno` and `Odmítnuto` itself.
- **Environment** `service-sheet-publish` (repository Settings → Environments), for both jobs of the sheet workflow:
  variable `IMAP_HOST` (the host name only, e.g. `mail.cesky-hosting.cz`), secrets `IMAP_USER` and `IMAP_PASSWORD`.
  It may have no required reviewers (the daily run would wait), and its deployment branches must allow `main`.

- **GitHub App** (Settings → Developer settings → GitHub Apps), installed on this repository only, repository
  permissions `contents: write` and `pull-requests: write` (the latter also covers locking the PR). Its ID is the
  repository variable `SHEET_APP_ID`; a generated private key is the **repository** secret `SHEET_APP_PRIVATE_KEY`,
  shared by the sheet workflow and the release (whose `release` job runs in `Production`). If `main` has a ruleset or
  branch protection that restricts pushes, add the App as a bypass actor: the release commit and tag are pushed with
  its token, so that the tag starts `deploy.yml`.
- **Squash merging** allowed (Settings → General → Pull Requests): the release counts only a PR's squash commit.
- **Claude Console** (Settings → Workload identity → Connect workload → GitHub Actions): an issuer for
  `https://token.actions.githubusercontent.com`, a service account for the pipeline and one federation rule:
  `subject_prefix` exactly `repo:oplaner4@38047115/farakurim@1403139652:environment:service-sheet-publish` (no `*`;
  GitHub's subject carries the account and repository IDs after the names, so a recreated repo of the same name does
  not match; the Console's workload identity History shows the subject a run sent), audience
  `https://api.anthropic.com`, the narrowest scope that runs Claude Code (`workspace:inference` if it suffices), token
  lifetime 3600 s. Then the repository variables `ANTHROPIC_FEDERATION_RULE_ID`, `ANTHROPIC_ORGANIZATION_ID`,
  `ANTHROPIC_SERVICE_ACCOUNT_ID` and `ANTHROPIC_WORKSPACE_ID`. Never set `ANTHROPIC_API_KEY`: a leftover one, even
  empty, wins over federation. A denial is a bare 401; the reason is in the Console's workload identity history.
- **Repository variable** `GOOGLE_CALENDAR_API_KEY` (already set, [GitHub setup](#github-setup)) for the build in
  `publish`.

### First run

The maintainer does this after the setup; an agent never does (it reads the mailbox). Send a test e-mail with the
DOCX from `fara.kurim@seznam.cz` (or `oplaner4@gmail.com`) and one from another address, run the workflow by hand,
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
