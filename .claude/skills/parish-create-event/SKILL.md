---
name: parish-create-event
description: Add a new event (an "aktualita") to the new farakurim.cz site from a poster, invitation or announcement given as a PDF, PNG or JPG, or from the details alone - extract the event, confirm it with the user, add it, stage the poster and attachments for upload, then publish. Use whenever the user wants to add, post or publish an event ("aktualita", "plakát", "pozvánka"). An event already on the site is corrected with parish-correct-event.
---

# Create an event

Read the source, extract one event, confirm it with the user, add it (with its files, if it has any, staged by
`pnpm stage event`), then finish with **`parish-publish-content`**.
The fields and how they are shown are specified in `design/DESIGN.md` §11.7 and §13.4.

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
| `id`                   | ASCII kebab-case title and start year (`hody-ceska-2026`): the URL `/aktuality/<id>/` and the files' prefix.                                                |
| `title`                | The headline, sentence case (not the poster's capitals). **Required.**                                                                                      |
| `start`, `end`         | ISO dates. `end` only for multi-day events. A date without a year is the next such date from today.                                                         |
| `startTime`            | `"18:00"` (H:MM). Omit for all-day events.                                                                                                                  |
| `endTime`              | `"20:30"`, when the source gives an end; only with `startTime`, and after it.                                                                               |
| `place`                | `"Kuřim, kostel sv. Maří Magdalény"`, `"Kuřim, fara"`, `"Tišnov"`. **Required.** Add `mapQuery` when the place alone would not find it on Mapy.cz.          |
| `text`                 | 1–2 sentences for the cards. **Required.** No URLs.                                                                                                         |
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

## 3a. Pick the labels and the order (only with files)

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
(an MP3 never becomes one; it refuses any file but a PDF, PNG, JPG, WebP or MP3). Check the names before confirming (it refuses a taken name, a bad or taken id, a label
without letters or digits and two labels giving the same file name):

```sh
pnpm stage event <id> "<source>" "<label>" ["<source>" "<label>" …] [--no-poster] --check
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
inferred end date, `longTerm`. For a pinned event, say which event loses "Doporučujeme" (the `Would unpin …` line of
the step 3a command run with `--record`, or of step 3b).

Wait for the user's yes or corrections to these before staging or adding anything.

## 5a. Stage the files and add the record (only with files)

Write the confirmed event as JSON to `record.json` in the session's scratchpad (never in the repo): the fields
from step 2, without `published`, `poster` and `attachments`. A `poster.alt` you write (e.g. with the date) is
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

Then run the step 3a command without `--check`, with the record:

```sh
pnpm stage event <id> "<source>" "<label>" ["<source>" "<label>" …] [--no-poster] --record <scratchpad>/record.json
```

## 5b. Add the record (only without a file)

Update `record.json` from step 3b with the confirmed event, then add it:

```sh
pnpm add-event <scratchpad>/record.json
```

The output of step 5a or 5b means (5b stages nothing):

- An error (a bad field, a taken `id`, a pin on an event that has already ended): nothing was staged. Fix
  `record.json` and run the same command again.
- The `Události …` lines (the event in the Google Calendar the Kalendář reads): the release applies them, and its
  preview shows them to the user. Only an `ask:` line needs the user now: give it to them with its two ways out:
  paste the page URL into the description of the Události event that is this one, or, when none of them is, add the
  event in Události by hand with the page URL in its description (the page's "Přidat do kalendáře" file can be
  imported once the release is out). Until then nothing changes. Otherwise there is nothing to do in the calendar by
  hand.

## 6. Publish

Follow **`parish-publish-content`** (commit, upload and push). The release applies the `Události` lines; if an
`ask:` line is still open, remind the user of it, so the event shows in the Kalendář with its link.

## Unattended run

Only when the prompt says the run is **unattended** (the events workflow gives a mailed event, a known-events file and
a report file); a local run follows steps 1 to 6 as written. An unattended run follows them too, with these changes:

- **The source** is the prompt's mail folder: `subject.txt`, `body.txt` (the mail's new text) and `attachments/`. One
  mail may hold several events. Group the attachments into events, each attachment in exactly one group or dropped:
  the body says which belongs where, else what the files show (the same title, date or place), else their names. One
  attachment is one event; unrelated attachments are one event each; related ones are one event. In each group the
  visual one (`Plakát`/`Pozvánka`) is the poster, first; the others are its attachments with the labels of step 3a.
  Drop an attachment no event can be made from (a signature, a logo, a file without event information), but keep one
  that belongs to an event (a programme, a form, a map). An unclear grouping is a blocking question showing your best
  grouping.
- **Reading a PDF:** run `pdftotext -layout <file> -` first and `Read` only its first page (`pages: "1"`), to see
  the poster; read further pages only when the text is empty or garbled (a scan). Each page read is an image.
- **Title:** with one event, the subject, corrected (sentence case, typos). With several events, each from its own
  poster; the subject may confirm or correct the one it clearly names. **Text:** from the body, corrected, formatted
  and filled in from the attachments; never invent a fact. Without attachments, the event is the subject (its title)
  and the body (its text), with no poster and no warning (step 1's question is not asked).
- **Pin:** `pinned` only when the mail asks for "Doporučujeme" in so many words.
- **Refuse corrections.** A subject or body saying an event changes is a correction, whatever the form, with or
  without diacritics: `oprav-` (oprava, opraveno), `změn-`/`mění` (změna, změněno, mění se), `upřesn-`, `aktualiz-`,
  "nový termín/čas", `posun-`, `přesun-`/`přesouvá`, `odlož-`/`odkládá`, `zruš-`/`ruší` (zrušeno, zrušena), `nekoná`,
  `odpadá`. Decide which event the word refers to (with one event, a word anywhere applies to it); that event is
  refused, the others go ahead.
- **Refuse duplicates.** Compare each event with the known-events file (`where`: `main` or an open PR's number): the
  same event under any title (same date, time and place, or the same poster) is refused. An uncertain match is a
  blocking question, not a refusal. A different event whose id is taken gets the date id the refusal gives.
- It never asks and never waits: every "confirm with the user" or "ask the user" step writes into the report
  instead. The scratchpad is the prompt's (`record.json`; write nothing in the repo); the files are staged in
  `uploads/` as usual (step 5a or 5b, one event after another). Skip the `--check` runs of steps 3a and 3b: step 5a
  or 5b checks everything first and stages nothing when it refuses, so fix `record.json` and run it again.
- Write the report first, then stage, then fill in each event's `Outcome:` line from what the script did, and add any
  line it printed for the user (the `Události` lines, an unpinned event) to the report. An `ask:` line is a blocking
  question offering both answers: which candidate is this event (its description gets the page URL), or none of them
  (the event is then added in Události by hand with the page URL in its description). A script refusal is
  `refused: <its message>`.
- Skip step 6: no `parish-publish-content`, no commit, no release. The workflow commits and opens the PR.

**The report** is English, with site content quoted in Czech, and starts with exactly these two lines:

```
blocking: yes|no
commit: <message>
```

`blocking: yes` when any question is blocking (its answer changes what is published). `commit:` is the PR's title
and the squash commit on `main`: `feat(content): add the <title> event` for one event created,
`feat(content): add <n> events` for several.

Then, per event, in the mail's order (a mail with no event in it, such as a thank-you with a logo, has no event
section: the workflow refuses it):

- `## <title>` (as published);
- one line `Outcome: created` or `Outcome: refused: <reason>` (a correction: `refused: a correction of <id>; make it
with parish-correct-event`; a duplicate: `refused: already in <main or PR #n> as <id>`);
- for a created event, only what the PR's diff does not show: where the title came from (the subject, the poster)
  and the guesses (step 4), not the fields or the files;
- `### Questions`, one per line: `- **q1** (blocking|note) <where>: <question> — proposal: <proposal>`.

Then `## Dropped attachments` (each as "attachment 3, an image without event information": never its file name) and
`## Mirror in the calendar` (the `Události` lines as printed, none left out or reworded). The PR is public: quote
only what is published (the fields, the staged files' names and labels); describe the rest of the mail without
quoting it.

## Common mistakes

- Copying the poster's capitals into `title`, or its whole text into `body`: keep `text` short and `body` brief.
- Putting URLs or e-mails into `text`/`body` instead of `links`.
- Guessing a year or end date silently: say it in the confirmation.
- Going on without a file and without the warning in step 1: the user may have a poster to add.
- Staging (without `--check`) before the user confirms: an abandoned file would go out with the next release.
- Adding a new event by hand instead of `--record` (or `pnpm add-event`): the order and `published` are then up
  to you.
- Editing `pinned` by hand: a pinned `--record` moves the pin itself.
- Listing the poster after another file: only the first file becomes the poster (afterwards, only
  `pnpm event-poster` changes it).
- Forgetting `--no-poster` when the first file is a text-only PDF (`Program`, `Informace`, `Oznámení`): its first
  page becomes the poster.
