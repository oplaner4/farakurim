# Event runs in CI

Only for a run whose prompt says it is **unattended** (`events.yml`) or a **comment run** on an events PR
(`content-fix-run.yml`). A local run never reads this file: it follows the steps of **`parish-create-event`** and
**`parish-correct-event`** as written. Both runs follow those steps too, with the changes below.

## Unattended run

Steps 1 to 6 of `parish-create-event` apply with these changes:

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
  blocking question, not a refusal. A different event whose id is taken gets the date id the refusal's `next:` line
  gives.
- It never asks and never waits: every "confirm with the user" or "ask the user" step writes into the report
  instead. The scratchpad is the prompt's (`record.json`; write nothing in the repo); run step 5a or 5b one
  event after another. Skip the `--check` runs of steps 3a and 3b: step 5a or 5b checks everything first and stages
  nothing when it refuses, so fix `record.json` and run it again.
- Write the report first, then stage, then fill in each event's `Outcome:` line from what the script did, and add any
  line it printed for the user (an unpinned event) to the report. A script refusal is `refused: <its reason>`:
  the refusal's first line; its `next:` lines say what to do, not what to publish.
- **Venue:** as "Venues" below says (a new venue or alias is written before the event is staged and reported with
  its pin link).
- Skip step 6: no `parish-publish-content`, no commit, no release.

**The report** is English, with site content quoted in Czech, and starts with exactly these two lines:

```
blocking: yes|no
commit: <message>
```

`blocking: yes` when any question is blocking (its answer changes what is published). `commit:` is
`feat(content): add the <title> event` for one event created, `feat(content): add <n> events` for several.

Then, per event, in the mail's order (a mail with no event in it, such as a thank-you with a logo, has no event
section):

- `## <title>` (as published);
- one line `Outcome: created` or `Outcome: refused: <reason>` (a correction: `refused: a correction of <id>; make it
with parish-correct-event`; a duplicate: `refused: already in <main or PR #n> as <id>`);
- for a created event, only what the PR's diff does not show: where the title came from (the subject, the poster)
  and the guesses (step 4), not the fields or the files;
- `### Questions`, one per line: `- **q1** (blocking|note) <where>: <question> — proposal: <proposal>`.

Then `## Dropped attachments` (each as "attachment 3, an image without event information": never its file name). The
PR is public: quote only what is published (the fields, the staged files' names and labels); describe the rest of the
mail without quoting it.

## Comment run

Steps 1 to 5 of `parish-correct-event` apply with these changes:

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
- **Venue:** a changed place takes its venue as "Venues" below says (a new venue or alias added before the record is
  replaced, shown in the reply with its pin link).
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

## Venues

Both runs take an event's venue with **`parish-manage-venues`** (`.claude/skills/parish-manage-venues/SKILL.md`)
sections A to C, but nobody answers: the PR's review is the user's yes, so the report (or the reply) must show what
to check.

- Take a listed venue when the source names it by its name or an alias (case and word endings aside), or plainly
  means it: then add the source's building text as its alias (section C).
- Add a new venue (section B) only when one candidate is plainly the building: its name is the source's building, or
  it is the address the source gives. In a comment run, a venue, an alias or a Mapy.com link the comment names is the
  maintainer's yes.
- Report each, with the pin to check: `New venue <id>: <name>, <address> — pin: <pin link>`,
  `New alias "<text>" for <id>`.
- Anything less certain (several candidates, none, an approximate link): leave `venue` out and write a question
  (`blocking: no`) with the candidates and their pin links.
- Never change a venue (section D): the PR refuses the whole change.
