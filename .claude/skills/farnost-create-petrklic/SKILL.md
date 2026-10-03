---
name: farnost-create-petrklic
description: Add a new issue of the Petrklíč parish newsletter to the new farakurim.cz site from its PDF - confirm the issue number with the user, stage the PDF for the server, render the cover and viewer pages to WebP, add a PetrklicIssue to src/content/petrklic.ts, then publish. Use whenever the user brings a new Petrklíč, zpravodaj or newsletter PDF.
---

# Create a Petrklíč issue

One issue is one `PetrklicIssue` record (`src/content/types.ts`) at the top of `src/content/petrklic.ts`
(design/DESIGN.md §17–18). The first record is the current issue (aktuální číslo): the Petrklíč page shows its
pages in the viewer, the homepage card shows its cover. The PDF goes to the server (`/uploads/petrklic/`); the
cover and the viewer pages are WebP images committed in `public/assets/img/petrklic/`. Finish with
**`farnost-publish-content`**.

## 1. Read the PDF

The user gives at least a file name; without a folder, look in `~/Downloads/`. Read page 1 with the `Read` tool
(`pages: "1"`) and run `pdfinfo <file>` for the page count. If the file is over 40 MB, ask for a smaller export.

## 2. Confirm with the user

The cover usually says the number and year ("1/2026", "Velikonoce 2026"). Show:

- **year** and **number** within the year. Without one on the cover, propose the next after `petrklicIssues[0]`
  (after 4/2025 comes 1/2026) and say it is a guess.
- **note**, only for special issues: `"mimořádné"`, `"1. část"`, `"2. část"`.
- **id**: `<year>-<number>`, plus the note in ASCII kebab-case (`2026-2`, `2026-3-mimoradne`, `2026-1-2-cast`);
  it must be unique in the file. It names the PDF and the images.
- **pageCount** from `pdfinfo`.

Wait for corrections before writing anything.

## 3. Stage the PDF and render the images

```sh
mkdir -p uploads/petrklic
cp "<source>" "uploads/petrklic/<id>.pdf"
pnpm petrklic "uploads/petrklic/<id>.pdf" --pages <id>   # prints "<id> <page count>"
```

This writes `public/assets/img/petrklic/<id>.webp` (cover) and `public/assets/img/petrklic/<id>/<n>.webp` (every
page). Only the current issue needs pages: delete the previous current issue's page folder
(`git rm -r public/assets/img/petrklic/<previous id>/`), keep its cover.

## 4. Add the record

At the top of `petrklicIssues` (newest first):

```ts
  issue("2026-2", 2026, 2, 36),
  issue("2026-3-mimoradne", 2026, 3, 12, { note: "mimořádné" }),
```

`issue()` builds `pdfUrl` (`https://farakurim.cz/uploads/petrklic/<id>.pdf`) and `cover`; `pageImages` of the
current issue are computed. The volume (ročník) is computed from the year.

## 5. Publish

Follow **`farnost-publish-content`**; check `/petrklic/aktualni/` (cover, viewer pages, download link),
`/petrklic/archiv/` and the homepage Petrklíč card. The download link is broken until the PDF is uploaded.

## Common mistakes

- Inserting the issue below the current one: the site treats `petrklicIssues[0]` as the current issue.
- Running `pnpm petrklic` without `--pages <id>`: the viewer shows empty pages.
- Leaving the previous issue's page folder in `public/` (2–3 MB of unused images per issue).
- A `pageCount` that differs from the PDF: the viewer links missing page images.
- Committing the PDF: it goes only to `uploads/` and the server.
