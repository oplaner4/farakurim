# Service sheet by e-mail, phase 1 (mail → PR) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The parish's DOCX e-mailed to `porad@farakurim.cz` becomes, by the next morning, a locked PR in which
Claude ran the service sheet skills unattended; the maintainer merges it and releases locally as today.

**Architecture:** A daily workflow `service-sheet.yml` (environment `service-sheet`) reads the mailbox with a small
script (`pnpm sheet-mail`), runs `claude-code-action` (workload identity federation) with a short prompt that runs
`parish-create-service-sheet` / `parish-correct-service-sheet` in their new "Unattended run" mode, then tests, builds,
commits with a GitHub App token, opens or updates the PR (draft when a question blocks) and locks
it, and files the e-mail. No comment workflow and no release job (phase 2).

**Tech Stack:** TypeScript scripts (tsx, vitest), `imapflow`, `mailparser`, `mailauth` (dev
dependencies), GitHub Actions, `anthropics/claude-code-action@v1`, `actions/create-github-app-token`.

**Spec:** `docs/superpowers/specs/2026-10-16-service-sheet-email-pipeline-design.md` (§1–§5, "Claude authentication",
"GitHub setup", "Phases" 1).

## Global Constraints

- Code, comments, messages, docs, the report and the PR text in English; site content quoted in Czech.
- `scripts/<command>.ts` is only a `runCommand()` entry point documenting the command; logic and tests in
  `scripts/lib/` (`.claude/rules/structure.md`); helpers shared by two scripts go to a shared module.
- Dependencies with caret ranges, pnpm only; check each new library with context7 before using it (`CLAUDE.md`).
- Actions pinned by commit SHA with the version in a comment, runner `ubuntu-24.04`, as `check.yml` does.
- The accepted sender: exactly `fara.kurim@seznam.cz`, lowercased, dots significant; DKIM `d=seznam.cz` verified on
  the raw message; an `Authentication-Results` header is never trusted.
- The DOCX is written to `$RUNNER_TEMP` and never uploaded, cached, logged or committed; deleted at the job's end.
- No e-mail is ever sent. The mailbox is read and filed over IMAP (port 993, TLS) only, and only by the workflow:
  no agent logs in to it, locally or in CI.
- No `ANTHROPIC_API_KEY` anywhere; the Claude step gets `anthropic_federation_rule_id`, `anthropic_organization_id`,
  `anthropic_service_account_id`, `anthropic_workspace_id` from repository variables and `id-token: write`.
- Claude's tools: Read, Write, Edit, Bash limited to `pnpm stage sheet`, `pdftotext` and read-only commands; no git,
  no push, no web. The App token exists only in the steps after Claude's.
- Every job of the workflow runs in the environment `service-sheet`; the PR branch is
  `service-sheet/<date of the e-mail, YYYY-MM-DD>`; at most one open sheet PR, a later e-mail adds a commit to it.
- Commit messages: Conventional Commits (`build:` scripts, `ci:` workflows, `docs(skills):` skills,
  `docs:` README/deployment); validate with `pnpm exec commitlint`; never `--no-verify`; end with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Checks: a change under `scripts/` only: `pnpm format && pnpm test:scripts && pnpm lint && pnpm exec tsc --noEmit`;
  a workflow or skill change: `pnpm format` (Prettier checks YAML and Markdown).

## Review Focus

- A sender written with a display name and capitals ("Fara Kuřim <Fara.Kurim@seznam.cz>") is the accepted sender
  (Task 1 test "accepts the address in any case and with a display name").
- An attachment named `Pořad bohoslužeb 2026.DOCX` counts as the DOCX (Task 1 test "matches the extension in any
  case").
- A message with several DKIM signatures is accepted when one of them passes for `d=seznam.cz`, and refused when only
  another domain's passes (Task 1 test "needs a passing seznam.cz signature").
- A run with no new mail exits green without calling Claude or touching git (Task 4 step "no mail, no run").
- An open sheet PR exists: the run works on its branch and adds a commit instead of opening a second PR (Task 4
  step "find the open PR"; verified in Task 5's dry run).

---

## File Structure

| File                                                                                                                 | Responsibility                                                               |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Create `scripts/lib/services/mailbox.ts` + test                                                                      | Judge one raw message: sender, DKIM, the one DOCX; pick the newest           |
| Create `scripts/lib/services/sheet-mail.ts` + test                                                                   | Fetch unseen INBOX, write the DOCX, file messages (IMAP behind an interface) |
| Create `scripts/sheet-mail.ts`                                                                                       | `pnpm sheet-mail fetch` / `file` entry point                                 |
| Modify `.claude/skills/parish-create-service-sheet/SKILL.md`, `.claude/skills/parish-correct-service-sheet/SKILL.md` | "Unattended run" section                                                     |
| Create `.github/workflows/service-sheet.yml`                                                                         | The daily mail → PR workflow                                                 |
| Modify `package.json`, `pnpm-lock.yaml`                                                                              | Dependencies and the two commands                                            |
| Modify `README.md`, `docs/deployment.md`                                                                             | The new path and the one-time setup                                          |

---

### Task 1: Judge a message (`mailbox.ts`)

**Files:**

- Create: `scripts/lib/services/mailbox.ts`, `scripts/lib/services/mailbox.test.ts`
- Modify: `package.json` (dev dependencies `mailauth`, `mailparser`, `@types/mailparser` if needed)

**Interfaces:**

- Produces:
  - `export const SENDER = "fara.kurim@seznam.cz"`, `export const DKIM_DOMAIN = "seznam.cz"`
  - `type Verdict = { kind: "sheet"; date: Date; docx: { name: string; content: Buffer } } | { kind: "rejected"; reason: "sender" | "dkim" } | { kind: "no-docx"; date: Date; count: number }`
  - `judgeMessage(raw: Buffer, { resolver }?: { resolver?: DnsResolver }): Promise<Verdict>` — `resolver` is passed to
    mailauth's DKIM verification (tests give a fake DNS); the default is the real DNS.
  - `pickNewest(verdicts: { uid: number; verdict: Verdict }[]): { sheet?: number; superseded: number[] }` — the uid
    of the newest `sheet` by its `date`, and the other sheets' uids.

Rules: the `From` address (mailparser) lowercased must equal `SENDER`, else `sender`; mailauth's DKIM results must
contain a `pass` whose signing domain is exactly `DKIM_DOMAIN`, else `dkim`; then the attachments whose file name
ends with `.docx` (case-insensitive): exactly one → `sheet`, else `no-docx` with their count. The reason never
carries the message's text.

- [ ] **Step 1: Check `mailauth` (signing and `authenticate` with a custom resolver) and `mailparser` with context7.**
- [ ] **Step 2: Write the failing tests.** Fixtures are built in the test: an RSA key pair (`node:crypto`), a MIME
      message with `nodemailer`-free plain text (headers + a base64 `.docx` part), signed with mailauth's `dkimSign`
      for selector `test` and the given domain; the fake resolver answers the `test._domainkey.<domain>` TXT record with
      the public key.

```ts
it("accepts a seznam.cz-signed message from the parish with one DOCX", async () => {
  const raw = await signed(
    message({ from: "fara.kurim@seznam.cz", files: ["Pořad bohoslužeb 2026.docx"] }),
    "seznam.cz",
  );
  const verdict = await judgeMessage(raw, { resolver });
  expect(verdict).toMatchObject({ kind: "sheet", docx: { name: "Pořad bohoslužeb 2026.docx" } });
});
it("accepts the address in any case and with a display name", async () => {
  const raw = await signed(message({ from: "Fara Kuřim <Fara.Kurim@seznam.cz>", files: ["a.docx"] }), "seznam.cz");
  expect((await judgeMessage(raw, { resolver })).kind).toBe("sheet");
});
it("refuses another sender, a dotless variant and an unsigned or wrongly signed message", async () => {
  for (const from of ["farakurim@seznam.cz", "fara.kurim@email.cz"]) {
    const raw = await signed(message({ from, files: ["a.docx"] }), "seznam.cz");
    expect(await judgeMessage(raw, { resolver })).toEqual({ kind: "rejected", reason: "sender" });
  }
  const unsigned = message({ from: "fara.kurim@seznam.cz", files: ["a.docx"] });
  expect(await judgeMessage(unsigned, { resolver })).toEqual({ kind: "rejected", reason: "dkim" });
  const tampered = Buffer.from(
    (await signed(message({ from: "fara.kurim@seznam.cz", files: ["a.docx"] }), "seznam.cz"))
      .toString()
      .replace("Subject: Pořad", "Subject: Jiný"),
  );
  expect(await judgeMessage(tampered, { resolver })).toEqual({ kind: "rejected", reason: "dkim" });
});
it("needs a passing seznam.cz signature", async () => {
  const raw = await signed(message({ from: "fara.kurim@seznam.cz", files: ["a.docx"] }), "evil.example");
  expect(await judgeMessage(raw, { resolver })).toEqual({ kind: "rejected", reason: "dkim" });
  const both = await signed(
    await signed(message({ from: "fara.kurim@seznam.cz", files: ["a.docx"] }), "evil.example"),
    "seznam.cz",
  );
  expect((await judgeMessage(both, { resolver })).kind).toBe("sheet");
});
it("matches the extension in any case and counts the DOCX files", async () => {
  const one = await signed(message({ from: "fara.kurim@seznam.cz", files: ["Pořad.DOCX", "plakat.pdf"] }), "seznam.cz");
  expect((await judgeMessage(one, { resolver })).kind).toBe("sheet");
  const none = await signed(message({ from: "fara.kurim@seznam.cz", files: ["porad.pdf"] }), "seznam.cz");
  expect(await judgeMessage(none, { resolver })).toMatchObject({ kind: "no-docx", count: 0 });
  const two = await signed(message({ from: "fara.kurim@seznam.cz", files: ["a.docx", "b.docx"] }), "seznam.cz");
  expect(await judgeMessage(two, { resolver })).toMatchObject({ kind: "no-docx", count: 2 });
});
it("picks the newest sheet and supersedes the others", () => {
  const sheet = (iso: string) =>
    ({ kind: "sheet", date: new Date(iso), docx: { name: "a.docx", content: Buffer.alloc(0) } }) as const;
  expect(
    pickNewest([
      { uid: 3, verdict: sheet("2026-10-15T10:00:00Z") },
      { uid: 5, verdict: sheet("2026-10-16T08:00:00Z") },
      { uid: 6, verdict: { kind: "rejected", reason: "sender" } },
    ]),
  ).toEqual({ sheet: 5, superseded: [3] });
  expect(pickNewest([])).toEqual({ superseded: [] });
});
```

`message()`, `signed()` and `resolver` are local to this test file.

- [ ] **Step 3: Run to verify they fail** — `pnpm exec vitest run scripts/lib/services/mailbox.test.ts`: FAIL,
      cannot resolve `./mailbox`.
- [ ] **Step 4: Implement `mailbox.ts`** (module header: what is accepted and why the header is not trusted).
- [ ] **Step 5: Run to verify they pass**, then the scripts check.
- [ ] **Step 6: Commit** — `build: judge a service sheet e-mail by its sender, DKIM and DOCX`.

---

### Task 2: Fetch and file the mail (`pnpm sheet-mail`)

**Files:**

- Create: `scripts/lib/services/sheet-mail.ts`, `scripts/lib/services/sheet-mail.test.ts`, `scripts/sheet-mail.ts`
- Modify: `package.json` (dev dependency `imapflow`; script `"sheet-mail": "tsx scripts/sheet-mail.ts"`)

**Interfaces:**

- Consumes: `judgeMessage()`, `pickNewest()`, `Verdict` (Task 1).
- Produces:
  - `interface Mailbox { unseen(): Promise<{ uid: number; source: Buffer }[]>; move(uids: number[], folder: string): Promise<void>; close(): Promise<void> }` (oldest first)
  - `imapMailbox(env: { host: string; user: string; password: string }): Promise<Mailbox>` — imapflow, port 993,
    TLS, INBOX; creates `Zpracováno` and `Odmítnuto` when missing; never marks a message seen.
  - `type MailOutcome = { docx?: string; sheetUid?: number; superseded: number[]; rejected: number[]; noDocx: number[]; summary: string[] }`
  - `fetchSheet(mailbox: Mailbox, outDir: string): Promise<MailOutcome>` — writes the newest sheet's DOCX to
    `outDir` under a fixed ASCII name `porad.docx`, returns the uids by outcome and summary lines (dates and kinds
    only, never subjects, senders' text or file names other than the DOCX's).
  - `fileMessages(mailbox: Mailbox, { processed, rejected }: { processed: number[]; rejected: number[] }): Promise<void>`
    — `processed` → `Zpracováno`, `rejected` → `Odmítnuto`.
  - CLI: `pnpm sheet-mail fetch --out <dir>` prints `MailOutcome` as JSON on stdout; `pnpm sheet-mail file
--processed <uid,…> --rejected <uid,…>`. Credentials from `IMAP_HOST`, `IMAP_USER`, `IMAP_PASSWORD`; missing
    ones throw naming them.

Filing (spec §1): `fetch` moves nothing. The workflow calls `file` at the end with `processed` = the sheet and the
superseded, `rejected` = rejected and no-docx, after the outcome is done (PR, nothing changed, or problem reported).

- [ ] **Step 1: Check `imapflow` with context7** (connect, `search({ seen: false })`, `fetch` with `source`,
      `messageMove`, `mailboxCreate`).
- [ ] **Step 2: Write the failing tests** of `fetchSheet` and `fileMessages` with a fake `Mailbox` (an array of
      messages built with Task 1's test helpers moved to `scripts/lib/test-helpers.ts` as `mailMessage()`, `dkimSigned()`
      and `fakeDkimResolver`), passing the fake resolver through: e.g. three messages (an old sheet, a stranger's, a new
      sheet) → `{ docx: "<outDir>/porad.docx", sheetUid: 3, superseded: [1], rejected: [2], noDocx: [] }` and the file's
      bytes equal the new sheet's DOCX; no unseen mail → `{ superseded: [], rejected: [], noDocx: [] }` and no file;
      `fileMessages` calls `move` once per non-empty list with the right folder. `fetchSheet` takes an optional
      `{ resolver }` passed to `judgeMessage()`.
- [ ] **Step 3: Run to verify they fail** — `pnpm exec vitest run scripts/lib/services/sheet-mail.test.ts`.
- [ ] **Step 4: Implement** `sheet-mail.ts` and the entry point (header: what the command does, that only the
      `service-sheet` workflow runs it, the usage). `imapMailbox()` is not unit-tested; Task 5's dry run proves it.
- [ ] **Step 5: Run the scripts check.**
- [ ] **Step 6: Commit** — `build: fetch and file the service sheet e-mails over IMAP`.

---

### Task 3: The skills' "Unattended run" section

**Files:**

- Modify: `.claude/skills/parish-create-service-sheet/SKILL.md`, `.claude/skills/parish-correct-service-sheet/SKILL.md`

The section text follows spec §2 "The skills get one section". Decisions it fixes:

- It applies only when the prompt says the run is unattended; it names the report file the prompt gives and the
  scratchpad (`$RUNNER_TEMP`).
- **Report format** (`report.md`): first line `blocking: yes` or `blocking: no`; then per week a `## <week>` heading
  with the outcome (`created`, `corrected`, `unchanged`, `refused: …`, `document error: …`), the summary step 3 would
  show, and `### Questions` with `- **q1** (blocking|note) <where>: <question> — proposal: <proposal>`; a final
  `## Zrcadlit v kalendáři` list of services added, changed or removed against the published sheets (Czech rows).
  On a later run, existing question ids are kept and marked `resolved` or `still open`.
- Blocking: a question whose answer changes what is published; the run stages its best reading, never placeholder
  dots (it leaves the record's text as the document has it, without the dots, and asks).
- No `parish-publish-content`, no commit, no release; never asks, never waits.
- The correct skill's section also covers the comment correction of phase 2 in one sentence ("the prompt gives the
  correction as the user's words"), so phase 2 adds no skill text.

- [ ] **Step 1: Write the section in `parish-create-service-sheet`** after "## 5. Publish", and a pointer to it in
      step 3 ("Unattended: write this into the report instead, see …").
- [ ] **Step 2: Write the section in `parish-correct-service-sheet`**, referring to the create skill's report format
      instead of repeating it, with its step 3 pointer.
- [ ] **Step 3: Check** the two skills read consistently (the same report file name, the same first line) and run
      `pnpm format`.
- [ ] **Step 4: Commit** — `docs(skills): run the service sheet skills unattended into a report`.

---

### Task 4: The workflow

**Files:**

- Create: `.github/workflows/service-sheet.yml`

No images in the PR (the maintainer's call): the report is what the skill shows locally, the PR diff shows the change
to `service-sheets.json`, and the staged PDF is in the run's artifact, outside git. The PR step reads the report in a
few shell lines, no script:

- draft or not: only an exact first line `blocking: no` opens a normal PR; anything else (`blocking: yes`, a missing
  or broken line) opens a draft, so a broken report cannot be merged by mistake;
- the body: the report without its first line, verbatim, then a footer: opened by the service sheet workflow, merge
  to publish, the staged PDF in the run's artifacts (the run's URL).

- [ ] **Step 1: Write `service-sheet.yml`** (header comment like `check.yml`'s: what it does, the phase, the
      environment, why the DOCX stays in the job). Triggers `schedule: cron "40 2 * * *"` and `workflow_dispatch`;
      `concurrency: service-sheet`, queued; one job `sheet` in environment `service-sheet` with
      `permissions: { contents: read, pull-requests: read, id-token: write }`. Steps, in order:
  1. checkout `main` (`persist-credentials: false`, `fetch-depth: 0`), pnpm, Node 22, `pnpm install --frozen-lockfile`.
  2. **fetch**: `pnpm sheet-mail fetch --out "$RUNNER_TEMP/mail" > "$RUNNER_TEMP/mail.json"` with the IMAP secrets;
     outputs `docx` and the uid lists via `jq`.
  3. **no mail, no run**: every later step except the summary and filing has `if: steps.fetch.outputs.docx != ''`.
  4. `sudo apt-get install -y libreoffice-writer poppler-utils`.
  5. **find the open PR**: `gh pr list --state open --search "head:service-sheet/" --json headRefName,number` with
     the read-only `github.token`; if one is open, check out its branch, else create `service-sheet/<date>` from
     `main`.
  6. **Claude**: `anthropics/claude-code-action@v1` with the four federation inputs from `vars.*`, `prompt` (spec §2:
     the DOCX path, unattended, newest week create / later weeks correct, report to `$RUNNER_TEMP/report.md`),
     `claude_args: --allowedTools "Read,Write,Edit,Bash(pnpm stage sheet:*),Bash(pdftotext:*),Bash(ls:*),Bash(cat:*)"`
     and the latest model; no `ANTHROPIC_API_KEY`.
  7. `actions/create-github-app-token` (`vars.SHEET_APP_ID`, `secrets.SHEET_APP_PRIVATE_KEY`), only now: a step's
     outputs pass through files on the runner, so a token created before Claude's step could be read by it.
  8. **nothing changed**: `git status --porcelain src/content` empty → summary "nothing changed", skip to filing.
  9. `pnpm test` and `pnpm build` with `NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY: vars.GOOGLE_CALENDAR_API_KEY`.
  10. commit `src/content/` (message from the report: `feat(content): publish the service sheet for …` or
      `fix(content): correct …`, author the App's bot) and push with the App token; upload `uploads/porady_bohosluzeb/` as artifact `service-sheet-pdf-<head sha>`,
      retention 30 days.
  11. **PR**: create (`gh pr create`, `--draft` unless the report's first line is exactly `blocking: no`) or edit the body of the open one; on create, lock
      it: `gh api -X PUT repos/$GITHUB_REPOSITORY/issues/<n>/lock`. A later run on an open draft whose report is no
      longer blocking leaves it a draft (the maintainer marks it ready).
  12. **summary** (`always()`): `$GITHUB_STEP_SUMMARY` from `mail.json`'s `summary` and the outcome; the job fails
      when the report has a refused week or a document error, or a message had no or several DOCX files.
  13. **file** (`always()` after a successful outcome step): `pnpm sheet-mail file --processed … --rejected …`.
  14. `rm -rf "$RUNNER_TEMP/mail"` (`always()`).
- [ ] **Step 2: Run `pnpm format`** and check the YAML parses (`node -e` with `yaml` from `node_modules` if present,
      else rely on Prettier's YAML parse).
- [ ] **Step 3: Commit** — `ci: open a service sheet PR from the parish's e-mail`

---

### Task 5: Setup docs and the maintainer's dry run

**Files:**

- Modify: `README.md` (content section: the e-mail path next to the local skills), `docs/deployment.md` (a
  "Service sheet by e-mail" section: the one-time setup below and how to release a merged sheet PR in phase 1)

- [ ] **Step 1: Document the one-time setup** in `docs/deployment.md`, each item with where it is done:
  - the mailbox `porad@farakurim.cz` in the cesky-hosting.cz administration and its IMAP host;
  - the GitHub environment `service-sheet` with secrets `IMAP_USER`, `IMAP_PASSWORD` and variable `IMAP_HOST`;
  - the Claude Console workload identity: issuer GitHub Actions, a service account, a rule with `subject_prefix`
    `repo:oplaner4/farakurim:environment:service-sheet`, audience `https://api.anthropic.com`, the narrowest scope,
    lifetime 3600 s; repository variables `ANTHROPIC_FEDERATION_RULE_ID`, `ANTHROPIC_ORGANIZATION_ID`,
    `ANTHROPIC_SERVICE_ACCOUNT_ID`, `ANTHROPIC_WORKSPACE_ID`;
  - the GitHub App (this repo only, `contents: write`, `pull-requests: write`): variable `SHEET_APP_ID`, secret
    `SHEET_APP_PRIVATE_KEY`;
  - releasing a merged sheet PR in phase 1: `gh run download <run> -n service-sheet-pdf-<sha> -D
uploads/porady_bohosluzeb/`, then `pnpm release`.
- [ ] **Step 2: Commit** — `docs: describe the service sheet e-mail pipeline and its setup`.
- [ ] **Step 3: Hand over the dry run to the maintainer** (an agent never runs it: it reads the mailbox and the
      maintainer owns the setup). The maintainer, after the setup: sends a test e-mail with the DOCX from
      `fara.kurim@seznam.cz` and one from another address, runs the workflow by hand, and checks the spec's "Open checks"
      in the run: the IMAP login and the two folders, DKIM accepted and the stranger's mail filed in `Odmítnuto`, the
      federation exchange (Console history on a 401), the skills loaded and the report written, LibreOffice's PDF page,
      the PR opened, locked and, with a blocking question, a draft. A second run while the PR is open adds a commit to it.
