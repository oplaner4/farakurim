# Deployment

How the site gets to https://farakurim.cz/: releases, the weekly refresh, the GitHub setup and the server. An agent
releases with the `farnost-release` skill; the rules it must never break are in `CLAUDE.md` § Deployment.

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

**`pnpm release --local`** deploys from this machine instead, e.g. when GitHub Actions is down. It needs
`.env.local` with all three keys ([README § Keys](../README.md#keys-in-envlocal-optional)). It runs the full check
and a release build, shows what the sync will add, change and delete, and after the yes uploads the new files, checks
that every linked `/uploads/…` file is on the server, syncs `out/` and verifies the live site before it tags. Its
release commit carries the trailer `Release-Deploy: local`, so the workflow does not deploy that tag again.

## Weekly refresh

What depends on the date (the © year, the prerendered calendars, the next mass for visitors without JS) ages with the
build. So the deploy workflow also runs daily and **refreshes** the latest release tag on `main` once the last deploy
is 7 days old: it checks, builds and deploys that tag like a release (a `--local` one too). A refresh publishes
nothing that was not released, so it needs no yes. On a day it is not due, the run ends green after a few seconds with
the `check` and `deploy` jobs skipped.

To refresh now, run the workflow by hand: Actions tab → Deploy → **Run workflow** on `main`; a manual run skips the
7-day check. GitHub pauses scheduled workflows after 60 days without activity in the repository: re-enable it in the
Actions tab.

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
changes and release commits. The deploy workflow calls it for the tag, so a release runs the same check before it
builds with the variables above.

## Server

The server details (SSH target, web root, rsync flags, server-only folders, verify checks) live only in
`scripts/deploy.sh`, used by both the workflow and `pnpm release`. Its commands (`uploads`, `pull-uploads`,
`check-uploads`, `out`, `verify`, with `--dry-run` where it changes the server) also work on their own.

- The sync deletes files that are no longer in `out/`, except four folders that live only on the server: `/uploads/`,
  `/nahrane/` (the old site's uploads), `/virtualni_prohlidka/` (the old site's virtual tour) and `/cache/` (the last
  vira.cz verse).
- Old `_next/static/` chunks stay 30 days, so a page opened before a release still loads the chunks it asks for later.
  Pages and their `*.txt` payloads are sent with `Cache-Control: no-cache`, so a visit after a release never gets an
  old page whose chunks are gone.
- `trailingSlash: true` produces `page/index.html`, so Apache serves the pages without rewrite rules;
  `public/.htaccess` serves `404.html` for missing URLs and redirects the old URLs that moved.
