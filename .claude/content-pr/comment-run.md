# Comment run on a content PR

What every comment run shares: a maintainer's `/fix` comment on an events or service sheets PR, answered in CI
(`content-fix-run.yml`). A local run never reads this file. The kind's "Comment run" section says which correction
steps apply, what a comment may change and what is out of bounds; this file says how the run works and what it
writes.

## The run

- **Input:** the prompt's folder holds `comment.md` (the maintainer's instruction, the only request), `report.md` (the
  PR's report, with its two header lines) and maybe `check.md` (a failed check). The scratchpad and the report file
  are the prompt's; write nothing in the repo besides what the scripts stage. It never asks and never waits.
- **Facts:** the comment is the maintainer's instruction, so a fact in it is made as asked; when no document has the
  fact, the reply says the site will then differ from the parish's document.
- **Check first:** run each correction command with `--check` before it writes, without asking for confirmation, and
  read its `Changed: …` line: when it lists something the comment did not ask to change, stop with
  `Outcome: unchanged` and say why. A question in the comment is answered in the reply.
- **Fix a check:** when `check.md` shows a failure the PR's content causes, fix it the same way; a failure outside the
  content (a script, the build) is not fixed, and the reply says so.
- **Out of bounds:** anything the kind does not allow is answered without a change (`Outcome: unchanged`), and the
  reply says what to do instead.
- **Skip the publish step:** no `parish-publish-content`, no commit, no release.

## The report

The report is the input report updated, English with site content quoted in Czech, and starts with exactly these
three lines:

```
blocking: yes|no
commit: <message>
fix: fix(content): <what this comment changed>
```

`commit:` is the PR title as the input has it, describing everything the PR holds (change it only when the comment
changes what the PR holds). `fix:` is this commit alone, for example `fix(content): correct the time of the concert`.
With `Outcome: unchanged`, still write the line, as `fix: fix(content): no change`. Keep the sections (events or
weeks) the comment did not touch as they are and every question id (`q1`, `q2`, …); mark an answered question with
its answer and `resolved` in its parentheses (`(blocking, resolved)`); set `blocking:` from the questions still open. Quote only what is published, never the comment itself.

Then `## Reply`, the report's last section, led by one line `Outcome: changed` or `Outcome: unchanged`, then a few
lines for the maintainer: what changed, or why nothing did.
