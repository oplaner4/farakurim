# A corrected service sheet from a PDF

Only when the corrected source is a **PDF of the week** (no DOCX). It replaces the corrected DOCX bullet of step 2 of
**`parish-correct-service-sheet`**; `record.json` is still written from the sheet as step 2 says, and steps 3 to 5
apply as written there.

## 1. Draft the week

```sh
pnpm stage-content sheet draft "<pdf>" --corrected --out <scratchpad>/draft.json
```

Without `--from` and `--to`: the week is read from the PDF's heading, so a PDF of another week, or one overlapping
another sheet, is refused before anything is compared. The script does not read the PDF's table, so the draft holds
only the week's days: what it gives is that check and the events a new announcement can link (for `newsId`). It goes
to `draft.json`, never to `record.json`, which holds the sheet.

## 2. Compare the PDF with the sheet

Read the PDF as **`parish-create-service-sheet`**'s `pdf.md` step 2 says (the rendered page with the `Read` tool, the
wording with `pdftotext -layout`). Compare the PDF with the sheet, day by day and announcement by announcement, and take over every difference into `record.json`, keeping the
sheet's fixes (`<strong>`, categories, `newsId`) where the text did not change.

## Common mistakes

- Drafting to `record.json` (as **`parish-create-service-sheet`**'s `pdf.md` step 1 does for a new week): the draft
  overwrites the record built from the sheet.
- Passing `--from` and `--to` with a PDF: they replace its heading, so a PDF of another week is not caught.
- Assigning a row to the wrong day: in the layout text the date sits in the middle of the day's rows.
