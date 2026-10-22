# Events by e-mail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New events e-mailed to `aktuality@farakurim.cz` become one `events/*` PR per mail, released by the content
release on merge; corrections and duplicates are refused.

**Architecture:** First the content release replaces its "pushed by hand" rule with a check of the PR's new upload
links. Then a shared mail module (senders + IMAP) serves both mail pipelines, `pnpm event-mail` fetches one accepted
mail at a time and lists the known events, `parish-create-event` gains an unattended run, and
`.github/workflows/events.yml` mirrors `service-sheet.yml` (two jobs, Claude without the App key) with one mail per
run, dispatching itself again while accepted mail remains (at most 5 per cron start).

**Tech Stack:** TypeScript (tsx, vitest), `imapflow`, `mailauth`, `mailparser`, GitHub Actions,
`anthropics/claude-code-action`, PHP (cron dispatch).

**Spec:** `docs/superpowers/specs/2026-10-22-events-email-pipeline-design.md` (and, for Task 1,
`docs/superpowers/specs/2026-10-22-content-release-design.md`)

### Where this deviates from the spec (decided here)

1. **The link check runs inside `pnpm content-release apply`**, not a separate subcommand: `apply` already fails the
   step and its last line already becomes the failure comment (`content-release.yml`, step `apply`).
2. **Up to 5 mails: one mail per run, chained.** A run handles the oldest accepted mail; when more remain and the
   input `chain` is below 5, its last step dispatches `events.yml` again with `chain + 1` (`GITHUB_TOKEN` may dispatch
   `workflow_dispatch`). The cron starts with `chain` 1. Each run sees the PRs of the runs before it, and the two-job
   split stays as in `service-sheet.yml`.
3. **Incomplete mail is judged by script** (no usable attachment and no subject or no body): refused before Claude.

## Global Constraints

- Senders: shared `fara.kurim@seznam.cz` → `seznam.cz`, `oplaner4@seznam.cz` → `seznam.cz`; sheets = shared exactly
  (`oplaner4@gmail.com` dropped); events = shared + `milancisar@centrum.cz` → `centrum.cz`.
- Mailbox folders `Zpracováno` (processed) and `Odmítnuto` (rejected). Mailbox `aktuality@farakurim.cz`, environment
  `events-publish` (`IMAP_HOST` variable, `IMAP_USER`, `IMAP_PASSWORD` secrets).
- Attachments handed to Claude: `.pdf`, `.png`, `.jpg`, `.jpeg` (written as `.jpg`), `.webp`, case-insensitive; others
  ignored.
- Branch `events/<mail date, Prague, yyyy-MM-dd>` with `-2`, `-3` … when taken; one PR per mail, never updated by a
  later mail; draft when `blocking: yes`; conversation locked.
- Artifact `content-uploads-<sha>`, paths under `aktuality/`, retention 30 days; the patch may touch only
  `src/content/news/<year>/<MM>.json`.
- The run fails on: an accepted sender's mail with nothing new (refused or incomplete); a known sender failing DKIM; a
  technical failure (mail stays unread). Green otherwise. No e-mail is sent.
- Logs, summaries and the PR never carry message text, a stranger's address or a dropped file's name; known senders'
  addresses may be named.
- Scripts rules: entry point = header + `runCommand()`; logic in `scripts/lib/`; English; the scripts check
  `pnpm format && pnpm test:scripts && pnpm lint && pnpm exec tsc --noEmit`; commits through the `commit` skill.

## Review Focus

1. A mail whose only attachment is `.JPEG` or `.PDF` (upper case) → handed to Claude, written as `.jpg`/`.pdf`.
   Tested in Task 3.
2. A reply mail with the previous mail quoted (`>` lines, "Dne … napsal(a):") and a `-- ` signature → the body handed
   to Claude holds only the new text. Tested in Task 3.
3. A PR that resolves a conflict by hand and moves an event to another month → its links are not new, so it is
   released. Tested in Task 1.
4. Two accepted mails in one fetch → only the oldest is written, `remaining` is 1, the other stays unread. Tested in
   Task 3.
5. An open events PR from a fork named `events/x` → not in the known events. Tested in Task 4.

---

### Task 1: Content release checks new upload links

**Files:**

- Modify: `scripts/lib/content-release/sources.ts`, `plan.ts`, `apply.ts`, `command.ts` and their tests;
  `docs/deployment.md` ("Content release")

**Interfaces:**

- Produces: `uploadLinksAt(rev: string, cwd?: string): Set<string>` and `newUploadLinks(sha: string, cwd?: string):
string[]` (sorted) in `sources.ts`; `ContentPull` gains `sha: string` (the squash commit); `PullCommit` loses `bot`;
  `missingLinks(pulls: ContentPull[], copied: string[], linksOf: (sha: string) => string[]): string[]` in `apply.ts`
  (one message per missing link).

- [ ] **Step 1: Write the failing tests.**
  - `sources.test.ts` "newUploadLinks lists the links a commit adds to src/content": temp repo, commit
    `src/content/news/2026/11.json` linking `/uploads/aktuality/a.pdf`, then a commit adding `/uploads/aktuality/b-plakat.webp`
    and moving the `a.pdf` record to `12.json` → `["/uploads/aktuality/b-plakat.webp"]`; a commit with no link → `[]`
    (git grep exits 1 on no match).
  - `apply.test.ts` "missingLinks names each link no artifact holds": pulls #11 (sha `s1`) and #12 (`s2`), copied
    `["aktuality/x.pdf"]`, `linksOf` `s1 → ["/uploads/aktuality/x.pdf"]`, `s2 → ["/uploads/aktuality/y-r2.pdf"]` →
    `["PR #12 links /uploads/aktuality/y-r2.pdf, which no artifact holds: stage it and release with pnpm release by hand"]`.
  - `plan.test.ts`: "releases a PR with a commit pushed by hand" replaces "blocks on a commit pushed by hand without
    an artifact" (`action: "release"`); the events-legacy case expects `release` with no artifacts for both commits;
    the release case expects `sha` on each pull.

- [ ] **Step 2: Run** `pnpm exec vitest run --project scripts scripts/lib/content-release`. Expected: FAIL.

- [ ] **Step 3: Implement.** `uploadLinksAt`: `git grep -ohE "/uploads/[A-Za-z0-9._/%-]+\.(pdf|png|jpg|webp|mp3)" <rev>
-- src/content` (build the pattern from `UPLOADS_PATH` and `UPLOAD_EXTENSIONS`; strip a `<rev>:` prefix if git
      prints one; exit 1 → empty set). `newUploadLinks(sha)` = links at `sha` minus links at `sha^`. Planner: drop the
      `byHand` branch and `bot`; set `sha` from `mergeSha`. Command `apply`: after `applyArtifacts`, run `missingLinks`
      with `newUploadLinks`; any message → throw them joined by `; ` (the workflow's failure comment shows it). Update the
      module headers and `docs/deployment.md` "Content release" (the hand rule → the link check, its known limit from the
      spec).

- [ ] **Step 4: Run** the scripts check. Expected: pass.

- [ ] **Step 5: Commit** `feat(scripts): release content PRs fixed by hand when their links are covered`.

### Task 2: Shared mail module

**Files:**

- Create: `scripts/lib/mail/senders.ts`, `senders.test.ts`, `scripts/lib/mail/imap.ts`
- Modify: `scripts/lib/services/mailbox.ts` (+test), `scripts/lib/services/sheet-mail.ts` (+test)

**Interfaces:**

- Produces (`senders.ts`): `type Senders = Readonly<Record<string, string>>`; `SHARED_SENDERS`, `SHEET_SENDERS`,
  `EVENT_SENDERS`; `type SenderVerdict = { kind: "accepted"; author: string } | { kind: "rejected"; reason: "sender" |
"dkim"; known?: string }` (`known` = the address when it is in `senders` but DKIM failed);
  `judgeSender(raw: Buffer, senders: Senders, { resolver }?): Promise<SenderVerdict>`.
- Produces (`imap.ts`, moved from `sheet-mail.ts`): `PROCESSED_FOLDER`, `REJECTED_FOLDER`, `Mailbox`,
  `imapMailbox(env)`, `fileMessages(mailbox, { processed, rejected })`, `imapEnv(env?)`.
- `judgeMessage` (sheets) keeps its signature and verdicts, built on `judgeSender(raw, SHEET_SENDERS)`.

- [ ] **Step 1: Write the failing tests** in `senders.test.ts`: accepts `fara.kurim@seznam.cz` and `oplaner4@seznam.cz`
      (seznam.cz-signed) for both lists; accepts `milancisar@centrum.cz` (centrum.cz-signed) with `EVENT_SENDERS`, refuses
      it (`sender`) with `SHEET_SENDERS`; refuses `oplaner4@gmail.com` (`sender`); a known sender signed by another domain
      → `{ kind: "rejected", reason: "dkim", known: "milancisar@centrum.cz" }`; a stranger failing DKIM → no `known`. Move
      the sender cases of `mailbox.test.ts` here; keep its DOCX cases.
- [ ] **Step 2: Run** the new test. Expected: FAIL.
- [ ] **Step 3: Implement** by moving code (no behaviour change for sheets beyond the list).
- [ ] **Step 4: Run** the scripts check. Expected: pass.
- [ ] **Step 5: Commit** `refactor(scripts): share the mail senders and IMAP code between content workflows` (body:
      sheets drop `oplaner4@gmail.com` for `oplaner4@seznam.cz`).

### Task 3: Fetching an event mail

**Files:**

- Create: `scripts/lib/news/event-mail.ts`, `event-mail.test.ts`, `scripts/event-mail.ts`; `package.json` script
  `event-mail`

**Interfaces:**

- Consumes: `judgeSender`, `EVENT_SENDERS`, `Mailbox`, `fileMessages`, `imapMailbox`, `imapEnv` (Task 2).
- Produces: `type EventMailVerdict = { kind: "event"; date: Date; subject: string; body: string; attachments: { name:
string; content: Buffer }[] } | { kind: "incomplete"; date: Date } | SenderVerdict & { kind: "rejected" }`;
  `judgeEventMail(raw, { resolver }?)`; `mailText(text: string): string` (body cleaning);
  `type EventMailOutcome = { mailUid?: number; date?: string; rejected: number[]; incomplete: number[]; knownDkim:
string[]; remaining: number; summary: string[] }`; `fetchEventMail(mailbox, outDir, { resolver }?)`;
  `parseCommand`/`execute` for `fetch --out <dir>` and `file --processed <uids> --rejected <uids>` (Task 4 adds two).
- Written for the picked mail: `<out>/subject.txt`, `<out>/body.txt`, `<out>/attachments/NN-<ascii slug>.<ext>`
  (`01`, `02` … in the mail's order; `slug` from `@/lib/shared/slug` on the base name).

- [ ] **Step 1: Write the failing tests** (`mailMessage`/`dkimSigned` helpers; extend `mailMessage` with optional
      `subject` (default `Pořad bohoslužeb`) and `text` (a `text/plain` part before the files) options):
  - accepts a mail with one `.PDF` and one `.JPEG` → attachments `01-….pdf`, `02-….jpg`; an `.docx` and a `.zip` are
    ignored;
  - `incomplete` for no usable attachment and an empty subject, and for one and an empty body; `event` for no
    attachment with both;
  - `mailText`: drops `>` lines, an "Dne … napsal(a):" line and everything after it, everything after a `-- ` line;
    trims;
  - `fetchEventMail` with two accepted mails, a stranger and an incomplete one → writes only the oldest event mail,
    `remaining: 1`, `rejected` holds the stranger and the incomplete uid, `incomplete` the latter, the summary holds
    no subject, text or address of the stranger; a known sender failing DKIM → in `rejected` and `knownDkim`;
  - `parseCommand(["fetch", "--out", "d"])` and the `file` form, as `sheet-mail.test.ts` checks them.
- [ ] **Step 2: Run** the test. Expected: FAIL.
- [ ] **Step 3: Implement**; entry point header as `scripts/sheet-mail.ts` (usage, env `IMAP_HOST`, `IMAP_USER`,
      `IMAP_PASSWORD`).
- [ ] **Step 4: Run** the scripts check. Expected: pass.
- [ ] **Step 5: Commit** `feat(scripts): fetch event mails one at a time`.

### Task 4: Known events and the id guard

**Files:**

- Create: `scripts/lib/news/known-events.ts`, `known-events.test.ts`
- Modify: `scripts/lib/news/event-mail.ts` (commands `known --out <file>` and `check-ids <known.json>`)

**Interfaces:**

- Produces: `type KnownEvent = { id: string; title: string; start: string; end?: string; startTime?: string; place:
string; where: "main" | number }`; `upcomingEvents(events: NewsEvent[], today: string): KnownEvent[]` (ends, or
  starts, on or after today; `where: "main"`); `pullEvents(base: NewsEvent[], branch: NewsEvent[], number: number):
KnownEvent[]` (records new or changed in the branch); `openEventPulls(repo, token, fetchImpl?): Promise<{ number:
number; branch: string }[]>` (open PRs, head `events/`, head repo = `repo`); `takenIds(known: KnownEvent[], added:
string[]): string[]` (added ids that an open PR holds).

- [ ] **Step 1: Write the failing tests:** `upcomingEvents` keeps a long-term event started last year and drops one
      ended yesterday; `pullEvents` returns an added and a changed record with the PR number, not an unchanged one;
      `openEventPulls` (stubbed fetch, as `sources.test.ts`) drops a fork's `events/x`, a `service-sheet/` PR and keeps
      ours; `takenIds(known with koncert-2026 in PR 12, ["koncert-2026", "pout-2026"])` → `["koncert-2026"]`.
- [ ] **Step 2: Run** the test. Expected: FAIL.
- [ ] **Step 3: Implement.** `known`: today in Prague, `readEvents(NEWS_DIR)`; for each open PR `git fetch origin
<branch>` and read its news via `git show origin/<branch>:<file>` for the files `git diff --name-only
origin/main...origin/<branch> -- src/content/news` names; writes JSON. `check-ids`: ids in `NEWS_DIR` not in `HEAD`'s
      news, against the file; prints and throws on any taken id.
- [ ] **Step 4: Run** the scripts check. Expected: pass.
- [ ] **Step 5: Commit** `feat(scripts): list the known events for the events mail`.

### Task 5: The skill's unattended run

**Files:**

- Modify: `.claude/skills/parish-create-event/SKILL.md`

- [ ] **Step 1: Write** in step 2's `id` row: a different event whose title-and-year id is taken gets
      `<title>-<start date>` (`kurz-vedoucich-ministrantu-2026-09-12`). Add `## Unattended run` (after step 6, before
      "Common mistakes"), modelled on `parish-create-service-sheet`'s: the source is the prompt's mail folder; grouping,
      titles, text, dropped attachments, no-attachment events, the pin, the trigger words (copied from the spec) and the
      duplicate check against the prompt's known-events file, exactly as the spec's "Reading a mail into events" and
      "Refused events" say; never asks, writes questions into the report (blocking when the answer changes what is
      published); stages with step 5a/5b; skips step 6. The report: line 1 `blocking: yes|no`, line 2 `commit: <message>`
      (`feat(content): add the <title> event`, several: `feat(content): add <n> events`); per event `## <title>` with one
      `Outcome: created` or `Outcome: refused: <reason>`; `### Questions` as in the sheet skill; `## Dropped attachments`
      (neutral descriptions, no file names); `## Mirror in the calendar` (the `Události` lines). Only published values are
      quoted.
- [ ] **Step 2: Check** `pnpm format` and that the skill's description line is unchanged.
- [ ] **Step 3: Commit** `docs(skills): run parish-create-event unattended on a mailed event`.

### Task 6: The workflow and the cron

**Files:**

- Create: `.github/workflows/events.yml`, `cron-scripts/events.php`
- Modify: `scripts/lib/uploads-path.test.ts` (UPLOADS in `events.yml`, and a new EVENTS copy of `EVENTS_FOLDER`)

- [ ] **Step 1: Write the failing test:** `workflowEnv("events.yml", "UPLOADS")` and `"EVENTS"` match `UPLOADS_PATH`
      and `EVENTS_FOLDER` (without slashes). Run it: FAIL.
- [ ] **Step 2: Write `events.yml`** from `service-sheet.yml`, with these differences only:
  - `on: workflow_dispatch` with input `chain` (default `1`); concurrency group `events`, never cancelled; env
    `UPLOADS`, `EVENTS: aktuality`; environment `events-publish` for both jobs. Its federation rule is the
    environment variable `ANTHROPIC_FEDERATION_RULE_ID` of `events-publish` (it overrides the repository variable the
    sheet workflow uses; the other three `ANTHROPIC_*` variables stay repository-wide).
  - Job `event`: `pnpm --silent event-mail fetch --out "$RUNNER_TEMP/event/mail"` (outputs `mail`, `rejected`,
    `incomplete`, `known_dkim`, `remaining`, `summary`, `date`); `pnpm --silent event-mail known --out
"$RUNNER_TEMP/event/known.json"` with `github.token`; no LibreOffice (poppler only); no PR lookup: a new branch
    named per Global Constraints from `main`; Claude's prompt: run `parish-create-event` unattended on the mail folder,
    report `$RUNNER_TEMP/event/report.md`, known events file, scratchpad `$RUNNER_TEMP/event`; tools as the sheet's with
    `Bash(pnpm stage event:*)`, `Bash(pnpm add-event:*)` instead of `pnpm stage sheet`; collect the patch of
    `src/content/news` and the staged files into `$run/uploads/$EVENTS/`.
  - Job `publish`: apply only if every patched path matches `^src/content/news/[0-9]{4}/[0-9]{2}\.json$`; then `pnpm
--silent event-mail check-ids "$run/known.json"`; outcome check: each `## ` section other than `Questions`,
    `Dropped attachments`, `Mirror in the calendar` has one `Outcome:` line, `created` or `refused: `; no patch and
    only refusals → mail refused (filed `Odmítnuto`, run fails); test, build, commit, push, open the PR (never
    update), lock it, draft on `blocking: yes`, upload `content-uploads-<sha>` (`path: ${{ runner.temp
}}/run/uploads/`, 30 days); file the mail (`Zpracováno` with a PR, `Odmítnuto` refused, unread on failure) with
    the stranger/incomplete uids; summary; fail on refusal, incomplete or `known_dkim`.
  - Last step (job `publish`, `if: always()` after filing, `permissions: actions: write`): when `remaining > 0` and
    `chain < 5`, `gh workflow run events.yml -f chain=$((chain + 1))` with `github.token`.
- [ ] **Step 3: Write `cron-scripts/events.php`** as `service-sheet.php` with `dispatchWorkflow('events.yml')`.
- [ ] **Step 4: Run** the scripts check and `python3 -c` YAML parse of `events.yml`. Expected: pass.
- [ ] **Step 5: Commit** `ci(events): open a PR for each mailed event`.

### Task 7: Docs

**Files:**

- Modify: `docs/deployment.md`, `README.md` (§ Content: that events can arrive by mail)

- [ ] **Step 1: Write** "Events by e-mail" after "Service sheet by e-mail": senders, what one mail becomes, what is
      refused and how the maintainer learns of it (the failing cases), the PR and merging (conflicts by hand, link check),
      setup (mailbox, environment `events-publish`, a federation rule `subject_prefix` exactly
      `repo:oplaner4@38047115/farakurim@1403139652:environment:events-publish`, the cron line), first run by the
      maintainer (an agent never logs in to the mailbox). Update the sheet section's sender list.
- [ ] **Step 2: Run** `pnpm format`. Expected: no diff after.
- [ ] **Step 3: Commit** `docs: describe events by e-mail`.
