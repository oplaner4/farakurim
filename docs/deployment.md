# Deployment

How the site gets to https://farakurim.cz/: releases, the weekly refresh and the server. An agent releases with the
`parish-release` skill; the rules it must never break are in `CLAUDE.md` § Deployment.

The site is deployed to the host's web root with rsync over SSH; the host and its provider-specific setup are in
[hosting.md](hosting.md). Uploaded files are served under `UPLOADS_PATH` (`src/lib/shared/uploads.ts`, e.g.
`/uploads/`) and staged in the repo's folder of the same name; `scripts/deploy.sh` takes its server folder from it.

The rest has its own guide:

- [github-setup.md](github-setup.md): the repository, the `Production` environment, the variables, the `check`
  ruleset on `main` and the checks on content PRs;
- [calendar-sync.md](calendar-sync.md): the Události and Bohoslužby calendars a release brings in line, and their
  setup;
- [content-pipelines.md](content-pipelines.md): the service sheet and events by e-mail, fixing their PRs with
  `@claude` comments, and the content release their merge starts (and how to release one by hand).

## Release

`pnpm release` (`scripts/release.sh`, from a clean `main` that is not behind `origin`):

1. shows the commits since the last tag, the next version (minor when a `feat` outside the `content` scope is among
   them, patch otherwise, `--major` on request), the new files staged in `UPLOADS_PATH` and the changes the
   [calendar sync](calendar-sync.md) will make, and asks (the yes covers them);
2. uploads those files into `UPLOADS_PATH` on the server (they are not in git, so this runs from the machine that
   staged them);
3. bumps the version (commit `chore(release): vX.Y.Z` and the tag `vX.Y.Z`) and pushes `main` with the tag.

The tag starts `.github/workflows/deploy.yml`, which checks and builds the tagged commit, deploys `out/` and then
applies the calendar sync. The tag must match `version` in `package.json` and point to a commit on `main`. A failed
release is fixed in a new commit and released again; a pushed tag is never moved.

**`pnpm release --local`** deploys from this machine instead, e.g. when GitHub Actions is down. It needs `.env.local`
with all three keys ([README § Keys](../README.md#keys-in-envlocal-optional)). It runs the full check (with the site's
tests only: the content tooling's tests in `scripts/` guard nothing in `out/`) and a release build, shows what the sync
will add, change and delete, and after the yes uploads the new files, checks that every linked `UPLOADS_PATH` file is on
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
key (`DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, [GitHub setup](github-setup.md)), not this machine's.

### What the sync keeps

- The sync deletes files that are no longer in `out/`, except four folders that live only on the server: `UPLOADS_PATH`,
  `/nahrane/` (the old site's uploads), `/virtualni_prohlidka/` (the old site's virtual tour) and `/cache/` (the last
  vira.cz verse).
- Old `_next/static/` chunks stay 30 days, so a page opened before a release still loads the chunks it asks for later.
  Pages and their `*.txt` payloads are sent with `Cache-Control: no-cache`, so a visit after a release never gets an
  old page whose chunks are gone.
- `trailingSlash: true` produces `page/index.html`, so Apache serves the pages without rewrite rules;
  `public/.htaccess` serves `404.html` for missing URLs and redirects the old URLs that moved.
