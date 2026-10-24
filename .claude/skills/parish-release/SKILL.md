---
name: parish-release
description: Release the site, which publishes it, also from this machine when GitHub Actions is down. Use at the end of parish-publish-content, or whenever the user asks to deploy, release, upload, publish to the server or sync the site.
---

# Release the site

`pnpm release` does the release: it uploads the staged files, tags and pushes, and the pushed tag is checked, built
and published. `pnpm release --local` publishes from this machine instead. How and where the site is deployed is the
scripts' business (`docs/deployment.md`), not this skill's.

## Release

1. **Preview:** run `pnpm release`. Without a terminal it only previews: it checks the tree is clean, on `main` and
   not behind `origin/main`, lists the commits since the last tag, picks the version (minor for a `feat` outside the
   `content` scope, patch otherwise), lists the new files for `/uploads/` and the new or changed cron scripts
   (`cron-scripts/`), and prints the calendar lines: the changes the release makes in the Události calendar (add,
   link, update) and in the Bohoslužby calendar (add, update, delete, and reports of hand-made events that double a
   service). If it stops on a dirty tree (often `AGENTS.md` re-added by `next dev`), ask the user to commit or
   discard it.
2. **Ask** the user, with the version, the commits, the uploads, the changes to both calendars and any cron scripts from the
   preview, for example:

   > Release v1.1.0? (2 commits, 3 new files in /uploads/)

   Call out each `ask:` line on its own: that event stays out of the calendar until the user pastes its page URL into
   the description of the Události event that is this one or, when none of them is, adds the event in Události by
   hand with the page URL in its description (the page's "Přidat do kalendáře" file can be imported once the release
   is out). Done before the yes, run the preview again; done after it, the next release links it. Call out a
   `cannot pair` line too, as printed: that event's calendar entries stay as they are.

   Wait for a clear yes; it publishes the site, and it covers the changes to both calendars (Události and Bohoslužby), which
   the deploy workflow applies after the deploy. Never run `pnpm calendar-sync --apply` or
   `pnpm services-calendar-sync --apply` yourself. Without the yes, stop: the commits stay as they
   are.

3. **Release:** `pnpm release --yes` (add `--major` only when the user asks). It uploads the new files and the cron
   scripts, makes the commit `chore(release): vX.Y.Z` and the tag, and pushes `main` with the tag.
4. **Stop there:** do not query the run (no `gh`, no GitHub API). Tell the user the release is pushed and that the
   repo's Actions tab shows the check, the build, the linked-uploads check, the deploy and the Verify step. A failed
   run is fixed in a new commit and released with a new version.

Never move or reuse a pushed tag.

## Release from this machine

Only when the user asks, e.g. because GitHub Actions is down: `pnpm release --local` previews more (a minute or two). It
builds with `RELEASE_BUILD=1`, which stops first unless `.env.local` sets the Google Calendar key and both Matomo
variables, runs the full check (Prettier, the site tests, lint, types) and a fresh `pnpm build`, and summarises the sync
of `out/` (new, changed, deleted files) with every deleted file outside `_next/`. Name any deleted page or file outside
`_next/` in the question. After the yes, `pnpm release --local --yes` runs the checks and the build again, uploads the
new files, checks that every linked upload is online, publishes `out/`, verifies the live site, then commits, tags
and pushes; the commit's trailer `Release-Deploy: local` keeps the workflow from deploying the tag again. Report the
version and the verify lines. If the run stops after publishing (verify failed), the site is live but untagged: tell the
user, fix it in a new commit and release again.
