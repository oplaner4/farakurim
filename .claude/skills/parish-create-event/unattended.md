# Event runs in CI

Only for a run whose prompt says it is **unattended** (`events.yml`). A local run never reads this file: it follows the
steps of **`parish-create-event`** as written. The unattended run follows those steps too, with the changes below. A
comment run on an events PR follows `.claude/content-pr/comment-run.md` instead.

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
- Write the report first, then stage, then fill in each event's `outcome` from what the script did, and add any
  line it printed for the user (an unpinned event) to the report. A script refusal is an outcome `refused` with the
  refusal's first line as its `reason`; its `next:` lines say what to do, not what to publish.
- **Venue:** as `parish-manage-venues` section E says (a new venue or alias is written before the event is staged and
  reported with its pin link).
- Skip step 6: no `parish-publish-content`, no commit, no release.

**The report** is the JSON file the prompt names (`report.json`), English with site content quoted in Czech, and
`pnpm content-pr check` validates it (below; strict: an unknown field is an error). It holds every event of the mail,
in the mail's order, with every field below (the optional ones may be left out):

```json
{
  "kind": "events",
  "events": [
    {
      "title": "Koncert scholy",
      "outcome": { "kind": "created", "id": "2026-12-12-koncert-scholy" },
      "origin": "The title is from the poster; the time is a guess from the body.",
      "venues": [
        {
          "kind": "new",
          "id": "kostel-sv-jana",
          "name": "Kostel sv. Jana Křtitele",
          "address": "Kostelní 1, Kuřim",
          "pin": "https://mapy.com/s/example"
        },
        { "kind": "alias", "id": "kostel-sv-jana", "text": "v kostele" }
      ],
      "questions": [
        {
          "id": "q1",
          "blocking": false,
          "status": "open",
          "where": "venue",
          "text": "Two candidates for the venue.",
          "proposal": "Leave it out."
        }
      ]
    },
    {
      "title": "Zájezd",
      "outcome": {
        "kind": "refused",
        "reason": "a correction of 2026-12-05-zajezd; make it with parish-correct-event"
      },
      "venues": [],
      "questions": []
    }
  ],
  "questions": [],
  "droppedAttachments": ["attachment 3, an image without event information"]
}
```

- `events`: one entry per event of the mail (a mail with no event in it, such as a thank-you with a logo, has none:
  `[]`). The workflow matches the `created` entries with the events the change adds by `id`, and refuses the change
  when they differ or when a `title` is not exactly (character for character) the record's `title`. `outcome.kind` is `created` (with the event's
  `id`) or `refused` (with a `reason`: for a correction `a correction of <id>; make it with parish-correct-event`,
  for a duplicate `already in <main or PR #n> as <id>`, for a script refusal its first line).
- `origin` (optional, for a created event): only what the PR's diff does not show: where the title came from (the
  subject, the poster) and the guesses (step 4), not the fields or the files.
- `venues`: what this event's venue work added, as `parish-manage-venues` section E says, each shown with what to check: `kind: "new"`
  for a new venue (`id`, `name`, `address`, `pin`: the Mapy.com link of the pin to check), `kind: "alias"` for a
  new alias (`id` of the venue, `text` the alias). `[]` for none.
- `questions` (of an event, and the report-level ones for the mail as a whole, such as an unclear grouping): `id` is
  `q<number>` from `q1`, unique in the whole report. `status` is `open`; a question whose answer changes what is
  published is `blocking: true`, else `false` (a note). `where` says what it is about; `proposal` is optional.
- `droppedAttachments`: one line per dropped attachment, as "attachment 3, an image without event information":
  never its file name. `[]` for none.
- Write no `blocking`, `commit` or draft state: the script derives the PR's draft state from the open blocking
  questions and names the commit from the events.
- The PR is public and the report fills its body: in **every** field, quote only what is published (the fields, the
  staged files' names and labels) and describe the rest of the mail without quoting it.

Run `pnpm content-pr check --kind events <report file>` (the report file as the prompt gives it) until it passes. It
prints `The report is valid.` or each issue as `<path>: <message>`; fix the report and run it again.
