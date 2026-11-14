---
name: parish-create-event
description: Add a new event (an "aktualita") from a poster, invitation or announcement given as a PDF, PNG or JPG, or from the details alone, then publish. Use whenever the user wants to add, post or publish an event ("aktualita", "plakát", "pozvánka"). An event already on the site is corrected with parish-correct-event.
---

# Create an event

Read the source, extract one event, confirm it with the user, add it (with its files, if it has any, staged by
`pnpm stage event`), then finish with **`parish-publish-content`**.

## 1. Read the source

The source is usually a file: the user gives at least its name; without a folder, look in `~/Downloads/`. Read it
with the `Read` tool (images render visually; for a PDF also run `pdftotext -layout <file> -` so no small print is
missed). The user may give several files of one event (a poster and a programme): read them all, they become its
attachments. If a file announces several unrelated events, ask which to add (or add each separately).

Without a file, warn the user before going on: the event gets no poster (the cards and the detail page show the
placeholder) and no attachment, so ask whether they have a poster or invitation after all. If not, take the event
from what they wrote, follow steps 3b and 5b instead of 3a and 5a.

## 2. Extract the event

Write the text from the source, in Czech; do not invent facts. Leave out what the source does not say.

| Field                  | How to fill it                                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                   | ASCII kebab-case title and start year (`hody-ceska-2026`): the URL `/aktuality/<id>/` and the files' prefix. **Required.**                                  |
| `title`                | The headline, sentence case (not the poster's capitals). **Required.**                                                                                      |
| `start`, `end`         | ISO dates; `end` only for multi-day events. A date without a year is the next such date from today. `start` **Required.**                                   |
| `place`                | What the source says, in its words: `"Kuřim, kostel sv. Maří Magdalény"`, `"Tišnov"`, or several places (`"Kuřim, Tišnov"`). **Required.**                  |
| `text`                 | 1–2 sentences for the cards. **Required.** No URLs.                                                                                                         |
| `startTime`            | `"18:00"` (H:MM). Omit for all-day events.                                                                                                                  |
| `endTime`              | `"20:30"`, when the source gives an end; only with `startTime`, and after it.                                                                               |
| `venue`                | The venue's id for an event held at a building, also the main one of several (see "Finding `venue`"): the map link and the calendars' location.             |
| `lead`                 | Optional: one inviting sentence under the detail title (also the page description). Defaults to `text`.                                                     |
| `body`                 | Optional HTML for "O akci" (`<p>`, `<strong>`, `<ul><li>`) when the source says more than `text`: a few short paragraphs, no links (`links`).               |
| `program`              | Rows `{ time, title, note? }` when the source has a programme.                                                                                              |
| `links`                | `{ label, href }` for every web address and e-mail (`mailto:`) in the source, with a readable label.                                                        |
| `price`                | `"300 Kč"`, `"zdarma"`, when stated.                                                                                                                        |
| `registrationDeadline` | ISO date of "přihlášky do …".                                                                                                                               |
| `sessions`             | Listed meeting dates of a series, in order from `start` to `end`: `["2026-10-11", …]`, or `{ date, startTime?, endTime?, end? }` with its own time or days. |
| `longTerm`             | `{ weeklyAt: "18:30" }` for a weekly series (weekday of `start`), `true` for other long-running events; needs `end`.                                        |
| `highlights`           | Only for real key facts or numbers (anniversaries); usually omit.                                                                                           |
| `tags`                 | Free tags when nothing above fits: `[{ label: "Pro rodiny", color? }]` (`"orange"`, `"magenta"`, `"grey"`; blue). Never "Zrušeno": `change`.                |
| `pinned`               | `true` only when the user asks for "Doporučujeme". The script moves the pin: it unpins the event pinned before and names it.                                |
| `published`            | Leave out: the script sets today's date in Prague (the shared link's publication date). Keep it when editing a record later.                                |

### Finding `venue`

Take the venue as **`parish-manage-venues`** (`.claude/skills/parish-manage-venues/SKILL.md`) section A says: a listed venue, a new alias of one, a new
venue looked up on Mapy.com, or none. A new venue or alias is written after the yes of step 4, before step 5 stages
the record.

## 3a. Pick the labels and the order, and check (only with files)

Each file is attached under a label, shown on the page as written (with its accents). Prefer one of these; another short Czech label is fine when none fits
(`Mapka trasy`, `Záznam koncertu`):

| Label       | When                                      | Poster |
| ----------- | ----------------------------------------- | ------ |
| `Plakát`    | Poster or visual flyer                    | yes    |
| `Pozvánka`  | Invitation to a specific event            | yes    |
| `Leták`     | Handout-style flyer                       | yes    |
| `Program`   | Schedule or order of proceedings          | no     |
| `Informace` | General information                       | no     |
| `Oznámení`  | Plain announcement without strong visuals | no     |

The files are attached in the order you list them, and the first one is the one "Doporučujeme" and the archive
show. Only the first file can be the poster: list the poster first. It becomes the poster when it is an image or
PDF, unless you pass `--no-poster`: pass it when the first file has a "no" label or is another text-only document
(an MP3 never becomes one; it refuses any file but a PDF, PNG, JPG, WebP or MP3).

Write the event to `record.json` as in step 5a and check it with the files before confirming: its fields, a free
`id` (the command takes it from the record), the `Would unpin …` line for a pinned event, and the names (it refuses
a taken name, a label without letters or digits and two labels giving the same file name):

```sh
pnpm stage event "<source>" "<label>" ["<source>" "<label>" …] [--no-poster] --record <scratchpad>/record.json --check
```

## 3b. Check the record (only without a file)

Write the event to `record.json` as in step 5a and check it (its fields, a free `id`, and the `Would unpin …` line
for a pinned event):

```sh
pnpm add-event <scratchpad>/record.json --check
```

## 4. Confirm with the user

Show the extracted fields and, with files, each file with its label as written, in their order, and which one becomes
the poster in a short list (the script takes any label, so a typo like `Plakat` would go on the page). Point out guesses: the year, an
inferred end date, `longTerm`. Name the `venue`, and show a new venue with its pin link and a new alias. For a pinned event, say which event loses "Doporučujeme" (the `Would unpin …` line of
step 3a or 3b).

Wait for the user's yes or corrections to these before staging or adding anything.

## 5a. Stage the files and add the record (only with files)

`record.json` is the event as JSON in the session's scratchpad (never in the repo): the fields from step 2, without
`published`, `poster` and `attachments`; update it with the confirmed event. A `poster.alt` you write (e.g. with the date) is
kept; otherwise it is `"<label of the first file>: <title>"`.

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

Then run the step 3a command without `--check`:

```sh
pnpm stage event "<source>" "<label>" ["<source>" "<label>" …] [--no-poster] --record <scratchpad>/record.json
```

## 5b. Add the record (only without a file)

Update `record.json` from step 3b with the confirmed event, then add it:

```sh
pnpm add-event <scratchpad>/record.json
```

An error from step 5a or 5b (a bad field, a taken `id`, a pin on an event that has already ended) means nothing was
staged (5b stages nothing anyway): fix `record.json` and run the same command again.

## 6. Publish

Follow **`parish-publish-content`** (commit, upload and push). The release brings the Události calendar in line.

## Unattended run

Only when the prompt says the run is **unattended**: read `unattended.md` beside this file
(`.claude/skills/parish-create-event/unattended.md`) and follow it on top of the steps above. A local run never needs
it.

## Common mistakes

- Copying the poster's capitals into `title`, or its whole text into `body`: keep `text` short and `body` brief.
- Putting URLs or e-mails into `text`/`body` instead of `links`.
- Guessing a year or end date silently: say it in the confirmation.
- Guessing a venue from a similar name, or adding one without the user's yes on its pin: ask instead.
- Going on without a file and without the warning in step 1: the user may have a poster to add.
- Staging (without `--check`) before the user confirms: an abandoned file would go out with the next release.
- Adding a new event by hand instead of `--record` (or `pnpm add-event`): the order and `published` are then up
  to you.
- Editing `pinned` by hand: a pinned `--record` moves the pin itself.
- Listing the poster after another file: only the first file becomes the poster (afterwards, only
  `pnpm event-poster` changes it).
- Forgetting `--no-poster` when the first file is a text-only PDF (`Program`, `Informace`, `Oznámení`): its first
  page becomes the poster.
