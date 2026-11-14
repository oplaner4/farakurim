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
  refused (outcome `correction`), the others go ahead.
- **Refuse duplicates.** Compare each event with the known-events file (`where`: `main` or an open PR's number): the
  same event under any title (same date, time and place, or the same poster) is refused (outcome `duplicate`). An
  uncertain match is a blocking question, not a refusal. A different event whose id is taken gets the date id the
  refusal's `next:` line gives.
- It never asks and never waits: every "confirm with the user" or "ask the user" step writes into the report
  instead. The scratchpad is the prompt's (`record.json`; write nothing in the repo); run step 5a or 5b one
  event after another. Skip the `--check` runs of steps 3a and 3b: step 5a or 5b checks everything first and stages
  nothing when it refuses, so fix `record.json` and run it again.
- Write the report first, then stage, then give each staged event its record's `id` and each refused one its
  `outcome`, and add any line the script printed for the user (an unpinned event) to the report. A script refusal is an
  outcome `refused` with the refusal's first line as its `reason`; its `next:` lines say what to do, not what to
  publish.
- **Venue:** as `parish-manage-venues` section E says (a new venue or alias is written before the event is staged; the
  PR body lists it with its pin link).
- Skip step 6: no `parish-publish-content`, no commit, no release.

**The report** is the JSON file the prompt names (`report.json`), English with site content quoted in Czech, and
`pnpm content-pr check` validates it (below; strict: an unknown field is an error). It holds every event of the mail,
in the mail's order, with every field below (the optional ones may be left out):

```json
{
  "events": [
    {
      "id": "2026-12-12-koncert-scholy",
      "origin": "The title is from the poster; the time is a guess from the body.",
      "questions": [
        {
          "blocking": false,
          "where": "venue",
          "text": "Two candidates for the venue.",
          "proposal": "Leave it out."
        }
      ]
    },
    {
      "title": "Zájezd",
      "outcome": { "kind": "correction", "of": "2026-12-05-zajezd" },
      "questions": []
    },
    {
      "title": "Pouť do Lukova",
      "outcome": { "kind": "duplicate", "of": "pout-do-lukova-2026", "where": 12 },
      "questions": []
    }
  ],
  "questions": [],
  "droppedAttachments": ["attachment 3, an image without event information"]
}
```

| Field                | Holds                                                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `events`             | one entry per event of the mail, in its order; `[]` for a mail with none (a thank-you with a logo)                                       |
| `id`                 | a staged event only: its record's `id`; the script records it as created                                                                 |
| `title`              | a refused event only (it has no record): what the mail calls it; a staged event's title is its record's                                  |
| `outcome`            | a refused event only: why it is not published (below)                                                                                    |
| `origin`             | optional, a staged event only: what the diff does not show, where the title came from (the subject, the poster) and the guesses (step 4) |
| `questions`          | an event's, and at the top level the mail's as a whole, such as an unclear grouping (below)                                              |
| `droppedAttachments` | one line per dropped attachment, as "attachment 3, an image without event information", never its file name                              |

A list with nothing in it is `[]`.

- **`outcome`:** one of
  - `{ "kind": "correction", "of": "<id>" }`: the mail corrects, cancels or moves the known event `<id>`;
  - `{ "kind": "duplicate", "of": "<id>", "where": "main" | <PR number> }`: the event is already there as `<id>`,
    where the known-events file says;
  - `{ "kind": "refused", "reason": "<the first line of the script's refusal>" }`.

  The PR body and the job summary write a correction and a duplicate out ("a correction of … make it with
  parish-correct-event", "already in PR #12 as …").

- **Matching:** the workflow matches the entries with an `id` with the events the change adds, and refuses the
  change when they differ. The PR body names each by its record's title.
- **A question:** `blocking` is `true` when its answer changes what is published, else `false` (a note); `where`
  says what it is about; `proposal` is optional. Write no `id` or `status`: the script numbers the questions and opens
  them.
- Write no `kind`: the workflow knows it.
- Write no draft state or commit message: the script derives the PR's draft state from the open blocking questions
  and names the commit from the events.
- The PR is public and the report fills its body: in **every** field, quote only what is published (the fields, the
  staged files' names and labels) and describe the rest of the mail without quoting it.

Run `pnpm content-pr check --kind events --run --known <known-events file> <report file>` (both files as the prompt
gives them) until it passes. It also checks each refusal's event: a `duplicate` must be in the known-events file where
`where` says, a `correction` of an event in it or on the site. It
prints `The report is valid.` or each issue as `<path>: <message>`; fix the report and run it again.
