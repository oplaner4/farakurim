---
name: parish-correct-service-sheet
description: Correct a week's service sheet (the "pořad bohoslužeb" or "ohlášky") already on the site - fix its services, intentions or announcements, or replace its PDF, then publish. Use whenever the user brings a corrected or replaced service sheet ("pořad bohoslužeb", "ohlášky") DOCX or PDF, or says a service, intention or announcement of a published week is wrong. A new week is added with parish-create-service-sheet.
---

# Correct a service sheet

Never edit a sheet in `src/content/service-sheets.json` by hand: a correction reruns `pnpm stage sheet` with a corrected
record, which replaces the sheet of the same week.

## 1. Find the week

Take the sheet of the week the user names, or the corrected source's heading shows ("od … do …", its `validFrom`), from
`src/content/service-sheets.json`. A week no longer in the file (the script removes the sheets before the current one)
cannot be corrected.

## 2. Write the corrected record

Write `record.json` in the session's scratchpad (never in the repo) from the sheet: its `days` and `announcements`
only, without `validFrom`, `validTo` and `rev` (the script sets them). Change only what is wrong:

- a corrected PDF: compare it with the sheet, the way **`parish-create-service-sheet`** step 1 reads a PDF, and
  take over every difference;
- a corrected DOCX: draft the week (`pnpm stage sheet "<docx>" --from <validFrom> --to <validTo> --corrected
--draft <scratchpad>/draft.json`), compare the draft with the sheet and take over only the differences in the
  text, keeping the sheet's fixes (`<strong>`, categories, `newsId`);
- a correction the user describes: change those rows or announcements.

The fields follow **`parish-create-service-sheet`** step 2 (rows, `mass` and `service`, privacy, announcements).
A cancelled or moved service changes the week's `rows` only.

## 3. Confirm with the user

With a corrected PDF or DOCX (with a DOCX, also `--from` and `--to` when the week is not its newest):

```sh
pnpm stage sheet "<source>" --record <scratchpad>/record.json --corrected --check
```

When only the record changes, without a source:

```sh
pnpm stage sheet --from <validFrom> --to <validTo> --record <scratchpad>/record.json --check
```

Show the user what changes (day by day, the rows and announcements that differ).

Wait for the user's yes or corrections to these before staging anything.

## 4. Stage

Run the same command without `--check`. It replaces the sheet of the same week and runs the service sheet test.

## 5. Publish

Follow **`parish-publish-content`**. The release brings the "Bohoslužby" calendar in line: its preview lists the changes.

## Unattended run

Only when the prompt says the run is **unattended**: the DOCX's newest week is already in `service-sheets.json`
(**`parish-create-service-sheet`** "Unattended run" sends it here). Its rules and its report apply; steps 1 to 4 here
change:

- It is a correction, always, even when nothing seems to differ: build the record from the draft as
  `parish-create-service-sheet` step 2a says (not from the sheet), and stage it, with `--corrected` when the script
  says the week is already published.
- The week's outcome is `corrected`, and its summary is what differs from the published sheet.

## Common mistakes

- Editing a sheet in `service-sheets.json` by hand instead of rerunning the command with a corrected record.
- Rewriting the whole record from the PDF and losing earlier fixes (a category, a `newsId`): start
  from the sheet.
- Leaving out `--corrected` with a corrected PDF or DOCX.
- Putting `validFrom`, `validTo` or `rev` into `record.json`: the script reads the dates from the heading and sets
  `rev`.
