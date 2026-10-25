---
name: parish-release
description: Release the site, which publishes it, also from this machine when GitHub Actions is down. Use at the end of parish-publish-content, or whenever the user asks to deploy, release, upload, publish to the server or sync the site.
---

# Release the site

A release publishes the site: never upload, deploy, tag or push without the user's explicit yes.

## Release

1. **Preview:** run `pnpm release`. Without a terminal it only previews. If it stops on a dirty tree (often
   `AGENTS.md` re-added by `next dev`), ask the user to commit or discard it.
2. **Ask:** show the preview's output as printed, in a code block, and ask "Release vX.Y.Z?". If the user acts on an
   `ask:` line before the yes, run the preview again.

   Wait for a clear yes; it covers the calendar changes too. Never run `pnpm calendar-sync --apply` yourself. Without
   the yes, stop: the commits stay as they are.

3. **Release:** `pnpm release --yes` (add `--major` only when the user asks).
4. **Stop there:** do not query the run (no `gh`, no GitHub API). Tell the user the release is pushed and its run
   shows in the repo's Actions tab. A failed run is fixed in a new commit and released with a new version.

Never move or reuse a pushed tag.

## Release from this machine

Only when the user asks, e.g. because GitHub Actions is down. Preview with `pnpm release --local` (a minute or two);
if it stops on a missing key, ask the user to set it in `.env.local`. Ask as above, and name every deleted page or
file outside `_next/` the preview lists. After the yes, run `pnpm release --local --yes` and report the version, the
verify lines and whether the calendars were synced. If it stops after publishing (the verify failed), the site is
live but untagged: tell the user, fix it in a new commit and release again.
