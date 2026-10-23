# Events by e-mail: design

Status: draft. New events ("aktuality") e-mailed to the events mailbox become `events/*` PRs; the maintainer's squash
merge releases them through the content release. No plan yet. Date: 2026-10-22.

## Intent

Today a poster or invitation reaches the maintainer, who runs `parish-create-event` in Claude Code, confirms the
extracted event and releases with `pnpm release`. The goal is the service sheet pipeline's shape for events: the
parish (or another accepted sender) e-mails the poster, and a pull request with the event is waiting for review; the
maintainer checks it in a few minutes, merges, and the merge releases the site
(`docs/superpowers/specs/2026-10-22-content-release-design.md`, already built).

**Why:** events arrive several times a week from more than one person, and each needs the maintainer at a computer.
The pipeline turns that into a short review that can be done anywhere.

## Goals

- An accepted sender e-mails one or more posters (or only a subject and a text) to `aktuality@farakurim.cz`; each mail
  with something new becomes one PR with its new events, ready to review.
- The pipeline runs the same skill as the maintainer does locally (`parish-create-event`, with a new "Unattended run"
  section), so the rules live in one place.
- Published facts come only from the mail and its attachments; the PR review checks them, as the confirmation step
  does locally today.
- The maintainer learns of every mail from an accepted sender that produced nothing, through a failed run (GitHub
  notifies failures; the pipeline sends no e-mail).

## Non-goals

- **No corrections, cancellations or postponements by mail** (the maintainer's decision: routing a change to the
  right event and PR is too complex). They are refused; the maintainer makes them with `parish-correct-event` and
  `parish-cancel-event`.
- **No `@claude` comments** on the PR yet (later, for both pipelines). A correction before merging is a commit pushed
  to the PR's branch or a local skill run.
- **No rebuilding** of an events PR that conflicts with a merged one: the maintainer resolves it on GitHub (the
  maintainer accepted this) or closes it and the sender resends.
- No e-mail is ever sent, to the senders or anyone else.
- No changes to the Google Calendars by the pipeline: the PR lists the `Události` lines of `pnpm stage event`, and the release applies those calendar changes (the Události calendar sync).
- No schedule exceptions, albums or Petrklíč through this pipeline.

## Anti-goals (a failure even if it works)

- A published event with an invented fact (a guessed year or time presented as certain).
- The same event twice on the site, or a mail meant to correct an event added as a new one.
- An unrelated attachment published (a signature, a logo), or an attachment of one event published under another.
- A red run for every spam message, so the maintainer stops reading the notifications.

## Constraints

- Everything the service sheet pipeline guarantees about Claude stays (`docs/deployment.md` "Service sheet by
  e-mail", `.github/workflows/service-sheet.yml` header): workload identity federation, no API key; Claude writes only
  in its scratch folder, never in the checkout; the job that holds the App key starts from a fresh checkout, applies
  only `src/content/news/<year>/<MM>.json` and has no id-token; the PR conversation is locked; actions pinned by
  commit SHA.
- The repository is public: the run logs and summaries never hold a message's text, a stranger's address, or anything
  but uids, dates, kinds and the reasons below. Accepted senders' addresses are in the repo already and may be named.
- The staged files reach the release only through `content-uploads-<sha>` artifacts with every path under
  `aktuality/` (the content release's contract for the `events` kind).
- English for code, reports and logs; Czech for the site content (CLAUDE.md, `docs/conventions.md`).

## Decisions

### Senders and the mailbox

- Mailbox `aktuality@farakurim.cz` at cesky-hosting.cz, folders `Zpracováno` and `Odmítnuto` (created by the script,
  as for sheets).
- **One sender module for every content workflow**: a shared list plus a list per workflow, each address with the
  domain whose DKIM signature must vouch for it, judged as `scripts/lib/services/mailbox.ts` does today (exactly one
  From header with one address, a passing signature of that domain, not `underSized`).
  - Shared (every content workflow): `fara.kurim@seznam.cz` (seznam.cz), `oplaner4@seznam.cz` (seznam.cz).
  - Service sheets: exactly the shared list (the maintainer). `oplaner4@gmail.com`, accepted for sheets today, is
    dropped. Otherwise the sheet workflow keeps its behaviour (a known sender failing DKIM stays a green, filed mail
    there; my call, to keep this change out of the sheet pipeline).
  - Events: the shared list plus `milancisar@centrum.cz` (centrum.cz). More senders are added later in the module.
  - The tests cover the mechanism with a fake resolver, not every provider's DKIM.

### Which mail is accepted

Judged by script before Claude:

- A stranger or a failed DKIM check of an unknown address: filed in `Odmítnuto`, the run stays green, nothing about
  the message is logged.
- A **known sender whose DKIM check fails** (forwarded, provider changed): filed in `Odmítnuto`, the run **fails**,
  naming the sender.
- An accepted mail's attachments are handed to Claude when they are PDF, PNG, JPG or WebP (the types `pnpm stage
event` takes as a poster; MP3 is not expected by mail). Other attachment types are ignored.
- An accepted mail without such an attachment needs both a subject and a body (text, after quoted replies and the
  signature are left out); without either it is refused (run fails).

### Reading a mail into events (Claude, the skill's unattended run)

- **Grouping:** Claude groups the attachments into events, each attachment in exactly one group or dropped. Clues, in
  order: what the body says, what the files show (the same title, date or place), the file names.
  - One attachment: one event, the attachment its poster.
  - Unrelated attachments: one event each.
  - Related attachments (one event): one group; several groups of related attachments: one event per group.
  - In each group the visual one (`Plakát`/`Pozvánka`) is the poster, listed first; the others are the event's
    attachments with the skill's labels (`Program`, `Přihláška`, `Informace`, …).
  - An attachment no event can be built from (a signature, an inline logo, a file without event information) is
    dropped; an attachment that belongs to an event (a programme, a form, a map) is kept as its attachment, even though
    it is not the poster. A dropped attachment is listed in the report.
  - An unclear grouping is a blocking question showing Claude's best grouping.
- **Title:** with one event, the subject is the title, corrected and formatted (sentence case, typos). With several
  events, each title comes from its own poster; the subject only inspires them (it may confirm or correct the event it
  clearly names).
- **Text:** the body describes the event; it is corrected, formatted and filled from the attachments. Nothing is
  invented: the skill's rules apply (`text`, `lead`, `body`, `program`, `links`, …), and guesses (a year, an end date,
  `longTerm`) are listed in the report.
- **No attachment:** one event, the subject its title and the body its content (both corrected and formatted), no
  poster.
- **Pin ("Doporučujeme"):** only when the mail explicitly asks for it.

### Refused events and refused mails

- **A correction is refused.** A mail (or the part of it about one event) is a correction when its subject or body says
  so with a trigger word, matched case-insensitively, with or without diacritics, by stem: `oprav-` (oprava, opraveno),
  `změn-`/`mění` (změna, změněno, mění se), `upřesn-`, `aktualiz-`, "nový termín/čas", `posun-`, `přesun-`/`přesouvá`,
  `odlož-`/`odkládá`, `zruš-`/`ruší` (zrušeno, zrušena), `nekoná`, `odpadá`. Claude decides which event the word refers
  to (with one event, a word anywhere applies to it).
- **A duplicate is refused**: an event already on `main` or in an open `events/*` PR.
  - By script: the event's `id` is checked against `main` and every open events PR; a taken `id` is never added. A
    taken `id` is not itself a duplicate: the parish repeats titles within a year
    (`kurz-vedoucich-ministrantu-2026-03-06`, `…-2026-09-12`), so a different event under the same title gets the
    date-suffixed `id` the existing records use (`<title>-<start date>`; the skill gains this rule; my call); the
    script's check is a guard.
  - By Claude: the event matches a known one under another title (same date, time and place, the same poster). An
    uncertain match is a blocking question, never a silent refusal.
  - Claude gets the known events as a file prepared by script before its step: the upcoming events on `main` and the
    events every open `events/*` PR of this repo adds (from the diff of its branch against `main`), each with `id`,
    title, date, time, place and where it is (`main` or the PR number).
- **A mixed mail** (new events and refused ones): the new events go into the PR, the report lists each refused one
  with the reason and what to do ("not added: looks like a correction of `koncert-2026`; make it with
  `parish-correct-event`").
- **A mail with nothing new** (only corrections or duplicates, no event in any attachment, a missing subject or body
  without attachments): no PR, filed in `Odmítnuto`, the run fails with the reason.

### When the run fails (the maintainer's decision)

Fails (GitHub notifies the maintainer):

1. A mail from an accepted sender that produced nothing (above).
2. A known sender whose DKIM check fails.
3. A technical failure: Claude's step, a report that does not follow the format, the tests, the build, the commit, the
   PR. The mail stays unread, so a later run retries it.

Stays green: a stranger's mail; a mail that produced a PR (a draft with a question, a mixed mail); no new mail.

### PR

- **One PR per mail**, branch `events/<date of the mail>` (a suffix `-2`, `-3` when taken), squash merge to publish.
  A draft when the report has a blocking question; the conversation locked, as for sheets.
- Title from the report's commit line (`feat(content): add the Svatomartinský průvod event`, or a count for several).
- The body is the report: per event its fields as published (Czech), its files with labels and which is the poster,
  where the title came from, the guesses; the dropped attachments; the refused events; the questions (blocking or
  not); the calendar to-dos (`Události` lines); then the run link and the artifact name.
- The PR is public, so the report quotes only what will be published (the event's fields, the staged files' names
  and labels). Everything else is described neutrally, never quoted: "the title from the subject", "attachment 3, an
  image without event information, dropped" (not its file name), "the body's contact details left out" (my call).
- The staged files go into the artifact `content-uploads-<sha>` of the PR's commit (paths under `aktuality/`, 30
  days), as the content release expects.
- Merge conflicts with another events PR are resolved by the maintainer.

### Runs

- Workflow `.github/workflows/events.yml`, dispatched by the hosting's cron (`cron-scripts/events.php`, as
  `service-sheet.php` dispatches the sheet workflow) or by hand. One run at a time (concurrency group), never
  cancelled.
- A run handles the unread accepted mails **oldest first, at most 5** (rarely more wait; the rest wait for the next
  run). Each mail gets its own Claude run, its own PR and its own artifact, and **each mail's duplicate check sees the
  PRs of the mails before it**.
- Each mail is filed once its outcome is done: `Zpracováno` when its PR exists, `Odmítnuto` when it was refused;
  unread after a technical failure.
- Environment `events-publish` (variable `IMAP_HOST`, secrets `IMAP_USER`, `IMAP_PASSWORD` of the events mailbox), a
  federation rule of its own matching that environment exactly (as `service-sheet-publish` has), the GitHub App and
  its key (`CONTENT_APP_ID`, `CONTENT_APP_PRIVATE_KEY`) shared with the other content workflows.
- Claude's tools: read files, write in its scratch folder, `pnpm stage event … --check`/`--record`, `pnpm add-event`,
  `pdftotext -layout <file> -`, `ls`, `cat`; no git, no network, the checkout denied. Its prompt names the mail's
  folder (subject and body as text files, the attachments), the known-events file, the report file and the scratch
  folder; the rules live in the skill.

### The skill

`parish-create-event` gains an "Unattended run" section, as `parish-create-service-sheet` has: the confirmation step
becomes the report; the mail's subject, body and attachments are the source; grouping, titles, dropped attachments,
refusals and the pin follow the rules above; the report format (first lines `blocking: yes|no` and `commit: …`, then
per event an `Outcome:` line: `created` or `refused: <reason>`) is fixed there, and the workflow checks it.

### Docs and setup

`docs/deployment.md` gets "Events by e-mail" next to "Service sheet by e-mail": what to send, what is refused, the
setup (mailbox, environment, federation rule, cron) and a first run the maintainer does (an agent never logs in to the
mailbox). The privacy page needs no change: no new third-party service reaches visitors.

### Change to the content release (built first)

Fixing an events PR on GitHub must not stop its release. Today `scripts/lib/content-release/plan.ts` blocks a PR
commit not made by the bot without an artifact ("pushed by hand"), because it may link a file staged only on the
maintainer's machine. Events PRs will often need such commits: a text fix pushed to the branch, or a merge conflict
resolved in GitHub's editor (two PRs adding the last event of the same month conflict). The maintainer chose to
replace that rule with a check of the links themselves, for every kind (sheets too):

1. **What a PR needs:** the `/uploads/…` links (the `UPLOAD` pattern of `src/lib/shared/uploads.ts`) found in the
   whole of `src/content/` at the PR's squash commit and not at its parent (`git grep` of both trees). The whole tree,
   not only the changed files, so a link moved or reused from another event is not new.
2. **What the artifacts provide:** the paths `pnpm content-release apply` copied.
3. **The check:** every link of step 1 must be one of step 2, for each PR of the release against its own squash
   commit. One that is not stops the release before anything is uploaded or tagged, and the failure comment names it:
   "Not released: PR #12 links `/uploads/aktuality/koncert-2026-plakat-r2.pdf`, which no artifact holds: stage it
   and release with `pnpm release` by hand."

The planner's "pushed by hand without an artifact" rule goes; the expired-artifact rule and the commit rule stay. A
text fix or a resolved conflict is released; a commit linking a file only the maintainer has is refused. Known limit:
a file re-staged by hand under the **same** name an artifact already holds (the same unreleased poster corrected
again locally) goes out in the artifact's version; a text fix or closing the PR and resending avoids it.
`docs/deployment.md` "Content release" is updated to match.

## Left to the builder

- Where the link check runs (e.g. a `check-links` subcommand of `pnpm content-release` after `apply`) and how the
  failure comment gets its reason.
- How a run handles up to 5 mails while each one's duplicate check sees the earlier mails' PRs (one mail per run with
  the run dispatching itself again, or a loop inside the jobs), keeping the two-job split (Claude's job without the
  App key, the publishing job without an id-token).
- How the shared sender module is laid out and how `sheet-mail` and the new events mail command share the IMAP code.
- The exact report format beyond the lines the workflow checks.
- Where the "known events" script lives and how it reads the open PRs' branches.
- The commit split, with the content release change first.
