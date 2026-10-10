---
name: farnost-create-petrklic
description: Add a new issue of the Petrklíč parish newsletter to the new farakurim.cz site from its PDF - confirm the issue number with the user, stage the PDF for the server, render the cover and viewer pages to WebP, add the issue to src/content/petrklic.json, then publish. Use whenever the user brings a new Petrklíč, zpravodaj or newsletter PDF.
---

# Create a Petrklíč issue

One issue is one record (`PetrklicRecord` in `src/content/types/petrklic.ts`) in `src/content/petrklic.json`. The
first record is the current issue (aktuální číslo): the Petrklíč page shows its pages in the viewer and the homepage
card shows its cover. The PDF and its images go only to `uploads/` and the server.

## 1. Read the PDF

The user gives at least a file name; without a folder, look in `~/Downloads/`. Read page 1 with the `Read` tool
(`pages: "1"`) for the number and year.

## 2. Confirm with the user

The cover usually says the number and year ("1/2026", "Velikonoce 2026"). Check the issue and get the page count:

```sh
pnpm stage petrklic "<source>" --year <year> --number <number> [--note "<note>"] --check
```

It prints the folder it would stage (`uploads/petrklic/<id>/`, so the id), the page count and where the issue would
go, and refuses an issue already in the file (for a corrected PDF, see [Corrections](#corrections)).

Then show:

- **year** and **number** within the year. Without one on the cover, propose the next after the first issue in
  `src/content/petrklic.json`
  (after 4/2025 comes 1/2026) and say it is a guess.
- **note**, only for special issues: `"mimořádné"`, `"1. část"`, `"2. část"`.
- **id**, as `--check` printed it: computed from the year, number and note (`2026-2`, `2026-3-mimoradne`,
  `2026-1-2-cast`). It names the PDF and the images.
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
pnpm stage petrklic "<source>" --year <year> --number <number> [--note "<note>"]
```

It copies the PDF, renders `cover.webp` and every page, and adds the issue to `src/content/petrklic.json` (newest
first), then formats it and runs the Petrklíč test. It says whether the issue is now the current one: an older issue
goes lower in the list.

Only the current issue's pages are linked; the previous issue's `pages/` on the server may stay.

## 4. Publish

Follow **`farnost-publish-content`**. Upload the whole `uploads/petrklic/<id>/` folder.

## Corrections

- A wrong year, number, note or pageCount: edit the issue's record in `src/content/petrklic.json`. A new year, number
  or note changes the id, so the folder in `uploads/petrklic/` and on the server must be renamed too.
- A corrected PDF of an issue already on the server: stage it with `--rev 2` (a taken name's error names the next
  rev). It goes to `uploads/petrklic/<id>-r2/`, with the PDF under the same name, and sets the issue's `rev` and
  `pageCount`; the old folder stays on the server. Upload the whole new folder.
- A corrected PDF before the release: delete `uploads/petrklic/<id>/` and the issue's record, then stage again.

## Common mistakes

- Replacing the PDF in an issue's folder after the release: the server keeps the old files, so stage it with
  `--rev` instead.
- Staging (without `--check`) before the user confirms: an abandoned issue would go out with the next release.
- Committing the PDF or the images: they go only to `uploads/` and the server.
- Uploading only the PDF instead of the whole `<id>/` folder: the covers and the viewer show broken images.
