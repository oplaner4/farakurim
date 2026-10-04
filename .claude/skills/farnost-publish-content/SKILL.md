---
name: farnost-publish-content
description: Finish a content change on the new farakurim.cz site - stage uploaded files for the server, verify and build, check the page in a browser, commit, and deploy after the user confirms. Use at the end of farnost-create-aktualita, farnost-create-porad-bohosluzeb, farnost-create-galerie and farnost-create-petrklic, or whenever src/content/ was edited to publish news, ohlášky, albums or Petrklíč issues.
---

# Publish a content change

The site is a static export: content lives in `src/content/*.ts`, a change goes live only after a build and an
upload of `out/`. Uploaded files (posters, attachments, the weekly PDF, Petrklíč issues) are **not** in git or
`out/`: they live on the web host under `/uploads/…` and the content links them root-relative, as `/uploads/…`.

## 1. Stage the files for the server

Files that go to the server are prepared in `uploads/` (git-ignored), which mirrors `/uploads/` on the server:

| Content          | Staging path                                 | Link                                          |
| ---------------- | -------------------------------------------- | --------------------------------------------- |
| Aktuality files  | `uploads/aktuality/<file>`                   | `/uploads/aktuality/<file>`                   |
| Pořad bohoslužeb | `uploads/porady_bohosluzeb/<file>`           | `/uploads/porady_bohosluzeb/<file>`           |
| Petrklíč         | `uploads/petrklic/<id>/` (PDF, cover, pages) | `/uploads/petrklic/<id>/petrklic-<id>.pdf`, … |

- File names are **ASCII, lower-case kebab-case**, prefixed with the record they belong to
  (`hody-ceska-plakat.png`, `2026-10-04-porad-bohosluzeb.pdf`). Diacritics break in some SFTP clients, and the
  prefix keeps names unique without the old site's random ids.
- Never overwrite a file that is already on the server under the same name: pick a new name instead
  (`curl -sI http://2026.farakurim.cz/uploads/<path>` returns `404` for a free name).

## 2. Verify

```sh
pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build
```

Do not continue on a failure; fix the content (types catch most mistakes) or report it.

## 3. Check in the browser

`pnpm preview` (serves `out/` at http://localhost:4173), then open the pages the change shows up on, at 390 and
1440 px, light and dark (`.claude/rules/design-check.md`):

| Change    | Pages                                                                    |
| --------- | ------------------------------------------------------------------------ |
| Aktualita | `/` (Aktuality block), `/aktuality/`, `/aktuality/<slug>/`, `/kalendar/` |
| Ohlášky   | `/porad_bohosluzeb/`, `/` (next mass, "Tento týden")                     |
| Album     | `/fotogalerie/`, `/` (album carousel)                                    |
| Petrklíč  | `/petrklic/aktualni/`, `/petrklic/archiv/`, `/` (Petrklíč card)          |

`pnpm preview` (like `pnpm dev`) serves `/uploads/…` from the local `uploads/` folder and redirects anything not
staged there to the live site, so the new files already show before the upload.

## 4. Commit

Use the `commit` skill with the `content` scope, e.g. `feat(content): add the Hody v České aktualita`,
`feat(content): publish the ohlášky for 4.–11. 10. 2026`, `feat(content): add the Medový den album`.
Never stage `uploads/` or `out/`.

## 5. Deploy

Run the `farnost-deploy` skill: it dry-runs the upload of `uploads/` and `out/` to http://2026.farakurim.cz/, asks
the user to confirm, deploys and checks the new URLs. Do not deploy without the user's explicit yes.
