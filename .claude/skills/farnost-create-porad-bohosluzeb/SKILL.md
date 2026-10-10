---
name: farnost-create-porad-bohosluzeb
description: Publish the weekly pořad bohoslužeb (ohlášky) on the new farakurim.cz site from the parish's weekly PDF - extract the week's days, services and announcements into a sheet record, confirm with the user, stage the PDF for the server, then publish. Use whenever the user brings a new pořad bohoslužeb, rozpis bohoslužeb or ohlášky PDF.
---

# Create the pořad bohoslužeb

The weekly PDF ("ROZPIS BOHOSLUŽEB V TÝDNU od … do …") becomes **structured content**: one `ServiceSheet`
(`src/content/types/services.ts`) in `src/content/ohlasky.json`. It can be published any day
before its week: the site shows each sheet from its `validFrom` (the newer one on the Sunday two sheets share), and the
script removes the sheets before the current one. Finish with **`farnost-publish-content`**.

## 1. Read the PDF

The user gives at least a file name; without a folder, look in `~/Downloads/`. Use both:

- the `Read` tool, to see the table (which rows belong to which day and place), and
- `pdftotext -layout <file> -`, for exact wording. In the layout text a day's date and feast sit in the middle of
  its rows and long intentions wrap onto the next line: use the rendered page to assign them.

Read the **whole** page: the announcements are the paragraphs below the table.

Get the week and its dates (it refuses a week already on the server; a corrected PDF of it takes `--corrected`):

```sh
pnpm stage porad "<source>" --check
```

## 2. Extract the sheet

Write the confirmed sheet as `record.json` in the session's scratchpad (never in the repo) with `days` and
`announcements` only: `validFrom`, `validTo` and `rev` come from the PDF. Rows use the table's fields; a mass row is
`{ "time", "place", "title": "Mše sv.", "detail", "mass": true }` (example in step 4).

**Week**: the week `--check` printed from the heading (not part of the record): enter every date of it in `days`.
A PDF can cover **two weeks** (around Christmas, Easter or a holiday): it is still **one** `ServiceSheet` with
every day of both weeks, never split into two. Everything below that says "the week" means the sheet's whole period.

**Days** (`days[]`, one per date, in order):

| Field       | How to fill it                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| `date`      | ISO date of the row's "30. 11."                                                                        |
| `feast`     | The feast in sentence case: "1. NEDĚLE ADVENTNÍ" → `"1. neděle adventní"`, `"sv. František Xaverský"`. |
| `solemnity` | `true` for Sundays and solemnities (slavnost).                                                         |
| `rows`      | The day's services in time order.                                                                      |

**Rows** (`SheetRow`):

| Field     | How to fill it                                                                                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `time`    | `"8:00"`, `"17:30"`.                                                                                                                                                                          |
| `place`   | `"kurim"`, `"moravske-kninice"`, `"jinacovice"` for the parish churches (`places` in `masses.ts`); free text for anywhere else (`"Vranov"`).                                                  |
| `title`   | The part before " – ": `"Mše sv."`, `"Mše sv. se zpěvem scholy"`, `"Adorace"`, `"Křest"`, `"Pohřeb"`, `"Modlitební večer s Komunitou Emmanuel"`.                                              |
| `detail`  | The part after " – ", word for word, wrapped lines joined: `"za živé a † farníky a dobrodince naší farnosti"`.                                                                                |
| `public`  | Omit (public). `false` only when the user asks to keep a row's `detail` off the web (see privacy below).                                                                                      |
| `mass`    | `true` for a mass in one of the parish churches. The countdown shows it as "Nejbližší mše svatá".                                                                                             |
| `service` | `true` for a mass-like public service in a parish church: adoration, a prayer evening ("Modlitební večer", with adoration and praise), "Velikonoční obřady". Shown as "Nejbližší bohoslužba". |
| `changed` | Omit: masses outside the regular schedule are tagged "změna" automatically. `true` only for a change the PDF marks that the schedule cannot tell.                                             |

**Privacy** (§14.6): the parish decided to publish the intentions word for word, names included, because the
linked PDF is public anyway. Set `public: false` only on a row the user asks to hide (e.g. a family asked to keep
its intention off the web); that row's `detail` then stays in the PDF only.

**The sheet drives the week**: for every date from `validFrom` to `validTo` (the newer sheet wins a shared Sunday),
the day's `mass` and `service` rows are its only services; the regular schedule is never mixed in, and applies again
only after the last sheet. So enter **every day of the week** with all its rows, as the PDF does: a missing mass is a
cancelled mass, a missing day has no services. A cancellation within the week needs no `laterExceptions` entry; mention it to the user.

**Later changes** (`laterExceptions` in `src/content/ohlasky.json`, after the **last** sheet's `validTo`): an
announcement of a change **after** `validTo` ("v neděli 25. 10. mše svatá nebude", a moved time) can go into
`laterExceptions` right away, so the next-mass countdown is right before that week's ohlášky arrive. Each entry replaces its whole day: list every service of that date at the parish churches
(masses as `{ time, place }`, titled ones with `title`), `services: []` for none, and a short `reason`. Ask the user
before adding one, and remind them to change Google Calendar too (the Kalendář reads it). Keep the entries in date
order, one per date.

**Announcements** (`announcements[]`, word for word, in the PDF's order):

| Field      | How to fill it                                                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `category` | `zmena` (changes to services), `smireni` (confession times), `pozvanka` (invitations, pilgrimages, events), `podekovani` (thanks), `info` (anything else: collections, notices). |
| `html`     | `<p>…</p>`; key dates and times in `<strong>`; e-mails as `<a href="mailto:…">`, web addresses as links.                                                                         |
| `newsId`   | The `id` of the matching aktualita in `src/content/news/`, if there is one (adds "Více v aktualitách").                                                                          |

Unfinished text in the PDF ("vynesl …………. Kč") goes to the user: ask for the value, never publish the dots.

## 3. Confirm with the user

Validate the record first: `pnpm stage porad "<source>" --record <scratchpad>/record.json --check`. Then show the
week, a compact day-by-day list of rows, and the announcements with their categories. Ask about anything uncertain:
unreadable rows, cancellations.

## 4. Stage the PDF and add the sheet

```sh
pnpm stage porad "<source>" --record <scratchpad>/record.json
```

It validates the record first (the error names each field), stages the PDF, adds the sheet to
`src/content/ohlasky.json`, removes the outdated sheets and the `laterExceptions` entries the sheets now cover, formats
the file and runs the ohlášky test. An entry it removes "between the sheets" (a gap the new sheet leaves) was announced
for a day no sheet covers, where the site shows the regular schedule: tell the user.

**Corrections**: never edit a sheet in `src/content/ohlasky.json` by hand.

- A corrected record: fix `record.json` and rerun the same command (restaging the identical PDF is allowed, and the
  sheet of the same week is replaced). After the release the PDF's name is taken: add `--corrected`.
- A corrected PDF: rerun the command with `--corrected` (and the week's `--record`, as always). Once the week is on the server it
  stages `…-porad-bohosluzeb-r2.pdf` (then `-r3`, …) and stores the sheet's `rev`; before the release it replaces
  the staged PDF.

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
    { "category": "smireni", "html": "<p>V Kuřimi se zpovídá ve čtvrtek od <strong>17.30</strong>.</p>" }
  ]
}
```

## 5. Publish

Follow **`farnost-publish-content`**; the commit includes `src/content/ohlasky.json`. Remind the user to mirror changed or cancelled services in the "Mše,
adorace" Google Calendar, which the Kalendář reads.

## Common mistakes

- Missing the announcements below the table, or summarising them: they are published word for word.
- Assigning a row to the wrong day: the date sits in the middle of the day's rows in the layout text.
- Leaving a wrapped intention cut in half, or splitting "Mše sv. – za …" into the wrong `title` / `detail`.
- Hiding intentions with names (`public: false`) without the user asking: they are published as in the PDF.
- Leaving out a day or a mass of the week: during the sheet's week, what is not in `rows` does not take place.
- Setting `changed` by hand on a mass outside the regular schedule (it is computed), or to express a cancellation:
  leaving the mass out is enough.
- `mass: true` on a mass outside the parish churches, or on adoration (that is `service: true`).
- `service: true` on a funeral, baptism or wedding: personal events never count for the countdown.
- Publishing placeholder dots from an unfinished PDF.
- Putting `validFrom`, `validTo` or `rev` into `record.json`: the script reads them from the PDF.
- Editing a sheet in `ohlasky.json` by hand instead of rerunning the command with a corrected record (with
  `--corrected` after the release).
