---
name: parish-create-service-sheet
description: Publish the weekly service sheet (the "pořad bohoslužeb" or "ohlášky") from the parish's DOCX of the year or its weekly PDF. Use whenever the user brings a new service sheet ("pořad bohoslužeb", "rozpis bohoslužeb", "ohlášky") DOCX or PDF. A week already on the site is corrected with parish-correct-service-sheet.
---

# Create a service sheet

The parish's weekly service sheet ("ROZPIS BOHOSLUŽEB V TÝDNU od … do …") becomes **structured content**: one sheet,
added by `pnpm stage-content sheet`. It can be published any day before its week: the site shows each sheet from its
`validFrom` (the newer one on the Sunday two sheets share), and the script removes the sheets before the current one.
Finish with **`parish-publish-content`**.

## 1. Read the source

The user gives at least a file name; without a folder, look in `~/Downloads/`. The source is **the DOCX** ("Pořad
bohoslužeb 2026.docx"): the parish's Word file with every week of the year, the newest first. The script takes its
newest week (`--from` and `--to` pick another), drafts the record from the week's table and announcements, and
stages that week's page converted to PDF (Word on Windows, else LibreOffice).

With only a **PDF of the week** (no DOCX or no converter), read `pdf.md` beside this file
(`.claude/skills/parish-create-service-sheet/pdf.md`): it replaces steps 1 and 2 up to "The fields".

Draft the record (it also refuses a week before the current sheet or overlapping another). When it prints
`state: staged` (the week was staged before) or refuses with `state: published` (the week is released), take it to
**`parish-correct-service-sheet`**.

```sh
pnpm stage-content sheet draft "<source>" --out <scratchpad>/record.json
```

It prints the week and the events an announcement can link (for `newsId`), and writes `days` and
`announcements` to `record.json`. The days a two-week table leaves out become days without services, printed in a
`tell: Days without services: …` line. A table it cannot read (a date outside the week, a weekday that does not fit
the date, times that do not pair with the services, a table that does not start and end on the heading's dates)
stops it with the week and day: ask the user what the document should say (its `ask:` line when it prints one), as
the error is in their document. The draft
is a starting point: step 2 says what to check in it.

The DOCX holds the whole year's intentions with names: the draft is your only reading of it (never open it yourself:
no unzip, no conversion), and only the week's page is staged, never the DOCX. The draft keeps Word's bold and italic;
what it cannot settle, ask the user.

## 2. Extract the sheet

The sheet is `record.json` in the session's scratchpad (never in the repo) with `days` and `announcements` only:
`validFrom` and `validTo` come from the heading, and the script sets `rev` (the PDF's version, with `--corrected`).
Fix the draft, then check the record against the fields below.

**Week**: the week `sheet draft` printed from the heading (not part of the record): enter every date of it
in `days`. A heading can cover **two weeks** (around Christmas, Easter or a holiday): it is still **one**
`ServiceSheet` with every day of both weeks, never split into two. Everything below that says "the week" means the
sheet's whole period.

### Fix the draft

`sheet draft` already wrote `record.json`. What it gets right: every date of the week (the days the table leaves out
without rows), the rows in time order, `time` as `"8:00"`, `place` as the parish church's id, the `title` / `detail`
split at " – ", the announcements word for word with Word's bold and italic kept and addresses linked. What it
guesses or leaves out, so check each against the fields below and fix `record.json` in place:

- `html`: one announcement per empty paragraph in the document, so the parish's formatting can split or clutter one:
  regroup them as "One notice per announcement" below says.
- `category`: guessed from keywords, `info` when none fits. Check every announcement.
- `mass`: set for "mše" or "vigilie" in the title ("Mše sv. – pohřeb …" too). Check a mass named otherwise.
- `service`: set for "adorace", "modlit…", "novéna", "obřady", "bohoslužba" or "pobožnost" in the title. Check it
  against the mass-like services below.
- `feast`: lowercased by the script; a wrapped name's case and the split of a day's several names are guessed. Fix an
  unusual one.
- `solemnity`: set for Sundays, a bold feast and "slavnost…". Add a solemnity the document did not make bold.
- `<strong>`: only where the parish made the text bold. Add it to key dates and times that are not.
- `newsId`: never set. Add it where an event matches (see "Finding `newsId`" below).

### The fields

**Days** (`days[]`, one per date, in order):

| Field       | How to fill it                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| `date`      | ISO date of the row's "30. 11."                                                                        |
| `feast`     | The feast in sentence case: "1. NEDĚLE ADVENTNÍ" → `"1. neděle adventní"`, `"sv. František Xaverský"`. |
| `solemnity` | `true` for Sundays, solemnities ("Slavnost …") and a feast the parish makes bold.                      |
| `rows`      | The day's services in time order.                                                                      |

**Feast names** keep the capitals of saints' names after "sv." and of names such as Páně, Boží, Panny Marie. A day's
several names are joined by " – ": a cell's ("Uvedení Páně do chrámu – Hromnice") and the feasts of its later rows
("Slavnost posvěcení kostela – 28. neděle v mezidobí").

**Rows** (`SheetRow`):

| Field     | How to fill it                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------- |
| `time`    | `"8:00"`, `"17:30"`.                                                                                    |
| `place`   | A parish church's id (`places` in `masses.ts`: `"kurim"`, …); free text elsewhere (`"Vranov"`).         |
| `title`   | The part before " – ": `"Mše sv."`, `"Mše sv. se zpěvem scholy"`, `"Adorace"`, `"Pohřeb"`.              |
| `detail`  | The part after " – ", word for word, wrapped lines joined.                                              |
| `mass`    | `true` for a mass in any place; the countdown ("Nejbližší mše svatá") counts only the parish churches'. |
| `service` | `true` for a mass-like public service in any place (below); shown as "Nejbližší bohoslužba".            |
| `changed` | Omit (a mass outside the regular schedule is tagged "změna"); `true` only for a change the PDF marks.   |

**Mass-like services** (`service`): "Adorace", "Modlitební večer", "Modlitba chval", "Modlitba sv. růžence",
"Novéna k Duchu svatému", "Májová pobožnost", any "bohoslužba" and "Velkopáteční obřady"; not "Pohřeb", "Křest dětí",
"Zpovídání" or "Křížová cesta".

**Announcements** (`announcements[]`, word for word, in the PDF's order):

| Field      | How to fill it                                                                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `category` | `change` ("nebude", "přesouvá"), `confession` ("zpovídá", "svátost smíření"), `invitation` ("zveme", "pouť", "koncert"), `thanks` ("děkujeme"), `info` (anything else: "sbírka"). |
| `html`     | `<p>…</p>`, a list as `<ul><li>`; key dates and times in `<strong>`; e-mails as `<a href="mailto:…">`, web addresses as links.                                                    |
| `newsId`   | The `id` of the matching event, if there is one (adds "Více v aktualitách"; finding it: below).                                                                                   |

**One notice per announcement:**

- Merge what belongs together: a lead-in ending with a colon ("Svatební ohlášky:", "Zpovídá se:") with its items and
  closing line, and a letter (greeting, paragraphs, signature) into one announcement.
- Turn lines that list items ("▪ 1. a 2. třída: …", "– ve čtvrtek 3. 6. …", one confession time per line) into
  `<ul><li>…</li></ul>` after the lead-in's `<p>`, without the bullet characters.
- Drop paragraphs without words ("%") and editorial markers ("[V Kuřimi:]"), keeping the wording otherwise.

**Finding `newsId`**: take it from the `Events for newsId` list step 1 printed (the events not ended two weeks
before the week, in start order): match an announcement of an event by its title, place or date (a pilgrimage on 19. 12. → `pout-lukov-trebic-2026`). With no clear match, leave `newsId` out: never guess, never search
`src/content/news/` for an event the list lacks, and never add an event on the side (offer `parish-create-event` if
the user wants one). The script only checks that the id exists, not that it is the right event, so step 3 shows each
match.

Unfinished text in the source ("vynesl …………. Kč") goes to the user: ask for the value, never publish the dots.

## 3. Confirm with the user

Validate the record first: `pnpm stage-content sheet "<source>" --record <scratchpad>/record.json --check`. Then show the
week, a compact day-by-day list of rows, and the announcements with their categories and each `newsId` with its
event's title and date. Ask about anything uncertain: unreadable rows, cancellations, an announcement with no
matching event.

Wait for the user's yes or corrections to these before staging anything.

Unattended: write this into the report instead (`unattended.md`).

## 4. Stage the PDF and add the sheet

```sh
pnpm stage-content sheet "<source>" --record <scratchpad>/record.json
```

It validates the record first (the error names each field), stages the PDF, adds the sheet, removes the outdated
sheets and runs the service sheet tests. Pass each `tell:` line it prints on to the user as printed, and ask each `ask:` line.

## 5. Publish

Follow **`parish-publish-content`**. The release brings the "Bohoslužby" calendar in line: its preview lists the changes.

## Unattended run

Only when the prompt says the run is **unattended**: read `unattended.md` beside this file
(`.claude/skills/parish-create-service-sheet/unattended.md`) and follow it on top of the steps above. A local run
never needs it.

## Common mistakes

- Missing the announcements below the table, or summarising them: they are published word for word.
- Splitting "Mše sv. – za …" into the wrong `title` / `detail`.
- Leaving out a day or a mass of the week: during the sheet's week, what is not in `rows` does not take place.
- Setting `changed` by hand on a mass outside the regular schedule (it is computed), or to express a cancellation:
  leaving the mass out is enough.
- `mass: true` on "Adorace" (that is `service: true`).
- `service: true` on "Pohřeb" or "Křest dětí": personal events never count for the countdown.
- Publishing placeholder dots from an unfinished source.
- Putting `validFrom`, `validTo` or `rev` into `record.json`: the script reads the dates from the heading and sets
  `rev`.
- Taking the DOCX draft as final: check every flag and category, and add the `<strong>` and `newsId` it cannot know.
