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

Two JSON files, both English with site content quoted in Czech; their schemas are in
`scripts/lib/content-pr/report-schema.ts` (strict: an unknown field is an error).

- **`report.json`**: the PR's full report (the input file), corrected **in place**. Keep the sections (events or
  weeks) the comment did not touch as they are and every question id (`q1`, `q2`, …). Update what the comment
  changed (a changed event's `origin`, a week's `summary`). Mark a question the comment answered
  `"status": "resolved"` and put the answer in `"answer"`. Write no `blocking`, `commit` or `fix` line: the script
  derives the draft state from the questions still open and names the PR's commit.
- **`fix.json`**: this comment's result:

  ```json
  {
    "version": 1,
    "outcome": "changed",
    "fixMessage": "fix(content): correct the time of the concert",
    "reply": "The concert now starts at 18:00."
  }
  ```

  `outcome` is `changed` or `unchanged` and must agree with whether the run changed any content file (`unchanged`:
  nothing was staged or replaced). `fixMessage` is the Conventional Commits message of this commit alone, for example
  `fix(content): correct the time of the concert`; with `unchanged`, write `fix(content): no change`. `reply` is a
  few lines for the maintainer: what changed, or why nothing did.

Quote only what is published, never the comment itself: the PR and both files are public, in **every** field.

Run `pnpm content-pr check --kind <sheet|events> --fix <fix.json> <report.json>` (with the paths and the kind the
prompt gives) until it passes. It prints `The report is valid.` or each issue as `<path>: <message>`.
