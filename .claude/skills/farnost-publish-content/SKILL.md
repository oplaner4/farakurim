---
name: farnost-publish-content
description: Finish a content change on the new farakurim.cz site - stage uploaded files for the server, check the page in a browser, commit, and deploy after the user confirms (GitHub Actions verifies and builds). Use at the end of farnost-create-aktualita, farnost-create-porad-bohosluzeb, farnost-create-galerie and farnost-create-petrklic, or whenever src/content/ was edited to publish news, ohlášky, albums or Petrklíč issues.
---

# Publish a content change

The site is a static export: content lives in `src/content/*.ts`, and a change goes live with the next release (a version
tag pushed by `farnost-release`): GitHub Actions runs the checks (format, tests, lint, types), builds and deploys `out/`, and deploys nothing when a
check fails. So this skill does not run them; it only checks how the change looks.

Uploaded files (posters, attachments, the weekly PDF, Petrklíč issues) are **not** in git or `out/`: they live on
the web host under `/uploads/…` and the content links them root-relative, as `/uploads/…`.

## 1. Stage the files for the server

Files that go to the server are prepared in `uploads/` (git-ignored), which mirrors `/uploads/` on the server:

| Content          | Staging path                                 | Link                                          |
| ---------------- | -------------------------------------------- | --------------------------------------------- |
| Aktuality files  | `uploads/aktuality/<file>`                   | `/uploads/aktuality/<file>`                   |
| Pořad bohoslužeb | `uploads/porady_bohosluzeb/<file>`           | `/uploads/porady_bohosluzeb/<file>`           |
| Petrklíč         | `uploads/petrklic/<id>/` (PDF, cover, pages) | `/uploads/petrklic/<id>/petrklic-<id>.pdf`, … |

`pnpm stage aktualita|porad|petrklic` (`scripts/stage-upload.py`) stages them: it names a file in **ASCII,
lower-case kebab-case**, prefixed with its record (`hody-ceska-plakat.png`, `2026-10-04-porad-bohosluzeb.pdf`), and
refuses a name already on the server, since files there are never overwritten. Diacritics break in some SFTP
clients, and the prefix keeps names unique without the old site's random ids. Stage files by hand only for content
the script does not cover, following the same rules.

## 2. Check in the browser

`pnpm dev` (http://localhost:3000), then open the pages the change shows up on, at 390 and 1440 px, light and dark (`.claude/rules/design-check.md`):

| Change    | Pages                                                                    |
| --------- | ------------------------------------------------------------------------ |
| Aktualita | `/` (Aktuality block), `/aktuality/`, `/aktuality/<slug>/`, `/kalendar/` |
| Ohlášky   | `/porad_bohosluzeb/`, `/` (next mass, "Tento týden")                     |
| Album     | `/fotogalerie/`, `/` (album carousel)                                    |
| Petrklíč  | `/petrklic/aktualni/`, `/petrklic/archiv/`, `/` (Petrklíč card)          |

`pnpm dev` serves `/uploads/…` from the local `uploads/` folder and redirects anything not
staged there to the live site, so the new files already show before the upload.

## 3. Commit

Use the `commit` skill with the `content` scope, e.g. `feat(content): add the Hody v České aktualita`,
`feat(content): publish the ohlášky for 4.–11. 10. 2026`, `feat(content): add the Medový den album`.
Never stage `uploads/` or `out/`.

## 4. Deploy

Run the `farnost-release` skill: `pnpm release` previews the commits, the version and the staged uploads, and after the
user's yes `pnpm release --yes` uploads them, bumps the version, tags the release and pushes `main` with the tag; GitHub Actions then checks, builds and deploys `out/` to
http://2026.farakurim.cz/. If the run fails (a check, or a linked upload missing on the server), fix it in a new
commit and release again with a new version. Do not upload, tag or push without the user's explicit yes. When the
user only wants a backup, push `main` without a release.
