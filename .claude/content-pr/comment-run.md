# Comment run on a content PR

What every comment run shares: a maintainer's `/fix` comment on an events or service sheets PR, answered in CI
(`content-fix-run.yml`). A local run never reads this file. "The run" and "The report" say how every comment run works
and what it writes; "Events" and "Service sheets" say, for each kind, which correction steps apply, what a comment may
change and what is out of bounds.

## The run

- **Input:** the prompt's folder holds `comment.md` (the maintainer's instruction, the only request), `report.json` (the
  PR's full JSON report) and maybe `check.md` (a failed check). The scratchpad and the report file are the prompt's;
  write nothing in the repo besides what the scripts stage. It never asks and never waits.
- **Facts:** the comment is the maintainer's instruction, so a fact in it is made as asked; when no document has the
  fact, the reply says the site will then differ from the parish's document.
- **Check first:** run each correction command with `--check` before it writes, without asking for confirmation, and
  read its `Changed: …` line: when it lists something the comment did not ask to change, stop with outcome `unchanged`
  and say why. A question in the comment is answered in the reply.
- **Fix a check:** when `check.md` shows a failure the PR's content causes, fix it the same way; a failure outside the
  content (a script, the build) is not fixed, and the reply says so.
- **Out of bounds:** anything the kind does not allow is answered without a change (`fix.json` outcome `unchanged`), and
  the reply says what to do instead, from the kind's list below.
- **No publish step:** the kind's correction skill runs without it: no `parish-publish-content`, no commit, no release.

## Events

The steps of `parish-correct-event` apply, and these:

- **Allowed:** correct an event the PR adds (its record in `src/content/news/`): text, date, time, place, programme,
  links, an attachment's label, and which attachment is the poster, with `pnpm replace-event` and `pnpm event-poster` as
  in step 3.
- **Venue:** a changed place takes its venue as `parish-manage-venues` section E says (a new venue or alias added before
  the record is replaced, shown in the reply with its pin link).
- **Out of bounds:** a new event, dropping, pinning or splitting an event, a file (a comment cannot add one), a date
  change that moves the start year (step 1), an event the PR does not hold, anything else. Instead: close the PR, push a
  commit, run `parish-create-event` or `parish-correct-event` locally, or `parish-pin-event` after the merge.
- **No server:** never run `pnpm pull-uploads`; when an attachment's file is missing, answer outcome `unchanged` and say
  the file is missing.

## Service sheets

The steps of `parish-correct-service-sheet` apply, and these:

- **Allowed:** correct a week the PR holds (services, intentions, announcements) in its record only, as there is no
  DOCX: write `record.json` from the sheet as step 2 says, then run
  `pnpm replace-sheet <scratchpad>/record.json --from <validFrom> --to <validTo>`.
- **Out of bounds:** a replaced sheet PDF or DOCX (a comment cannot add a file), a week the PR does not hold, anything
  else. Instead: push a commit, run `parish-correct-service-sheet` locally with the file, or correct it after the merge.

## The report

Two JSON files, both English with site content quoted in Czech, that `pnpm content-pr check` validates (below;
strict: an unknown field is an error).

- **`report.json`**: the PR's full report (the input file), corrected **in place**. Change only what the table allows;
  every other field, entry and question stays exactly as it is, and the check refuses any other difference:

  | Where             | May change                                                                           | Stays as it is                                                                         |
  | ----------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
  | a question        | an `open` one the comment answers: `"status": "resolved"` and the answer in `answer` | `id`, `blocking`, `where`, `text`, `proposal`, a `resolved` one; none added or removed |
  | an event (events) | only when this run changed its record: `origin`                                      | `outcome`, a refused event's `title`, the events and their order                       |
  | a week (sheet)    | nothing                                                                              | `validFrom`, `validTo`, `outcome`, `senderNote`, the weeks                             |
  | the report        | nothing but its questions, as above                                                  | `kind`, `droppedAttachments`                                                           |

  The script derives the PR's draft state from the open blocking questions and names its commit, so a doubt the
  comment leaves open goes in the reply, never in a new question.

- **`fix.json`**: this comment's result:

  ```json
  {
    "outcome": "changed",
    "fixMessage": "fix(content): correct the time of the concert",
    "reply": "The concert now starts at 18:00."
  }
  ```

  `outcome` is `changed` or `unchanged` and must agree with whether the run changed any content file (`unchanged`:
  nothing was staged or replaced). `fixMessage` is the Conventional Commits message of this commit alone, for example
  `fix(content): correct the time of the concert`; with `unchanged`, write `fix(content): no change`. `reply` is a
  few lines for the maintainer: what changed, or why nothing did; it never holds `<!-- content-fix:` (the marker the
  workflow adds itself), which the check refuses.

Quote only what is published, never the comment itself: the PR and both files are public, in **every** field.

Run the check the prompt gives until it passes (the original report it names is read-only). It prints
`The report is valid.` or each issue as `<path>: <message>`.
