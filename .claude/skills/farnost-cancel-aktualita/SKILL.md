---
name: farnost-cancel-aktualita
description: Cancel or postpone an aktualita (event) already on the new farakurim.cz site, or drop one meeting of a series, by setting its change or cancelledMeetings through a corrected record with pnpm replace-aktualita, then publish. Use whenever the user says an aktualita is cancelled ("ruší se", "nekoná se", "zrušeno"), postponed or moved to another date ("přesouvá se", "odkládá se"), or a meeting of a series is dropped ("odpadá"), or such a change is withdrawn. Other corrections (text, time, place, files, poster) are made with farnost-correct-aktualita, a new aktualita is added with farnost-create-aktualita.
---

# Cancel or postpone an aktualita

The record stays, as people may have saved, shared or imported it (design/DESIGN.md §11.9): its `change` (or
`cancelledMeetings`) makes the site show the status itself, on the cards, the detail page, the calendars and in the
`.ics`. It goes in with `pnpm replace-aktualita`, like every corrected record.

## 1. Find the aktualita

Look for the event the user names (title, date, place) in `src/content/news/` and take its `id`. When the
description fits several events or none, list the candidates (id, title, dates) and ask.

The `id` never changes: it is the detail page's URL, in shared links and in the Události calendar. It holds the
start year, so an event cannot be moved to another year: tell the user so and stop.

A pinned event cannot be cancelled: unpin it first with **`farnost-pin-aktualita`** (`--none`), or pin another event
there.

## 2. Write the corrected record

Copy the record whole into `record.json` in the session's scratchpad (never in the repo), with its `poster`,
`attachments`, `published` and `pinned`, and add the change. Keep its title, `text` and `tags` as they are (no
"(zrušeno)", no "Zrušeno" tag).

- **"Zrušeno"**: add `"change": { "status": "cancelled", "announced": "<today>", "note": "<reason>" }`.
- **"Přesunuto"**: set `start`, `end` and `time` to the new date and add
  `"change": { "status": "moved", "previousStart": "<old start>", "announced": "<today>", "note": "<reason>" }`.
  Add `previousTime` when the time changed too.
- **A dropped "setkání"** of a series: add `"cancelledMeetings": { "dates": ["<the meeting's date>"] }`, with an
  optional `note`; the series stays as it is. Another dropped meeting adds its date to `dates`.
- **Withdrawn**: remove `change` (for a move, put `start`, `end` and `time` back from `previousStart` and
  `previousTime`), or the meeting's date from `cancelledMeetings` (the whole key when it was the last one).

`announced` is today's Prague date ("Oznámeno 12. 10. 2026" on the detail page). `note` is one sentence in Czech from
the source, word for word; leave it out when the source gives no reason. A move's `note` follows "Přesunuto ze soboty 17. 10." on the card, so it starts in lower case: `"kvůli předpovědi počasí."`.

## 3. Check

```sh
pnpm replace-aktualita <scratchpad>/record.json --check
```

It prints the fields that change (`Changed: …`).

## 4. Confirm with the user

Show the user each changed field as old → new, and how the site will show it ("Zrušeno: <note>", "Přesunuto ze
<old date> <note>", "Změna: setkání <date> odpadá, ostatní termíny platí."). The `Changed:` line must list only
`change`, `cancelledMeetings` and, for a move, `start`, `end` and `time`: another field there means the record was not
copied whole.

Wait for the user's yes or corrections to these before replacing anything.

## 5. Replace

Run the step 3 command without `--check`. Show the Události calendar lines it prints unless they say `linked`, then
ask the user to change the event in the Události calendar too:

- cancelled: put "Zrušeno: " in front of its title, which the website shows as cancelled (§16.4), and do not delete
  it; a dropped meeting gets the same prefix on that meeting only;
- moved: move the existing event to the new date. The check reports it `missing` and writes an `.ics`, but importing
  it would add a second event.

## 6. Publish

Follow **`farnost-publish-content`**.

## Common mistakes

- Deleting a cancelled aktualita, or marking it with a "Zrušeno" tag or "(zrušeno)" in the title instead of
  `change`.
- Moving an event without `previousStart`: the card cannot say where it moved from.
- Cancelling a whole series when only one meeting is dropped: use `cancelledMeetings`.
- Writing `record.json` from scratch or editing `src/content/news/` by hand instead of `pnpm replace-aktualita`.
- Deleting a cancelled event from the Události calendar instead of adding "Zrušeno: " to its title, or importing the
  `.ics` after a move instead of moving the Události event.
