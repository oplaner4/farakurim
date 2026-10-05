---
name: farnost-create-aktualita
description: Add a new aktualita (event) to the new farakurim.cz site from a poster, invitation or announcement given as a PDF, PNG or JPG - extract the event, confirm it with the user, add a NewsEvent to its month's file in src/content/news/, stage the poster and attachments for the server, then publish. Use whenever the user wants to add, post or publish an aktualita, event, plakát or pozvánka.
---

# Create an aktualita

Read the file, extract one event as a `NewsEvent` (`src/content/types/news.ts`), confirm it with the user, add it to
`src/content/news/<year>/<MM>.ts`, stage its files, then finish with **`farnost-publish-content`**. The fields and how they are
shown are specified in `design/DESIGN.md` §11.7 and §13.4.

## 1. Read the file

The user gives at least a file name; without a folder, look in `~/Downloads/`. Read it with the `Read` tool (images
render visually; for a PDF also run `pdftotext -layout <file> -` so no small print is missed). One file is one event;
if it announces several unrelated events, ask which to add (or add each separately).

## 2. Extract the event

Write the text from the source, in Czech; do not invent facts. Leave out what the source does not say.

| Field                  | How to fill it                                                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                   | ASCII kebab-case from the title (`hody-ceska`); must be unique across `src/content/news/`. Add the year when the title repeats yearly (`farni-den-2026`). Also the file name prefix.    |
| `slug`                 | Omit: it is generated from the title. Set it only when that would collide with another event or a filter page (`tyden`, `mesic`, `dlouhodobe`, `vse`, `archiv`).                        |
| `title`                | The headline, sentence case (not the poster's capitals). **Required.**                                                                                                                  |
| `start`, `end`         | ISO dates. `end` only for multi-day events. A date without a year is the next such date from today.                                                                                     |
| `time`                 | Free text: `"9:30"`, `"18:00–20:30"`. Omit for all-day events.                                                                                                                          |
| `place`                | `"Kuřim, kostel sv. Maří Magdalény"`, `"Kuřim, fara"`, `"Tišnov"`. **Required.** Add `mapQuery` when the place alone would not find it on Mapy.cz.                                      |
| `text`                 | 1–2 sentences for the cards. **Required.** No URLs.                                                                                                                                     |
| `lead`                 | Optional: one inviting sentence under the detail title (also the page description). Defaults to `text`.                                                                                 |
| `body`                 | Optional HTML for "O akci": `<p>`, `<strong>`, `<ul><li>`. Use it when the source has more than `text` says; keep it to a few short paragraphs. Links go to `links`, not into the body. |
| `program`              | Rows `{ time, title, note? }` when the source has a programme.                                                                                                                          |
| `links`                | `{ label, href }` for every web address and e-mail (`mailto:`) in the source, with a readable label.                                                                                    |
| `price`                | `"300 Kč"`, `"zdarma"`, when stated.                                                                                                                                                    |
| `registrationDeadline` | ISO date of "přihlášky do …".                                                                                                                                                           |
| `sessions`             | Number of meetings of a course or series (`start` = first, `end` = last).                                                                                                               |
| `longTerm`             | `{ weeklyAt: "18:30" }` for a weekly series (weekday of `start`), `true` for other long-running events.                                                                                 |
| `highlights`           | Only for real key facts or numbers (anniversaries); usually omit.                                                                                                                       |
| `label`                | A short free tag only when nothing above fits.                                                                                                                                          |
| `pinned`               | Only when the user asks for "Doporučujeme". At most one: remove `pinned` from the previous event.                                                                                       |
| `calendarEventId`      | Ask whether the event is in the "Události" Google Calendar; if the user gives its event ID, set it (links the calendar entry to the detail page).                                       |

## 3. Pick the label

The source file is attached under one of these labels (shown on the page; the script names the file
`<id>-<label in ASCII>.<ext>`):

| Label       | When                                      |
| ----------- | ----------------------------------------- |
| `Plakát`    | Poster or visual flyer                    |
| `Pozvánka`  | Invitation to a specific event            |
| `Program`   | Schedule or order of proceedings          |
| `Leták`     | Handout-style flyer                       |
| `Informace` | General information                       |
| `Oznámení`  | Plain announcement without strong visuals |

Check the name before confirming (it refuses a taken name, a bad id or label, and files over 10 MB):

```sh
pnpm stage aktualita "<source>" <id> <label> --title "<title>" --check
```

## 4. Confirm with the user

Show the extracted fields (and the label) in a short list. Point out guesses: the year, an inferred end date,
`longTerm`. Wait for corrections before writing anything.

## 5. Stage the files

Run the same command without `--check`. It copies the file to `uploads/aktuality/` and, for `Plakát`, `Pozvánka`
and `Leták`, renders the poster WebP next to it (`--poster` / `--no-poster` overrides that; a text-only document
gets the designed placeholder). It prints the `poster` and `attachments` lines for the record, with the size.

## 6. Add the record

Add the event to the file of its **start month**, `src/content/news/<year>/<MM>.ts` (`2026/10.ts` for an event
starting in October 2026), in start-date order; a multi-day event goes by its `start`. Use the `UPLOADS` constant
for file URLs (`import { UPLOADS } from "../uploads";`, add it if the file lacks it); paste the lines `pnpm stage`
printed:

```ts
  {
    id: "hody-ceska",
    title: "Hody v České",
    start: "2026-10-02",
    end: "2026-10-04",
    place: "Česká",
    text: "Srdečně zveme na tradiční hody v České – stavění máje, průvod a koncert.",
    poster: { src: `${UPLOADS}/hody-ceska-plakat.webp`, alt: "Plakát: Hody v České" },
    attachments: [{ label: "Plakát", file: `${UPLOADS}/hody-ceska-plakat.png`, size: 1240000 }],
  },
```

The attachment is the original file (the full-size link); the poster is only the WebP. Finished events stay in
the file: the archive lists them.

The first event of a new year starts its folder: create `news/<year>/<MM>.ts` (`export const january: NewsEvent[]`,
named after the month as in `2026/`), a `news/<year>/index.ts` joining the months like `2026/index.ts`, and add it
first in `events` in `news/index.ts`. The previous year's events keep their title slugs, so leave them out of
`pastYears` there.

## 7. Publish

Follow **`farnost-publish-content`** (browser check of `/aktuality/<slug>/`, commit, upload and push).
If the event has no `calendarEventId`, remind the user to add it to the "Události" Google Calendar, so it shows in
the Kalendář.

## Common mistakes

- Copying the poster's capitals into `title`, or its whole text into `body`: keep `text` short and `body` brief.
- Putting URLs or e-mails into `text`/`body` instead of `links`.
- Guessing a year or end date silently: say it in the confirmation.
- Staging (without `--check`) before the user confirms: an abandoned file would go out with the next release.
- Pinning a second event without unpinning the first.
