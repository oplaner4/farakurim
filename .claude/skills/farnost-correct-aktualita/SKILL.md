---
name: farnost-correct-aktualita
description: Correct an aktualita (event) already on the new farakurim.cz site - fix its text, date, time, place, programme or links through a corrected record with pnpm replace-aktualita, or stage a corrected or added poster or attachment with --corrected, then publish. Use whenever the user says an aktualita is wrong or has changed (moved, new time or place), brings a corrected plakát or pozvánka, or wants to add a file to an event already there. A new aktualita is added with farnost-create-aktualita, the pin is moved with farnost-pin-aktualita.
---

# Correct an aktualita

A corrected record goes in with `pnpm replace-aktualita`, a corrected or added file with
`pnpm stage aktualita --corrected`.

## 1. Find the aktualita

Look for the event the user names (title, date, place) in `src/content/news/` and take its `id`. When the
description fits several events or none, list the candidates (id, title, dates) and ask.

The `id` never changes: it is the detail page's URL, in shared links and in the Události calendar. It holds the
start year, so a start in another year cannot be corrected: tell the user so and stop.

## 2. Write the corrected record

Copy the record whole into `record.json` in the session's scratchpad (never in the repo), with its `poster`,
`attachments`, `published` and `pinned`, and change only what is wrong:

- a corrected poster or invitation: read it as **`farnost-create-aktualita`** step 1 reads a source, compare it
  with the record and take over every difference;
- a correction the user describes: change those fields.

The fields follow **`farnost-create-aktualita`** step 2.

## 3. Check

Only the record changes:

```sh
pnpm replace-aktualita <scratchpad>/record.json --check
```

A corrected or added file (the record on the site is used without `--record`):

```sh
pnpm stage aktualita "<source>" <id> "<label>" [--no-poster] --corrected [--record <scratchpad>/record.json] --check
```

The file replaces the attachment with the same `label`, so take the label from `attachments`; another label adds a
file. An image or PDF also replaces the poster unless you pass `--no-poster`, as in **`farnost-create-aktualita`**
step 3a.

Both print the fields that change (`Changed: …`); the stage command also the file it would stage.

## 4. Confirm with the user

Show the user, in Czech, each changed field as old → new, and the file with whether it becomes the poster. The
`Changed:` line must list only the fields you meant to change: another field there means the record was not copied
whole.

Wait for the user's yes or corrections to these before replacing or staging anything.

## 5. Replace

Run the step 3 command without `--check`. Show the Události calendar lines it prints unless they say `linked`.
After a change of date, time, title or place, ask the user to change the event in the Události calendar too: after
a new date the check reports it `missing` and writes an `.ics`, but importing it would add a second event, so the
existing one is moved instead.

## 6. Publish

Follow **`farnost-publish-content`**.

## Common mistakes

- Editing a record in `src/content/news/` by hand instead of `pnpm replace-aktualita`.
- Writing `record.json` from scratch: the poster, attachments or `published` get lost (see `Changed:`).
- Changing the `id`: shared links and the calendar link break.
- Changing `pinned` in `record.json`: it is refused; pin with **`farnost-pin-aktualita`**.
- Staging a corrected poster under another label: the old attachment stays next to the new one.
- Importing the `.ics` after a date change instead of moving the Události event.
