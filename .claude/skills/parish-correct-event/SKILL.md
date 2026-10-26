---
name: parish-correct-event
description: Correct an event (an "aktualita") already on the site - fix its text, date, time, place, programme or links, replace or add its poster or an attachment, or make another attachment its poster (or remove the poster), then publish. Use whenever the user says an event ("aktualita") is wrong or has changed (new time or place), brings a corrected poster or invitation ("plakát", "pozvánka"), wants to add a file to an event already there, or says its poster is the wrong file or should go. A cancelled or postponed event, or a dropped meeting of a series, is handled by parish-cancel-event, a new event is added with parish-create-event, the pin is moved with parish-pin-event.
---

# Correct an event

A corrected record goes in with `pnpm replace-event`, a corrected or added file with
`pnpm stage event --corrected`, and another poster with `pnpm event-poster`.

## 1. Find the event

The records are in `src/content/news/<year>/<MM>.json`, in the file of their **start** month. Look for the event
the user names (title, date, place) and take its `id`. When the description fits several events or none, list the
candidates (id, title, dates) and ask.

The `id` never changes: it is the detail page's URL, in shared links and in the Události calendar. It holds the
start year, so a start in another year cannot be corrected: tell the user so and stop.

## 2. Write the corrected record

Copy the record whole into `record.json` in the session's scratchpad (never in the repo), with its `poster`,
`attachments`, `published` and `pinned`, and change only what is wrong:

- a corrected poster or invitation: read it as **`parish-create-event`** step 1 reads a source, compare it
  with the record and take over every difference;
- a correction the user describes: change those fields;
- a cancellation, a postponement or a dropped meeting: stop and follow **`parish-cancel-event`** instead.

The fields follow **`parish-create-event`** step 2.

## 3. Check

Only the record changes:

```sh
pnpm replace-event <scratchpad>/record.json --check
```

Corrected or added files, only those (the record on the site is used without `--record`):

```sh
pnpm stage event <id> "<source>" "<label>" ["<source>" "<label>" …] --corrected [--record <scratchpad>/record.json] --check
```

A file replaces the attachment with the same `label`, so take the label from `attachments`; another label adds a
file at the end. The other attachments stay. The poster is rendered again when the file it was made from is
corrected; otherwise it changes only as below.

Another attachment (an image or PDF) as the poster, or no poster:

```sh
pnpm event-poster <id> "<label>" --check   # or: pnpm event-poster <id> --none --check
```

When it says the attachment's file is not here, run `pnpm pull-uploads` first.

They all print the fields that change (`Changed: …`); the stage command also the files it would stage, the poster
command the poster it would render.

## 4. Confirm with the user

Show the user each changed field as old → new, and each file with whether it changes the poster. The
`Changed:` line must list only the fields you meant to change: another field there means the record was not copied
whole.

Wait for the user's yes or corrections to these before replacing or staging anything.

## 5. Replace

Run the step 3 command without `--check`. The release brings the Události calendar in line.

## 6. Publish

Follow **`parish-publish-content`**.

## Comment run

Only when the prompt says the run is a **comment run** on an events PR; steps 1 to 5 apply with these changes:

- **Input:** the prompt's folder holds `comment.md` (the maintainer's instruction, the only request), `report.md` (the
  PR's report, with its two header lines) and maybe `check.md` (a failed check). The scratchpad and the report file
  are the prompt's; write nothing in the repo besides what the scripts stage. It never asks and never waits.
- **Facts:** the comment is the maintainer's instruction, so a fact in it is made as asked; when no document has the
  fact, the reply says the site will then differ from the parish's document.
- **Allowed:** correct an event the PR adds (its record in `src/content/news/`): text, date, time, place, programme,
  links, an attachment's label, and which attachment is the poster. Run steps 2 to 5 without asking for confirmation,
  but still run each `--check` and read its `Changed:` line: when it lists fields the comment did not ask to change,
  stop with `Outcome: unchanged` and say why. Use `pnpm replace-event` and `pnpm event-poster`, as in step 3. A
  question in the comment is answered in the reply.
- **Fix a check:** when `check.md` shows a failure the PR's content causes, fix it the same way; a failure outside the
  content (a script, the build) is not fixed, and the reply says so.
- **Out of bounds**, answered without a change (`Outcome: unchanged`): a new event, dropping, pinning or splitting an
  event, a file (a comment cannot add one), a date change that moves the start year (step 1), an event the PR does not
  hold, anything else. The reply says what to do instead: close the PR, push a commit, run `parish-create-event` or
  `parish-correct-event` locally, or `parish-pin-event` after the merge.
- **No server:** never run `pnpm pull-uploads`; when an attachment's file is missing, answer `Outcome: unchanged` and
  say the file is missing.
- **Skip the publish step:** no `parish-publish-content`, no commit, no release.

**The report** is the input report updated, English with site content quoted in Czech, and starts with exactly these
three lines:

```
blocking: yes|no
commit: <message>
fix: fix(content): <what this comment changed>
```

`commit:` is the PR title as the input has it, describing everything the PR holds (change it only when the comment
changes what the PR holds). `fix:` is this commit alone, for example `fix(content): correct the time of the concert`.
With `Outcome: unchanged`, still write the line, as `fix: fix(content): no change`.
Keep the event sections the comment did not touch as they are and every question id (`q1`, `q2`, …); mark an answered
question with its answer; set `blocking:` from the questions still open. Quote only what is published, never the
comment itself.

Then `## Reply`, the report's last section, led by one line `Outcome: changed` or `Outcome: unchanged`, then a few
lines for the maintainer: what changed, or why nothing did.

## Common mistakes

- Editing a record in `src/content/news/` by hand instead of `pnpm replace-event`.
- Writing `record.json` from scratch: the poster, attachments or `published` get lost (see `Changed:`).
- Changing the `id`: shared links and the calendar link break.
- Changing `pinned` in `record.json`: it is refused; pin with **`parish-pin-event`**.
- Staging a corrected file under another label: the old attachment stays next to the new one.
- Changing `poster` in `record.json` by hand instead of `pnpm event-poster`: its WebP would not exist.
- Removing or reordering attachments with the stage command: change `attachments` in `record.json` and run `pnpm
replace-event`.
- Changing, moving or deleting the Události event by hand after a date change: the release moves it.
- Moving a postponed event to its new date as a plain correction: a postponement needs its `change`, with
  **`parish-cancel-event`**.
