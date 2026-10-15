---
name: parish-create-service-sheet
description: Publish the weekly service sheet (the "pořad bohoslužeb" or "ohlášky") on the new farakurim.cz site from the parish's DOCX of the year or its weekly PDF - extract the week's days, services and announcements into a sheet record, confirm with the user, stage the week's PDF for upload, then publish. Use whenever the user brings a new service sheet ("pořad bohoslužeb", "rozpis bohoslužeb", "ohlášky") DOCX or PDF.
---

# Create a service sheet

The parish's weekly service sheet ("ROZPIS BOHOSLUŽEB V TÝDNU od … do …") becomes **structured content**: one sheet,
added by `pnpm stage sheet`. It can be published any day before its week: the site shows each sheet from its
`validFrom` (the newer one on the Sunday two sheets share), and the script removes the sheets before the current one.
Finish with **`parish-publish-content`**.

## 1. Read the source

The user gives at least a file name; without a folder, look in `~/Downloads/`. The source is one of:

- **The DOCX** ("Pořad bohoslužeb 2026.docx", preferred): the parish's Word file with every week of the year, the
  newest first. The script takes its newest week (`--from` and `--to` pick another), drafts the record from the
  week's table and announcements, and stages that week's page converted to PDF (Word on Windows, else LibreOffice).
  The DOCX holds a year of intentions with names: it never goes to `uploads/` or the repo, only the week's page does.
- **A PDF of the week** (page 1 exported by the user), when there is no DOCX or no converter.

**From the DOCX**, draft the record (it also refuses a week already released):

```sh
pnpm stage sheet "<source>" --draft <scratchpad>/record.json
```

It prints the week and its days and writes `days` and `announcements` to `record.json`. The days a two-week table
leaves out become days without services, printed as "Days without services": tell the user. A table it cannot read (a
date outside the week, a weekday that does not fit the date, times that do not pair with the services, a table that
does not start and end on the heading's dates) stops it with the week and day: ask the user what the document should
say, as the error is in their document. The draft is a starting point: step 2a says what to check in it.

**From a PDF**, read it with both:

- the `Read` tool, to see the table (which rows belong to which day and place), and
- `pdftotext -layout <file> -`, for exact wording. In the layout text a day's date and feast sit in the middle of
  its rows and long intentions wrap onto the next line: use the rendered page to assign them.

Read the **whole** page: the announcements are the paragraphs below the table.

Get the week and its dates (it refuses a week already released):

```sh
pnpm stage sheet "<source>" --check
```

## 2. Extract the sheet

The sheet is `record.json` in the session's scratchpad (never in the repo) with `days` and `announcements` only:
`validFrom` and `validTo` come from the heading, and the script sets `rev` (the PDF's version, with `--corrected`).
Follow 2a or 2b, then check the record against the fields below.

**Week**: the week `--draft` or `--check` printed from the heading (not part of the record): enter every date of it
in `days`. A heading can cover **two weeks** (around Christmas, Easter or a holiday): it is still **one**
`ServiceSheet` with every day of both weeks, never split into two. Everything below that says "the week" means the
sheet's whole period.

### 2a. From the DOCX: fix the draft

`--draft` already wrote `record.json`. What it gets right: every date of the week (the days the table leaves out
without rows), the rows in time order, `time` as `"8:00"`, `place` as the parish church's id, the `title` / `detail`
split at " – ", the announcements word for word with Word's bold and italic kept and addresses linked. What it
guesses or leaves out, so check each against the fields below and fix `record.json` in place:

- `html`: one announcement per empty paragraph in the document, so the parish's formatting
  can split or clutter one. Fix each to read as one notice:
  - Merge what belongs together: a lead-in ending with a colon ("Svatební ohlášky:", "Zpovídá se:") with its items
    and closing line, and a letter (greeting, paragraphs, signature) into one announcement.
  - Turn lines that list items ("▪ 1. a 2. třída: …", "– ve čtvrtek 3. 6. …", one confession time per line) into
    `<ul><li>…</li></ul>` after the lead-in's `<p>`, without the bullet characters.
  - Drop paragraphs without words ("%") and editorial markers ("[V Kuřimi:]"), keeping the wording otherwise.
- `category`: guessed from keywords, `info` when none fits. Check every announcement.
- `mass`: set for "mše" or "vigilie" in the title, in any place ("Mše sv. – pohřeb …" too). Check a mass named
  otherwise.
- `service`: set for "adorace", "modlit…", "novéna" or "obřady" anywhere in the title, and for any row with
  "bohoslužba" or "pobožnost", in any place. Add it to any other mass-like public service.
- `feast`: lowercased from capitals, keeping the first word, saints' names after "sv." and names such as Páně, Boží,
  Panny Marie. A cell's names are joined by " – " ("Uvedení Páně do chrámu – Hromnice"), and so are a day's feasts
  from its later rows ("Slavnost posvěcení kostela – 28. neděle v mezidobí"); a wrapped name is guessed from the
  lines' case. Fix an unusual feast's case or split.
- `solemnity`: set for Sundays, a bold feast and "slavnost…". Add a solemnity the document did not make bold.
- `<strong>`: only where the parish made the text bold. Add it to key dates and times that are not.
- `newsId`: never set. Add it where an event matches (see "Finding `newsId`" below).

### 2b. From a PDF: write the record

Write `record.json` from scratch with the fields below, from the rendered page and the `pdftotext` wording:

- Assign each row to its day and place from the rendered page: in the layout text the date and feast sit in the
  middle of the day's rows.
- Join the wrapped lines of a long intention into one `detail`.
- Enter every day of the week, a day without services with `"rows": []`.
- Copy the announcements below the table word for word, one per notice (grouped and listed as 2a's `html` says), and
  add their `<strong>`, links and `newsId` yourself.

### The fields

**Days** (`days[]`, one per date, in order):

| Field       | How to fill it                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| `date`      | ISO date of the row's "30. 11."                                                                        |
| `feast`     | The feast in sentence case: "1. NEDĚLE ADVENTNÍ" → `"1. neděle adventní"`, `"sv. František Xaverský"`. |
| `solemnity` | `true` for Sundays and solemnities ("Slavnost …").                                                     |
| `rows`      | The day's services in time order.                                                                      |

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
| `newsId`   | The `id` of the matching event in `src/content/news/`, if there is one (adds "Více v aktualitách"; finding it: below).                                                            |

**Finding `newsId`**: the events are in `src/content/news/<year>/<MM>.json` by the month of their `start`. For an
announcement of an event, search the month of its date (and the month before, for a registration) for its title,
place or date, and take the event's `id` (a pilgrimage on 19. 12. → `pout-lukov-trebic-2026` in
`2026/12.json`). With no clear match, leave `newsId` out: never guess, and never add an event on the side
(offer `parish-create-event` if the user wants one). The script only checks that the id exists, not that it is
the right event, so step 3 shows each match.

Unfinished text in the source ("vynesl …………. Kč") goes to the user: ask for the value, never publish the dots.

## 3. Confirm with the user

Validate the record first: `pnpm stage sheet "<source>" --record <scratchpad>/record.json --check`. Then show the
week, a compact day-by-day list of rows, and the announcements with their categories and each `newsId` with its
event's title and date. Ask about anything uncertain: unreadable rows, cancellations, an announcement with no
matching event.

Wait for the user's yes or corrections to these before staging anything.

## 4. Stage the PDF and add the sheet

```sh
pnpm stage sheet "<source>" --record <scratchpad>/record.json
```

It validates the record first (the error names each field), stages the PDF, adds the sheet, removes the outdated
sheets and runs the service sheet tests. A line it prints that asks the user something goes to the user as printed.

```json
{
  "days": [
    {
      "date": "2026-10-04",
      "feast": "27. neděle v mezidobí",
      "solemnity": true,
      "rows": [
        { "time": "8:00", "place": "kurim", "title": "Mše sv.", "detail": "za Jana Nováka", "mass": true },
        { "time": "11:00", "place": "kurim", "title": "Hodová mše sv.", "detail": "za obec Česká", "mass": true }
      ]
    }
  ],
  "announcements": [
    { "category": "confession", "html": "<p>V Kuřimi se zpovídá ve čtvrtek od <strong>17.30</strong>.</p>" }
  ]
}
```

## 5. Publish

Follow **`parish-publish-content`**. Remind the user to mirror changed or cancelled services in the "Mše,
adorace" Google Calendar, which the Kalendář reads.

## Common mistakes

- Missing the announcements below the table, or summarising them: they are published word for word.
- Assigning a row to the wrong day: the date sits in the middle of the day's rows in the layout text.
- Leaving a wrapped intention cut in half, or splitting "Mše sv. – za …" into the wrong `title` / `detail`.
- Leaving out a day or a mass of the week: during the sheet's week, what is not in `rows` does not take place.
- Setting `changed` by hand on a mass outside the regular schedule (it is computed), or to express a cancellation:
  leaving the mass out is enough.
- `mass: true` on "Adorace" (that is `service: true`).
- `service: true` on "Pohřeb" or "Křest dětí": personal events never count for the countdown.
- Publishing placeholder dots from an unfinished source.
- Putting `validFrom`, `validTo` or `rev` into `record.json`: the script reads the dates from the heading and sets
  `rev`.
- Taking the DOCX draft as final: check every flag and category, and add the `<strong>` and `newsId` it cannot know.
- Staging the DOCX itself, or copying it anywhere in the repo: only the week's PDF page is published.
