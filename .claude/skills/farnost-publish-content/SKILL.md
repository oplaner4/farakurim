---
name: farnost-publish-content
description: Finish a content change on the new farakurim.cz site - commit, and release after the user confirms (GitHub Actions checks, builds and deploys the release). Use at the end of farnost-create-aktualita, farnost-pin-aktualita, farnost-create-porad-bohosluzeb, farnost-correct-porad-bohosluzeb, farnost-create-galerie, farnost-create-petrklic and farnost-correct-petrklic, or whenever src/content/ was edited to publish news, ohlášky, albums or Petrklíč issues.
---

# Publish a content change

The site is a static export: content lives in `src/content/*.ts`, and a change goes live with the next release
(`farnost-release`): GitHub Actions runs the checks (format, tests, lint, types) on the release tag, builds and
deploys `out/`, and deploys nothing when a check fails. So this skill does not run them, and a content change needs no
browser check: the content tests check the data, and the pages are built from components already checked.

Uploaded files (posters, attachments, the weekly PDF, Petrklíč issues) are **not** in git or `out/`: they live on
the web host under `/uploads/…` and the content links them root-relative, as `/uploads/…`.
The create skills stage them in `uploads/` (git-ignored) with `pnpm stage`, and the release uploads them.

## 1. Commit

Use the `commit` skill with the `content` scope, e.g. `feat(content): add the Hody v České aktualita`,
`feat(content): publish the ohlášky for 4.–11. 10. 2026`, `feat(content): add the Medový den album`.
Never stage `uploads/` or `out/`.

## 2. Deploy

Run the `farnost-release` skill: `pnpm release` previews the commits, the version and the staged uploads, and after the
user's yes `pnpm release --yes` uploads them, bumps the version, tags the release and pushes `main` with the tag;
GitHub Actions then checks, builds, deploys `out/` to https://farakurim.cz/ and verifies it. If the run fails (a
check, or a linked upload missing on the server), fix it in a new commit and release again. Do not upload, deploy, tag or push without the
user's explicit yes. When the user only wants a backup, push `main` without a release.
