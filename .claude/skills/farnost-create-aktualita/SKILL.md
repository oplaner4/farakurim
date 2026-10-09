---
name: farnost-create-aktualita
description: Add a new aktualita (event) to the new farakurim.cz site from a poster, invitation or announcement given as a PDF, PNG or JPG - extract the event, confirm it with the user, add a NewsEvent to its month's JSON file in src/content/news/, stage the poster and attachments for the server, then publish. Use whenever the user wants to add, post or publish an aktualita, event, plakát or pozvánka.
---

# Create an aktualita

Read the file, extract one event as a `NewsEvent` (`src/content/types/news.ts`), confirm it with the user, add it to
`src/content/news/<year>/<MM>.json`, stage its files, then finish with **`farnost-publish-content`**. The fields and how they are
shown are specified in `design/DESIGN.md` §11.7 and §13.4.

## 1. Read the file

The user gives at least a file name; without a folder, look in `~/Downloads/`. Read it with the `Read` tool (images
render visually; for a PDF also run `pdftotext -layout <file> -` so no small print is missed). One file is one event;
if it announces several unrelated events, ask which to add (or add each separately).

## 2. Extract the event

Write the text from the source, in Czech; do not invent facts. Leave out what the source does not say.

| Field                  | How to fill it                                                                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                   | ASCII kebab-case from the title, with the start year (`hody-ceska-2026`, `farni-den-2026`). Also the detail URL (`/aktuality/<id>/`) and the file name prefix.                                                                                         |
| `title`                | The headline, sentence case (not the poster's capitals). **Required.**                                                                                                                                                                                 |
| `start`, `end`         | ISO dates. `end` only for multi-day events. A date without a year is the next such date from today.                                                                                                                                                    |
| `time`                 | Free text: `"9:30"`, `"18:00–20:30"`. Omit for all-day events.                                                                                                                                                                                         |
| `place`                | `"Kuřim, kostel sv. Maří Magdalény"`, `"Kuřim, fara"`, `"Tišnov"`. **Required.** Add `mapQuery` when the place alone would not find it on Mapy.cz.                                                                                                     |
| `text`                 | 1–2 sentences for the cards. **Required.** No URLs.                                                                                                                                                                                                    |
| `lead`                 | Optional: one inviting sentence under the detail title (also the page description). Defaults to `text`.                                                                                                                                                |
| `body`                 | Optional HTML for "O akci": `<p>`, `<strong>`, `<ul><li>`. Use it when the source has more than `text` says; keep it to a few short paragraphs. Links go to `links`, not into the body.                                                                |
| `program`              | Rows `{ time, title, note? }` when the source has a programme.                                                                                                                                                                                         |
| `links`                | `{ label, href }` for every web address and e-mail (`mailto:`) in the source, with a readable label.                                                                                                                                                   |
| `price`                | `"300 Kč"`, `"zdarma"`, when stated.                                                                                                                                                                                                                   |
| `registrationDeadline` | ISO date of "přihlášky do …".                                                                                                                                                                                                                          |
| `sessions`             | The dates of every meeting of a course or series, in order (first = `start`, last = `end`): `["2026-10-11", "2026-10-18"]`. A meeting with its own time or several days is `{ date, time?, end? }`. Leave out when the source does not list the dates. |
| `longTerm`             | `{ weeklyAt: "18:30" }` for a weekly series (weekday of `start`), `true` for other long-running events.                                                                                                                                                |
| `highlights`           | Only for real key facts or numbers (anniversaries); usually omit.                                                                                                                                                                                      |
| `tags`                 | Short free tags only when nothing above fits: `[{ label: "Zrušeno" }]`; `color` `"orange"`, `"magenta"` or `"grey"` instead of the default blue.                                                                                                       |
| `pinned`               | Only when the user asks for "Doporučujeme". At most one: remove `pinned` from the previous event.                                                                                                                                                      |
| `published`            | Leave out: the script sets today's date in Prague (the shared link's publication date). Keep it when editing a record later.                                                                                                                           |

## 3. Pick the label

The source file is attached under a label, shown on the page as written (with its accents); the script names the
file `<id>-<label in ASCII>.<ext>`. Prefer one of these; another short Czech label is fine when none fits
(`Mapka trasy`, `Záznam koncertu`):

| Label       | When                                      | Poster |
| ----------- | ----------------------------------------- | ------ |
| `Plakát`    | Poster or visual flyer                    | yes    |
| `Pozvánka`  | Invitation to a specific event            | yes    |
| `Leták`     | Handout-style flyer                       | yes    |
| `Program`   | Schedule or order of proceedings          | no     |
| `Informace` | General information                       | no     |
| `Oznámení`  | Plain announcement without strong visuals | no     |

An image or PDF becomes the event's poster unless you pass `--no-poster`: pass it for a "no" label and for any
other text-only document (audio and video never become one). Check the name before confirming (it refuses a taken
name, a bad id and a label without letters or digits):

```sh
pnpm stage aktualita "<source>" <id> "<label>" --title "<title>" [--no-poster] --check
```

## 4. Confirm with the user

Show the extracted fields, the label as written and whether the file becomes the poster in a short list (the
script takes any label, so a typo like `Plakat` would go on the page). Point out guesses: the year, an inferred end date,
`longTerm`. Wait for corrections before writing anything.

## 5. Stage the files and add the record

Write the confirmed event as JSON to `record.json` in the session's scratchpad (never in the repo): the fields
from step 2, without `published`, `poster` and `attachments`. A `poster.alt` you write (e.g. with the date) is
kept; otherwise it is `"<label>: <title>"`.

```json
{
  "id": "hody-ceska-2026",
  "title": "Hody v České",
  "start": "2026-10-02",
  "end": "2026-10-04",
  "place": "Česká",
  "text": "Srdečně zveme na tradiční hody v České – stavění máje, průvod a koncert."
}
```

Then run the step 3 command without `--check`, with the record:

```sh
pnpm stage aktualita "<source>" <id> "<label>" [--no-poster] --record <scratchpad>/record.json
```

It validates the record first against `newsEventSchema` (`src/lib/news/schema.ts`: required fields, dates,
times, links, unknown fields) and checks the `id` is free, so a bad record stages nothing; the error names each
field. Then it copies the file to `uploads/aktuality/` and, for an image or PDF, renders the poster WebP next to
it (unless `--no-poster`; an event without a poster gets the designed placeholder). Last, `scripts/add-aktualita.ts` adds the record with `poster`, `attachments` and `published` to
the JSON file of its **start month** (`src/content/news/<year>/<MM>.json`, any year) in start-date order, formats it
and runs the news tests. The month's first event creates its file (and the year's folder).

The attachment is the original file (the full-size link); the poster is only the WebP. Finished events stay in
the file: the archive lists them. An event without a source file is added with
`pnpm add-aktualita <scratchpad>/record.json` alone. Without `--record`, `pnpm stage` only prints the `"poster"`
and `"attachments"` entries as JSON, to paste into an existing record. A correction to an existing record is an
edit of its month file; `pnpm test src/content/news` checks it.

If the record is refused after staging (it should not be: it is checked first), fix `record.json` and run the same
command again: staging the same file again is allowed.

After adding the record, the command checks the event in the "Události" Google Calendar
(`scripts/aktualita-calendar.ts`; `pnpm aktualita-calendar <id>` runs it again later). The Kalendář links a calendar
event to the detail page when the event's description holds the page's URL. Show the user its output as printed:
it says what, if anything, they need to do.

## 6. Publish

Follow **`farnost-publish-content`** (commit, upload and push). Until the calendar check in step 5 says
"linked", remind the user of what it asked for, so the event shows in the Kalendář with its link.

## Common mistakes

- Copying the poster's capitals into `title`, or its whole text into `body`: keep `text` short and `body` brief.
- Putting URLs or e-mails into `text`/`body` instead of `links`.
- Guessing a year or end date silently: say it in the confirmation.
- Staging (without `--check`) before the user confirms: an abandoned file would go out with the next release.
- Editing the month file by hand for a new event instead of `--record`: the order and `published` are then up to
  you.
- Pinning a second event without unpinning the first.
- Forgetting `--no-poster` for a text-only PDF (`Program`, `Informace`, `Oznámení`): its first page becomes the
  poster.
