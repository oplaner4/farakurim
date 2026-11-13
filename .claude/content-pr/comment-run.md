# Comment run on a content PR

What every comment run shares: a maintainer's `/fix` comment on an events or service sheets PR, answered in CI
(`content-fix-run.yml`). A local run never reads this file. The kind's "Comment run" section says which correction
steps apply, what a comment may change and what is out of bounds; this file says how the run works and what it
writes.

## The run

- **Input:** the prompt's folder holds `comment.md` (the maintainer's instruction, the only request), `report.json` (the
  PR's full JSON report) and maybe `check.md` (a failed check). The scratchpad and the report file
  are the prompt's; write nothing in the repo besides what the scripts stage. It never asks and never waits.
- **Facts:** the comment is the maintainer's instruction, so a fact in it is made as asked; when no document has the
  fact, the reply says the site will then differ from the parish's document.
- **Check first:** run each correction command with `--check` before it writes, without asking for confirmation, and
  read its `Changed: …` line: when it lists something the comment did not ask to change, stop with
  outcome `unchanged` and say why. A question in the comment is answered in the reply.
- **Fix a check:** when `check.md` shows a failure the PR's content causes, fix it the same way; a failure outside the
  content (a script, the build) is not fixed, and the reply says so.
- **Out of bounds:** anything the kind does not allow is answered without a change (`fix.json` outcome `unchanged`), and the
  reply says what to do instead.
- **Skip the publish step:** no `parish-publish-content`, no commit, no release.

## The report

Two JSON files, both English with site content quoted in Czech, that `pnpm content-pr check` validates (below;
strict: an unknown field is an error).

- **`report.json`**: the PR's full report (the input file), corrected **in place**. Change only what the table
  allows; every other field, entry and question stays exactly as it is, and the check refuses any other difference:

  | Where             | May change                                                                                        | Stays as it is                                                                         |
  | ----------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
  | a question        | an `open` one the comment answers: `"status": "resolved"` and the answer in `answer`              | `id`, `blocking`, `where`, `text`, `proposal`, a `resolved` one; none added or removed |
  | an event (events) | only when this run changed its record: `title` (as the record's), `origin`, new `venues` appended | `outcome`, the venues already listed, the events and their order                       |
  | a week (sheet)    | only when this run changed its sheet: `summary`                                                   | `validFrom`, `validTo`, `outcome`, `notOnTheNewest`, `senderNote`, the weeks           |
  | the report        | nothing but its questions, as above                                                               | `version`, `kind`, `droppedAttachments`                                                |

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

Run `pnpm content-pr check --kind <sheet|events> --fix <fix.json> --original <original report> <report.json>` (with
the paths and the kind the prompt gives; the original report is read-only) until it passes. It prints `The report is valid.` or each issue as `<path>: <message>`.
