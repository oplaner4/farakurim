---
name: farnost-release
description: Release the new farakurim.cz site with `pnpm release` - preview the commits, version and staged uploads, ask the user for an explicit yes, then upload uploads/, tag vX.Y.Z and push, so GitHub Actions deploys out/ to farakurim.cz. Use at the end of farnost-publish-content, or whenever the user asks to deploy, release, upload, publish to the server or sync the site.
---

# Release the site

`pnpm release` (`scripts/release.sh`) does the release; the server details (SSH target, web root `/farakurim.cz/`,
rsync flags, the server-only folders `/uploads/`, `/virtualni_prohlidka/`, `/cache/`, the verify checks) live in
`scripts/deploy.sh`, which the GitHub Actions deploy job runs too. Change them there, nowhere else.

## Release

1. **Preview:** run `pnpm release`. Without a terminal it only previews: it checks the tree is clean, on `main` and
   not behind `origin/main`, lists the commits since the last tag, picks the version (minor for a `feat` outside
   the `content` scope, patch otherwise) and lists the new files for `/uploads/` (rsync dry run). If it stops on a
   dirty tree (often `AGENTS.md` re-added by `next dev`), ask the user to commit or discard it.
2. **Ask** the user, with the version, the commits and the uploads from the preview, for example:

   > Release v0.5.1 to https://farakurim.cz/? (2 commits, 3 new files in /uploads/)

   Wait for a clear yes; it publishes the site. Without it, stop: the commits stay as they are.

3. **Release:** `pnpm release --yes` (add `--major` only when the user asks).
   It uploads the new files, runs `pnpm version` (commit `chore(release): vX.Y.Z` and the tag) and pushes `main`
   with the tag.
4. **Stop there:** do not query the run (no `gh`, no GitHub API). Tell the user the release is pushed and that the
   repo's Actions tab shows the build, the linked-uploads check, the deploy and the Verify step.

A failed run is fixed in a new commit and released with a new version; never move or reuse a pushed tag.

## Other commands

All need the user's yes first, like a release, except the dry runs and `verify`:

- `scripts/deploy.sh uploads [--dry-run]`: only upload the staged files (never overwrites or deletes on the server).
- `scripts/deploy.sh out [--dry-run]` then `scripts/deploy.sh verify [/uploads/…]`: deploy `out/` from here when
  Actions is down. Build first (`pnpm build` with `.env.local`, or the calendars ship mock data) and show the user
  every `*deleting` line of the dry run.
- **Virtual tour**, one time, when `verify` warns that it is missing: copy it on the server from the old site
  (`ssh farakurim_cz@91.239.200.63 'cp -a /stary.farakurim.cz/virtualni_prohlidka /farakurim.cz/'`). It is a
  self-contained PHP app; do not edit its files.

`/stary.farakurim.cz/` on the server is the backup of the old PHP site: never deploy there or delete it. The Actions
secrets (`DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, `CHECK_UPLOADS`) are in
README.md § Deployment.
