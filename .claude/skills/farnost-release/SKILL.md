---
name: farnost-release
description: Release the new farakurim.cz site with `pnpm release` - check and build locally, preview the commits, version, staged uploads and the sync's deletions, ask the user for an explicit yes, then upload uploads/, deploy out/ to farakurim.cz over SSH, verify, tag vX.Y.Z and push. Use at the end of farnost-publish-content, or whenever the user asks to deploy, release, upload, publish to the server or sync the site.
---

# Release the site

`pnpm release` (`scripts/release.sh`) does the release from this machine; GitHub Actions only checks pushes and
deploys nothing. The server details (SSH target, web root `/farakurim.cz/`, rsync flags, the server-only folders
`/uploads/`, `/nahrane/`, `/virtualni_prohlidka/`, `/cache/`, the verify checks) live in `scripts/deploy.sh`. Change
them there, nowhere else.

## Release

1. **Preview:** run `pnpm release` (it takes a minute or two). Without a terminal it only previews:
   - it checks the tree is clean, on `main` and not behind `origin/main`, and that `.env.local` sets the Google
     Calendar key and both Matomo variables;
   - lists the commits since the last tag, picks the version (minor for a `feat` outside the `content` scope, patch
     otherwise) and lists the new files for `/uploads/`;
   - runs the full check (Prettier, tests, lint, types) and a fresh `pnpm build`;
   - summarises the sync of `out/` (new, changed, deleted files) and lists every deleted file outside `_next/`.

   If it stops on a dirty tree (often `AGENTS.md` re-added by `next dev`), ask the user to commit or discard it. If a
   check fails, fix it in a new commit and preview again.

2. **Ask** the user, with the version, the commits, the uploads and the deletions from the preview, for example:

   > Release v1.0.1 to https://farakurim.cz/? (2 commits, 3 new files in /uploads/, no pages deleted)

   Name any deleted page or file outside `_next/` explicitly. Wait for a clear yes; it publishes the site. Without
   it, stop: the commits stay as they are.

3. **Release:** `pnpm release --yes` (add `--major` only when the user asks). It runs the checks and the build again,
   uploads the new files, checks that every linked upload is on the server, syncs `out/` to the web root, verifies
   the live site, then runs `pnpm version` (commit `chore(release): vX.Y.Z` and the tag) and pushes `main` with the
   tag.
4. **Report** the version and the verify lines. If the run stops after the sync (verify failed), the site is live but
   untagged: tell the user, fix it in a new commit and release again.

Never move or reuse a pushed tag.

## Other commands

All need the user's yes first, like a release, except the dry runs, `check-uploads` and `verify`:

- `scripts/deploy.sh uploads [--dry-run]`: only upload the staged files (never overwrites or deletes on the server).
- `scripts/deploy.sh out [--dry-run]` then `scripts/deploy.sh verify [/uploads/…]`: deploy `out/` without a
  release. Build first (`pnpm build` with `.env.local`, or the calendars ship mock data) and show the user every
  `*deleting` line of the dry run.
- **Virtual tour**, one time, when `verify` warns that it is missing: copy it on the server from the old site
  (`ssh farakurim_cz@91.239.200.63 'cp -a /stary.farakurim.cz/virtualni_prohlidka /farakurim.cz/'`). It is a
  self-contained PHP app; do not edit its files.

`/stary.farakurim.cz/` on the server is the backup of the old PHP site: never deploy there or delete it.
