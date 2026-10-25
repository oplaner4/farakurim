---
name: parish-publish-content
description: Finish a content change - commit, and release after the user confirms. Use at the end of parish-create-event, parish-correct-event, parish-cancel-event, parish-pin-event, parish-create-service-sheet, parish-correct-service-sheet, parish-create-exception, parish-remove-exception, parish-create-album, parish-create-petrklic and parish-correct-petrklic, or whenever src/content/ was edited to publish events, service sheets ("ohlášky"), albums or Petrklíč issues.
---

# Publish a content change

Don't run the checks or a browser check: the release runs the checks (format, tests, lint, types) and publishes
nothing when one fails, and the content tests check the data.

## 1. Commit

Use the `commit` skill with the `content` scope, `feat` for new content and `fix` for a correction:

- `feat(content): add the Hody v České event`
- `feat(content): publish the service sheet for 4.–11. 10. 2026`
- `feat(content): cancel the mass on 25. 10. 2026`
- `fix(content): correct the Petrklíč 2/2026 PDF`

## 2. Release

Run the `parish-release` skill: `pnpm release` previews the commits, the version and the staged uploads, and after the
user's yes (which covers the Události and Bohoslužby calendar changes the preview lists, applied by the deploy workflow; never
run `pnpm calendar-sync --apply` yourself) `pnpm release --yes` uploads them, bumps the version, tags the release and
pushes `main` with the tag, which is then checked, built, published and verified. If the release fails (a check, or a
linked upload missing), fix it in a new commit and release again. Do not upload, deploy, tag or push without the
user's explicit yes. When the user only wants a backup, push `main` without a release.
