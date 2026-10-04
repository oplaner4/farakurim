---
name: farnost-create-porad-bohosluzeb
description: Publish the weekly pořad bohoslužeb (ohlášky) on the new farakurim.cz site from the parish's weekly PDF - extract the week's days, services and announcements into the ServiceSheet in src/content/ohlasky.ts, confirm with the user, stage the PDF for the server, then publish. Use whenever the user brings a new pořad bohoslužeb, rozpis bohoslužeb or ohlášky PDF.
---

# Create the pořad bohoslužeb

The weekly PDF ("ROZPIS BOHOSLUŽEB V TÝDNU od … do …") becomes **structured content**: one `ServiceSheet`
(`src/content/types.ts`) in `src/content/ohlasky.ts` that replaces the previous week. It feeds the "Tento týden"
ohlášky, the weekly schedule, and, for every day of its week, the next-mass countdown and the schedule exceptions
(design/DESIGN.md §14.5–14.7). Finish with **`farnost-publish-content`**.

## 1. Read the PDF

The user gives at least a file name; without a folder, look in `~/Downloads/`. Use both:

- the `Read` tool, to see the table (which rows belong to which day and place), and
- `pdftotext -layout <file> -`, for exact wording. In the layout text a day's date and feast sit in the middle of
  its rows and long intentions wrap onto the next line: use the rendered page to assign them.

Read the **whole** page: the announcements are the paragraphs below the table.

## 2. Extract the sheet

**Week**: `validFrom` / `validTo` from the heading ("od 30. 11. 2025 do 7. 12. 2025" → `2025-11-30` / `2025-12-07`).

**Days** (`days[]`, one per date, in order):

| Field       | How to fill it                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| `date`      | ISO date of the row's "30. 11."                                                                        |
| `feast`     | The feast in sentence case: "1. NEDĚLE ADVENTNÍ" → `"1. neděle adventní"`, `"sv. František Xaverský"`. |
| `solemnity` | `true` for Sundays and solemnities (slavnost).                                                         |
| `rows`      | The day's services in time order.                                                                      |

**Rows** (`SheetRow`):

| Field     | How to fill it                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `time`    | `"8:00"`, `"17:30"`.                                                                                                                             |
| `place`   | `"kurim"`, `"moravske-kninice"`, `"jinacovice"` for the parish churches (`places` in `masses.ts`); free text for anywhere else (`"Vranov"`).     |
| `title`   | The part before " – ": `"Mše sv."`, `"Mše sv. se zpěvem scholy"`, `"Adorace"`, `"Křest"`, `"Pohřeb"`, `"Modlitební večer s Komunitou Emmanuel"`. |
| `detail`  | The part after " – ", word for word, wrapped lines joined: `"za živé a † farníky a dobrodince naší farnosti"`.                                   |
| `public`  | Omit (public). `false` only when the user asks to keep a row's `detail` off the web (see privacy below).                                         |
| `mass`    | `true` for a mass in one of the parish churches. During the sheet's week only these count for the next mass.                                     |
| `changed` | `true` when the mass differs from the regular schedule (below), or the PDF marks it as a change. Only adds the "změna" tag.                      |

**Privacy** (§14.6): the parish decided to publish the intentions word for word, names included, because the
linked PDF is public anyway. Set `public: false` only on a row the user asks to hide (e.g. a family asked to keep
its intention off the web); that row's `detail` then stays in the PDF only.

**The sheet drives the week**: for every date from `validFrom` to `validTo`, the day's `mass` rows are its only
masses (`sheetExceptions()`); the regular schedule is never mixed in, and applies again only after the week. So
enter **every day of the week** with all its rows, as the PDF does: a missing mass is a cancelled mass, a missing
day has no masses. A cancellation needs no manual `scheduleExceptions` entry; mention it to the user.

**Changes**: compare the masses of each day with `regularServices` in `src/content/masses.ts` (weekday, time,
place; `rule: "first-in-month"` rows apply on the first such weekday of the month only) and set `changed` on a mass
that is not there. A mass on a weekday without any regular mass (e.g. a Tuesday morning mass) is not a change.

**Announcements** (`announcements[]`, word for word, in the PDF's order):

| Field      | How to fill it                                                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `category` | `zmena` (changes to services), `smireni` (confession times), `pozvanka` (invitations, pilgrimages, events), `podekovani` (thanks), `info` (anything else: collections, notices). |
| `html`     | `<p>…</p>`; key dates and times in `<strong>`; e-mails as `<a href="mailto:…">`, web addresses as links.                                                                         |
| `newsId`   | The `id` of the matching aktualita in `src/content/news.ts`, if there is one (adds "Více v aktualitách").                                                                        |

Unfinished text in the PDF ("vynesl …………. Kč") goes to the user: ask for the value, never publish the dots.

## 3. Confirm with the user

Show the week, a compact day-by-day list of rows (mark `changed` rows), and the announcements with
their categories. Ask about anything uncertain: unreadable rows, cancellations.

## 4. Stage the PDF

```sh
mkdir -p uploads/porady_bohosluzeb
cp "<source>" "uploads/porady_bohosluzeb/<validFrom>-porad-bohosluzeb.pdf"
```

`pdfUrl` is `/uploads/porady_bohosluzeb/<validFrom>-porad-bohosluzeb.pdf`.

## 5. Replace the sheet

Rewrite `serviceSheet` in `src/content/ohlasky.ts` with the new week. Keep the module's shape: `import "server-only"`,
the helpers (`kurimMass`, `FOR_PARISHIONERS`, add others when a phrase repeats), and the `scheduleExceptions`
export (`...sheetExceptions(...)` first, then manual entries for dates after the week, such as an announced
cancellation; the first entry for a date wins). Remove manual entries that are now covered by the sheet or past.

```ts
    {
      date: "2026-10-04",
      feast: "27. neděle v mezidobí",
      solemnity: true,
      rows: [
        kurimMass("8:00", "za Jana Nováka"),
        { time: "9:30", place: "moravske-kninice", title: "Mše sv.", mass: true, changed: true },
        kurimMass("11:00", "za obec Česká, její obyvatele a rodáky", { title: "Hodová mše sv.", changed: true }),
      ],
    },
```

## 6. Publish

Follow **`farnost-publish-content`**; check `/porad_bohosluzeb/` (ohlášky, weekly schedule, "změna" tags, hidden
intentions) and the homepage next mass. Remind the user to mirror changed or cancelled services in the "Mše,
adorace" Google Calendar, which the Kalendář reads.

## Common mistakes

- Missing the announcements below the table, or summarising them: they are published word for word.
- Assigning a row to the wrong day: the date sits in the middle of the day's rows in the layout text.
- Leaving a wrapped intention cut in half, or splitting "Mše sv. – za …" into the wrong `title` / `detail`.
- Hiding intentions with names (`public: false`) without the user asking: they are published as in the PDF.
- Leaving out a day or a mass of the week: during the sheet's week, what is not in `rows` does not take place.
- Tagging unchanged masses `changed` to express a cancellation: leaving the mass out is enough.
- `mass: true` on a mass outside the parish churches, or on adoration and prayer evenings.
- Publishing placeholder dots from an unfinished PDF.
