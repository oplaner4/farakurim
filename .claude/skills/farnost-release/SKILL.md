---
name: farnost-release
description: Release the new farakurim.cz site with `pnpm release` - preview the commits, version and staged uploads, ask the user for an explicit yes, then upload uploads/, tag vX.Y.Z and push, so GitHub Actions checks, builds and deploys out/ to farakurim.cz (or, with --local when Actions is down, check, build and deploy from this machine). Use at the end of farnost-publish-content, or whenever the user asks to deploy, release, upload, publish to the server or sync the site.
---

# Release the site

`pnpm release` (`scripts/release.sh`) does the release: it uploads the staged files, tags and pushes, and GitHub
Actions (`.github/workflows/deploy.yml`) checks, builds and deploys the tag. `pnpm release --local` deploys from this
machine instead. The server details (SSH target, web root `/farakurim.cz/`, rsync flags, the server-only folders
`/uploads/`, `/nahrane/`, `/virtualni_prohlidka/`, `/cache/`, the verify checks) live in `scripts/deploy.sh`, which
both use. Change them there, nowhere else.

## Release

1. **Preview:** run `pnpm release`. Without a terminal it only previews: it checks the tree is clean, on `main` and
   not behind `origin/main`, lists the commits since the last tag, picks the version (minor for a `feat` outside the
   `content` scope, patch otherwise) and lists the new files for `/uploads/` (rsync dry run). If it stops on a dirty
   tree (often `AGENTS.md` re-added by `next dev`), ask the user to commit or discard it.
2. **Ask** the user, with the version, the commits and the uploads from the preview, for example:

   > Release v1.1.0 to https://farakurim.cz/? (2 commits, 3 new files in /uploads/)

   Wait for a clear yes; it publishes the site. Without it, stop: the commits stay as they are.

3. **Release:** `pnpm release --yes` (add `--major` only when the user asks). It uploads the new files, makes the
   commit `chore(release): vX.Y.Z` and the tag, and pushes `main` with the tag.
4. **Stop there:** do not query the run (no `gh`, no GitHub API). Tell the user the release is pushed and that the
   repo's Actions tab shows the check, the build, the linked-uploads check, the deploy and the Verify step. A failed
   run is fixed in a new commit and released with a new version.

Never move or reuse a pushed tag.

## Release from this machine

Only when the user asks, e.g. because GitHub Actions is down: `pnpm release --local` previews more (a minute or two).
It also checks that `.env.local` sets the Google Calendar key and both Matomo variables, runs the full check
(Prettier, tests, lint, types) and a fresh `pnpm build`, and summarises the sync of `out/` (new, changed, deleted
files) with every deleted file outside `_next/`. Name any deleted page or file outside `_next/` in the question.
After the yes, `pnpm release --local --yes` runs the checks and the build again, uploads the new files, checks that
every linked upload is on the server, syncs `out/`, verifies the live site, then commits, tags and pushes; the
commit's trailer `Release-Deploy: local` keeps the workflow from deploying the tag again. Report the version and the
verify lines. If the run stops after the sync (verify failed), the site is live but untagged: tell the user, fix it
in a new commit and release again.

## Other commands

All need the user's yes first, like a release, except the dry runs, `check-uploads` and `verify`:

- `scripts/deploy.sh uploads [--dry-run]`: only upload the staged files (never overwrites or deletes on the server).
- `scripts/deploy.sh out [--dry-run]` then `scripts/deploy.sh verify [/uploads/…]`: deploy `out/` without a
  release. Build first (`pnpm build` with `.env.local`, or the calendars ship mock data) and show the user every
  `*deleting` line of the dry run.
- **Virtual tour**, one time, when `verify` warns that it is missing: copy it on the server from the old site
  (`ssh <SSH_TARGET from scripts/deploy.sh> 'cp -a /stary.farakurim.cz/virtualni_prohlidka /farakurim.cz/'`). It is a
  self-contained PHP app; do not edit its files.

`/stary.farakurim.cz/` on the server is the backup of the old PHP site: never deploy there or delete it.
