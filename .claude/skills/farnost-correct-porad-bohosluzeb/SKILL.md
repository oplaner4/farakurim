---
name: farnost-correct-porad-bohosluzeb
description: Correct a week's pořad bohoslužeb (ohlášky) already in src/content/ohlasky.json on the new farakurim.cz site - fix its sheet through a corrected record, or stage a corrected PDF with --corrected, then publish. Use whenever the user brings a corrected or replaced pořad bohoslužeb / ohlášky PDF, or says a service, intention or announcement of a published week is wrong. A new week is added with farnost-create-porad-bohosluzeb.
---

# Correct the pořad bohoslužeb

A week is one `ServiceSheet` in `src/content/ohlasky.json`, its PDF in
`uploads/porady_bohosluzeb/<validFrom>-porad-bohosluzeb[-r<rev>].pdf`. Never edit a sheet in `ohlasky.json` by hand:
a correction reruns `pnpm stage porad` with a corrected record, which replaces the sheet of the same week. Files on
the server are never overwritten, so once the week is released its PDF's name is taken and the rerun takes
`--corrected`.

## 1. Find the week

Take the sheet of the week the user names, or the corrected PDF's heading shows ("od … do …", its `validFrom`), from
`src/content/ohlasky.json`. A week no longer in the file (the script removes the sheets before the current one)
cannot be corrected.

## 2. Write the corrected record

Write `record.json` in the session's scratchpad (never in the repo) from the sheet: its `days` and `announcements`
only, without `validFrom`, `validTo` and `rev` (they come from the PDF). Change only what is wrong:

- a corrected PDF: compare it with the sheet, the way **`farnost-create-porad-bohosluzeb`** step 1 reads a PDF, and
  take over every difference;
- a correction the user describes: change those rows or announcements.

The fields follow **`farnost-create-porad-bohosluzeb`** step 2 (rows, `mass` and `service`, privacy, announcements).
A cancelled or moved service changes the week's `rows` only; a change after `validTo` goes to `laterExceptions` as
described there.

## 3. Confirm with the user

```sh
pnpm stage porad "<source>" --record <scratchpad>/record.json [--corrected] --check
```

`<source>` is the corrected PDF, which always takes `--corrected`. When only the record changes, it is the week's
staged PDF in `uploads/porady_bohosluzeb/` (`pnpm pull-uploads` fetches it from the server): `--corrected` only once
the week is on the server, as the check refuses the taken name otherwise. Show the user what changes
(day by day, the rows and announcements that differ) and wait for their yes.

## 4. Stage

```sh
pnpm stage porad "<source>" --record <scratchpad>/record.json [--corrected]
```

It replaces the sheet of the same week, formats the file and runs the ohlášky test. Before the release it replaces the
staged PDF; once the week is on the server, `--corrected` stages `…-porad-bohosluzeb-r2.pdf` (then `-r3`, …) and
stores the sheet's `rev`.

## 5. Publish

Follow **`farnost-publish-content`**, with a commit like `fix(content): correct the ohlášky of 4. 10. 2026`. Remind
the user to mirror changed or cancelled services in the "Mše, adorace" Google Calendar, which the Kalendář reads.

## Common mistakes

- Editing a sheet in `ohlasky.json` by hand instead of rerunning the command with a corrected record.
- Rewriting the whole record from the PDF and losing earlier fixes (a hidden `public: false` row, a `newsId`): start
  from the sheet.
- Leaving out `--corrected` after the release: the PDF's name is taken on the server.
- Putting `validFrom`, `validTo` or `rev` into `record.json`: the script reads them from the PDF.
