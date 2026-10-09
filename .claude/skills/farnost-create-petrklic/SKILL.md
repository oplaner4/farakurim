---
name: farnost-create-petrklic
description: Add a new issue of the Petrklíč parish newsletter to the new farakurim.cz site from its PDF - confirm the issue number with the user, stage the PDF for the server, render the cover and viewer pages to WebP, add a PetrklicIssue to src/content/petrklic.ts, then publish. Use whenever the user brings a new Petrklíč, zpravodaj or newsletter PDF.
---

# Create a Petrklíč issue

One issue is one `PetrklicIssue` record (`src/content/types/petrklic.ts`) at the top of `src/content/petrklic.ts`
(design/DESIGN.md §17–18). The first record is the current issue (aktuální číslo): the Petrklíč page shows its
pages in the viewer, the homepage card shows its cover. The PDF, its cover and the viewer pages (WebP images
rendered from it) are staged in `uploads/petrklic/` and uploaded to `/uploads/petrklic/`; none of them is committed.
Finish with **`farnost-publish-content`**.

## 1. Read the PDF

The user gives at least a file name; without a folder, look in `~/Downloads/`. Read page 1 with the `Read` tool
(`pages: "1"`) for the number and year.

## 2. Confirm with the user

The cover usually says the number and year ("1/2026", "Velikonoce 2026"). Check the id and get the page count
(it refuses a taken id and a malformed one):

```sh
pnpm stage petrklic "<source>" <id> [--note "<note>"] --check
```

Then show:

- **year** and **number** within the year. Without one on the cover, propose the next after `petrklicIssues[0]`
  (after 4/2025 comes 1/2026) and say it is a guess.
- **note**, only for special issues: `"mimořádné"`, `"1. část"`, `"2. část"`.
- **id**: `<year>-<number>`, plus the note in ASCII kebab-case (`2026-2`, `2026-3-mimoradne`, `2026-1-2-cast`);
  it must be unique in the file. It names the PDF and the images.
- **pageCount**, as `--check` printed it.

Wait for corrections before writing anything.

## 3. Stage the PDF and render the images

Each issue is one folder, uploaded as a whole to `/uploads/petrklic/<id>/`:

```
uploads/petrklic/<id>/
├── petrklic-<id>.pdf   the download (visitors' browsers save it under this name)
├── cover.webp          page 1
└── pages/<n>.webp      every page, for the viewer
```

```sh
pnpm stage petrklic "<source>" <id> [--note "<note>"]
```

It copies the PDF, renders `cover.webp` and every page (`pnpm petrklic <id> --pages`), and prints the `issue(...)`
line for the record.

Only the current issue's pages are linked; the previous issue's `pages/` on the server may stay.

## 4. Add the record

Paste the printed line at the top of `petrklicIssues` (newest first):

```ts
  issue("2026-2", 2026, 2, 36),
  issue("2026-3-mimoradne", 2026, 3, 12, { note: "mimořádné" }),
```

`issue()` builds `pdfUrl` (`/uploads/petrklic/<id>/petrklic-<id>.pdf`) and `cover`; `pageImages` of the current issue are
computed. The volume (ročník) is computed from the year.

## 5. Publish

Follow **`farnost-publish-content`**. Upload the whole `uploads/petrklic/<id>/` folder.

## Common mistakes

- Inserting the issue below the current one: the site treats `petrklicIssues[0]` as the current issue.
- Re-rendering by hand with `pnpm petrklic` without `--pages`: the viewer shows empty pages.
- Staging (without `--check`) before the user confirms: an abandoned issue would go out with the next release.
- Committing the PDF or the images: they go only to `uploads/` and the server.
- Uploading only the PDF instead of the whole `<id>/` folder: the covers and the viewer show broken images.
