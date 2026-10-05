---
name: farnost-create-aktualita
description: Add a new aktualita (event) to the new farakurim.cz site from a poster, invitation or announcement given as a PDF, PNG or JPG - extract the event, confirm it with the user, add a NewsEvent to src/content/news.ts, stage the poster and attachments for the server, then publish. Use whenever the user wants to add, post or publish an aktualita, event, plakát or pozvánka.
---

# Create an aktualita

Read the file, extract one event as a `NewsEvent` (`src/content/types/news.ts`), confirm it with the user, add it to
`src/content/news.ts`, stage its files, then finish with **`farnost-publish-content`**. The fields and how they are
shown are specified in `design/DESIGN.md` §11.7 and §13.4.

## 1. Read the file

The user gives at least a file name; without a folder, look in `~/Downloads/`. Read it with the `Read` tool (images
render visually; for a PDF also run `pdftotext -layout <file> -` so no small print is missed). One file is one event;
if it announces several unrelated events, ask which to add (or add each separately).

## 2. Extract the event

Write the text from the source, in Czech; do not invent facts. Leave out what the source does not say.

| Field                  | How to fill it                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                   | ASCII kebab-case from the title (`hody-ceska`); must be unique in `news.ts` and `news-archive/`. Add the year when the title repeats yearly (`farni-den-2026`). Also the file name prefix. |
| `slug`                 | Omit: it is generated from the title. Set it only when that would collide with another event or a filter page (`tyden`, `mesic`, `dlouhodobe`, `vse`, `archiv`).                           |
| `title`                | The headline, sentence case (not the poster's capitals). **Required.**                                                                                                                     |
| `start`, `end`         | ISO dates. `end` only for multi-day events. A date without a year is the next such date from today.                                                                                        |
| `time`                 | Free text: `"9:30"`, `"18:00–20:30"`. Omit for all-day events.                                                                                                                             |
| `place`                | `"Kuřim, kostel sv. Maří Magdalény"`, `"Kuřim, fara"`, `"Tišnov"`. **Required.** Add `mapQuery` when the place alone would not find it on Mapy.cz.                                         |
| `text`                 | 1–2 sentences for the cards. **Required.** No URLs.                                                                                                                                        |
| `lead`                 | Optional: one inviting sentence under the detail title (also the page description). Defaults to `text`.                                                                                    |
| `body`                 | Optional HTML for "O akci": `<p>`, `<strong>`, `<ul><li>`. Use it when the source has more than `text` says; keep it to a few short paragraphs. Links go to `links`, not into the body.    |
| `program`              | Rows `{ time, title, note? }` when the source has a programme.                                                                                                                             |
| `links`                | `{ label, href }` for every web address and e-mail (`mailto:`) in the source, with a readable label.                                                                                       |
| `price`                | `"300 Kč"`, `"zdarma"`, when stated.                                                                                                                                                       |
| `registrationDeadline` | ISO date of "přihlášky do …".                                                                                                                                                              |
| `sessions`             | Number of meetings of a course or series (`start` = first, `end` = last).                                                                                                                  |
| `longTerm`             | `{ weeklyAt: "18:30" }` for a weekly series (weekday of `start`), `true` for other long-running events.                                                                                    |
| `highlights`           | Only for real key facts or numbers (anniversaries); usually omit.                                                                                                                          |
| `label`                | A short free tag only when nothing above fits.                                                                                                                                             |
| `pinned`               | Only when the user asks for "Doporučujeme". At most one: remove `pinned` from the previous event.                                                                                          |
| `calendarEventId`      | Ask whether the event is in the "Události" Google Calendar; if the user gives its event ID, set it (links the calendar entry to the detail page).                                          |

## 3. Name the files

The source file is attached under one of these labels (the label is shown on the page; the file name is ASCII):

| Label       | When                                      | File name              |
| ----------- | ----------------------------------------- | ---------------------- |
| `Plakát`    | Poster or visual flyer                    | `<id>-plakat.<ext>`    |
| `Pozvánka`  | Invitation to a specific event            | `<id>-pozvanka.<ext>`  |
| `Program`   | Schedule or order of proceedings          | `<id>-program.<ext>`   |
| `Leták`     | Handout-style flyer                       | `<id>-letak.<ext>`     |
| `Informace` | General information                       | `<id>-informace.<ext>` |
| `Oznámení`  | Plain announcement without strong visuals | `<id>-oznameni.<ext>`  |

Allowed: images, PDF, audio, video. If the file is over 10 MB, ask the user for a smaller one.

## 4. Confirm with the user

Show the extracted fields (and the label) in a short list. Point out guesses: the year, an inferred end date,
`longTerm`. Wait for corrections before writing anything.

## 5. Stage the files

```sh
mkdir -p uploads/aktuality
cp "<source>" "uploads/aktuality/<id>-plakat.<ext>"
stat -c %s "uploads/aktuality/<id>-plakat.<ext>"   # → attachment size
```

A visual source (poster, invitation, flyer) also becomes the event's poster: render it to WebP (page 1 of a PDF,
or a scaled-down image), staged next to the original.

```sh
python3 scripts/poster-webp.py "uploads/aktuality/<id>-plakat.<ext>" "uploads/aktuality/<id>-plakat.webp"
```

Skip the poster for a text-only document (`Informace`, `Oznámení`): the page then shows the designed placeholder.

## 6. Add the record

Add the event to `events` in `src/content/news.ts`, among the current events in start-date order (before
`...archivedEvents`). Use the `UPLOADS` constant for file URLs:

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

## 7. Publish

Follow **`farnost-publish-content`** (browser check of `/aktuality/<slug>/`, commit, upload and push).
If the event has no `calendarEventId`, remind the user to add it to the "Události" Google Calendar, so it shows in
the Kalendář.

## Common mistakes

- Copying the poster's capitals into `title`, or its whole text into `body`: keep `text` short and `body` brief.
- Putting URLs or e-mails into `text`/`body` instead of `links`.
- Guessing a year or end date silently: say it in the confirmation.
- File names with diacritics or spaces, or the label missing from the attachment.
- Pointing `poster.src` at a PDF (it must be the WebP) or forgetting the attachment `size`.
- Pinning a second event without unpinning the first.
