---
name: parish-correct-petrklic
description: Correct a Petrklíč issue already on the site - replace its PDF, or fix a wrong year, number or note, then publish. Use whenever the user brings a corrected, fixed or replaced Petrklíč PDF, or says an issue's year, number or note is wrong. A new issue is added with parish-create-petrklic.
---

# Correct a Petrklíč issue

The id comes from the year, number and note (`2026-2`, `2026-3-mimoradne`). A released file is never
replaced, so `pnpm stage petrklic --corrected` stages a corrected PDF of a released issue in a new folder.

## 1. Find the issue

Take the issue the user names (or the corrected PDF's cover shows) from `src/content/petrklic.json`: its year, number
and note. When it fits several issues or none, list the candidates (id, year, number, note) and ask.

## 2. A corrected PDF

```sh
pnpm stage petrklic "<source>" --year <year> --number <number> [--note "<note>"] --corrected --check
```

It refuses an issue that is not in the file. Show the user the id, the folder it would stage, the rev and the page
count it prints (next to the record's old `pageCount`).

Wait for the user's yes or corrections to these before staging anything. Then stage it without `--check`:

```sh
pnpm stage petrklic "<source>" --year <year> --number <number> [--note "<note>"] --corrected
```

It renders the cover and pages again and updates the issue.

## 3. A wrong year, number or note

A new year, number or note changes the id, and with it the issue's folder. Stage the issue again under the new id
from its own PDF (`<old id>` is the id from step 1):

```sh
pnpm stage petrklic --from <old id> --year <year> --number <number> [--note "<note>"] --check
```

Show the user the old and new id, the folder it would stage and the page count it prints. Wait for the user's yes or
corrections, then run it without `--check`. It moves the record, removes an unreleased old folder, and says when a
released one stays online and when `public/.htaccess` still redirects to the old PDF: tell the user, and change those
lines as it says.

## 4. Publish

Follow **`parish-publish-content`**.

## Common mistakes

- Replacing the PDF in an issue's folder by hand: a released file is never replaced, so stage it with `--corrected`.
- Staging a corrected PDF without `--corrected`: it is refused as an issue already in the file.
- Renaming the record's id without renaming its folder and PDF: the covers, the viewer and the download break.
