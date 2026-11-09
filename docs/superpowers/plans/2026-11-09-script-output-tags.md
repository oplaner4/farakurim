# Script Output Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every line of script output a parish skill reacts to starts with one of four fixed tags (`tell:`, `ask:`,
`next:`, `state:`), so the skills branch on a tag instead of on a sentence.

**Architecture:** A small module `scripts/lib/output.ts` builds the tagged lines and the refusals (an `Error` whose
message is the reason, then tagged lines). Each domain's messages move onto it; the skills quote the tags; the
existing `scripts/lib/skill-quotes.test.ts` checks the tags instead of sentences.

**Tech Stack:** TypeScript, Vitest (`--project scripts`), the parish skills in `.claude/skills/`.

**Spec:** this plan's "Design" section (agreed in conversation on 2026-11-09; no separate spec file).

## Design

A tag is a lower-case word, a colon and a space at the **start of a line**. Nothing else on a line is a tag.

| Tag      | Meaning                                                                         | Agent does                                         |
| -------- | ------------------------------------------------------------------------------- | -------------------------------------------------- |
| `tell:`  | A note for the user                                                             | Passes the text after the tag on, as printed       |
| `ask:`   | A question only a person can answer (the user's document, the calendar)         | Asks it (unattended: a question in the report)     |
| `next:`  | The step that resolves a refusal or a note                                      | Takes it (after the user's yes where a skill says) |
| `state:` | The record's state before this run, one word: `staged`, `published` or `pinned` | Branches on the word                               |

- **Results stay as they are:** `Added …`, `Would add …`, `Changed: …`, `Nothing changed`. They describe what
  happened and carry no tag.
- **A refusal** (a thrown error, exit 1) is its reason on the first line, then its tagged lines, one per line:
  `refusal(reason, ...lines)`. `commandExitCode()` prints it as `<name>: <reason>` and the tagged lines under it, so
  the tags stay at the start of their lines.
- **An `Outcome: refused: <message>` line in a public report** carries the refusal's first line only (the reason).
- The `(tell the user)` suffix and inline advice clauses (`: pass --corrected`, `: ask the user`, `: pnpm
pull-uploads fetches it`) disappear; their text becomes a `tell:`, `ask:` or `next:` line.

### The lines that change

| Where                                                | Now                                                                                                        | After                                                                                                                                                                                |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `stage/core.ts:44-46` `sourceFile()`                 | `<file> is … MB, over N MB: ask the user for a smaller file`                                               | `<file> is … MB, over N MB` + `ask: Is there a smaller file?`                                                                                                                        |
| `stage/core.ts:53,66` `checkFree`, `correctedHint`   | `<url> already exists on the server: this week is already published; for a corrected PDF pass --corrected` | `<url> already exists on the server` + `state: published` + `next: pass --corrected for a corrected PDF`                                                                             |
| `stage/core.ts:77`, `stage/event.ts:188`             | `…: pick another id` / `pick another label`                                                                | `…` + `next: pick another id` / `next: pick another label`                                                                                                                           |
| `stage/sheet.ts:75,86`                               | `…: pass --from and --to`                                                                                  | `…` + `next: pass --from and --to`                                                                                                                                                   |
| `stage/sheet.ts:120` `newerWeekNote()`               | `Not the DOCX's newest week: … (tell the user)`                                                            | `tell: Not the DOCX's newest week: …` (no suffix)                                                                                                                                    |
| `stage/sheet.ts:138`                                 | `no sheet of D is added: --corrected is for a week already added`                                          | `no sheet of D is added` + `next: leave out --corrected for a new week`                                                                                                              |
| `stage/sheet.ts:187`                                 | `Days without services (tell the user): …`                                                                 | `tell: Days without services: …`                                                                                                                                                     |
| `stage/sheet.ts:260`                                 | `The sheet … is already staged, not released yet: --record replaces it, so start …`                        | `state: staged` + `next: start the record from the staged sheet to keep its fixes; --record replaces it`                                                                             |
| `services/sheet-docx.ts:205`                         | `<where>: the table runs from A to B, so the heading looks wrong: ask the user`                            | `<where>: the table runs from A to B, so the heading looks wrong` + `ask: Which dates does the week have?`                                                                           |
| `services/add-exception.ts:55`                       | `the sheet P covers D: correct that sheet instead`                                                         | `the sheet P covers D` + `next: correct the sheet P`                                                                                                                                 |
| `news/add-event.ts:28` `takenIdError()`              | `id X is already taken by "T" (S): for another event …, use Y instead; to correct that event, use …`       | `id X is already taken by "T" (S)` + `next: use the id Y for another event of that title` + `next: pnpm replace-event corrects that event (pnpm stage event --corrected for a file)` |
| `news/event-poster.ts:49`                            | `<file> is not here: pnpm pull-uploads fetches it from the server`                                         | `<file> is not here` + `next: pnpm pull-uploads`                                                                                                                                     |
| `news/pin-event.ts:26`                               | `cannot pin X: it is cancelled (unpin it first with pnpm pin-event --none)`                                | `cannot pin X: it is cancelled` + `next: pnpm pin-event --none to unpin it`                                                                                                          |
| `news/pin-event.ts:86`                               | `X (T) is already the only pinned event`                                                                   | `state: pinned` (and nothing else)                                                                                                                                                   |
| `stage/event.ts:105`                                 | `there is no event X: --corrected is for one already on the site`                                          | `there is no event X` + `next: leave out --corrected for a new event`                                                                                                                |
| `petrklic/add-petrklic.ts:52`                        | `the issue X is not added: --corrected is for an issue already added`                                      | `the issue X is not added` + `next: leave out --corrected for a new issue`                                                                                                           |
| `petrklic/add-petrklic.ts:55`                        | `the issue X is already added; for a corrected PDF pass --corrected`                                       | `the issue X is already added` + `next: pass --corrected for a corrected PDF`                                                                                                        |
| `stage/petrklic.ts:137`                              | `The old folder <url>/ stays online: files on the server are never deleted`                                | `tell: The old folder <url>/ stays online: files on the server are never deleted`                                                                                                    |
| `stage/petrklic.ts:147`                              | `public/.htaccess redirects to the old PDF on line N: change A to B there`                                 | `next: in public/.htaccess, line N, change A to B`                                                                                                                                   |
| `gallery/add-album.ts:162,265`, `album-photos.ts:28` | `…: pass another one with --id` / `…: <hint>`                                                              | `…` + `next: pass another id with --id`                                                                                                                                              |
| `gallery/add-album.ts:181`                           | `Removed the old album X (D)`                                                                              | `tell: Removed the old album X (D)` (`Would remove` with `--check`)                                                                                                                  |
| `gallery/add-album.ts:263`                           | `the album title has no date: pass the date of the event with --date YYYY-MM-DD`                           | `the album title has no date` + `next: pass the date of the event with --date YYYY-MM-DD`                                                                                            |
| `calendar/lines.ts:42-53` (`ask`, `unpaired`)        | `Události, D: ask: …` / `Události, D: cannot pair …: nothing changes`                                      | `ask: Události, D: …` / `ask: Události, D: cannot pair …: nothing changes`                                                                                                           |

## Global Constraints

- Script output, comments and skills are English; quoted site content stays Czech (`docs/conventions.md`).
- A `scripts/lib/` module never names its callers (`.claude/rules/structure.md`).
- Imports: same folder `./x`, else `@/…` or `../x` as the scripts already do; no new dependency.
- Check for every task: `pnpm format && pnpm test:scripts && pnpm lint && pnpm exec tsc --noEmit` (a `scripts/`
  and skills change; no build, no browser check).
- Commits follow the `commit` skill (commitlint, `Co-Authored-By` trailer); never `--no-verify`; no push.

## Review Focus

1. **A refusal in a public report:** `Outcome: refused: <message>` must stay one line; a skill that pasted the
   whole multi-line message would put `next:` lines under it. Task 6 makes the skills say "first line"; Task 1's
   `refusalReason()` test pins what the first line is.
2. **`--check` and the real run print the same tags:** a skill decides from the `--check` run. Each task's tests
   assert the tag in both modes where the line exists in both.
3. **A tag left in the middle of a line:** after Task 5 no source line in `scripts/lib` may hold `(tell the user)`,
   `: ask the user` or `: ask:`; Task 6's test asserts it.
4. **The public PR body's calendar block** (`content-pr/body.ts`) changes from `Události, …: ask: …` to
   `ask: Události, …`; its text "an `ask:` event" must still read right (Task 5).
5. **`commandExitCode()` prefixes only the first line** with `<name>: `; a tag line must not get the prefix (Task 1).

---

### Task 1: The output module

**Files:**

- Create: `scripts/lib/output.ts`
- Test: `scripts/lib/output.test.ts`
- Modify: `scripts/lib/command.test.ts` (the multi-line refusal through `commandExitCode()`)

**Interfaces:**

- Produces (`scripts/lib/output.ts`):
  - `type State = "staged" | "published" | "pinned"`
  - `tell(text: string): string` → `"tell: <text>"`; `ask(question: string)`, `next(step: string)` likewise
  - `state(value: State): string` → `"state: <value>"`
  - `refusal(reason: string, ...lines: string[]): Error` (message: `reason` and `lines`, joined by `"\n"`)
  - `refusalReason(message: string): string` (the first line)

- [ ] **Step 1: Write the failing tests** in `scripts/lib/output.test.ts`:

```ts
it("tags a line", () => {
  expect(tell("Days without services: 4. 10.")).toBe("tell: Days without services: 4. 10.");
  expect(ask("Which dates does the week have?")).toBe("ask: Which dates does the week have?");
  expect(next("pass --corrected")).toBe("next: pass --corrected");
  expect(state("staged")).toBe("state: staged");
});

it("puts a refusal's reason first and its tagged lines under it", () => {
  const error = refusal("the issue 2025-4 is already added", next("pass --corrected for a corrected PDF"));
  expect(error.message).toBe("the issue 2025-4 is already added\nnext: pass --corrected for a corrected PDF");
  expect(refusalReason(error.message)).toBe("the issue 2025-4 is already added");
});
```

and in `scripts/lib/command.test.ts`, a `commandExitCode` case whose `run` throws `refusal("bad", next("fix it"))`:
assert exit code `1` and that `console.error` got `"name: bad\nnext: fix it"` (the tag line without the prefix).

- [ ] **Step 2: Run** `pnpm exec vitest run --project scripts scripts/lib/output.test.ts scripts/lib/command.test.ts`
      — expected: FAIL, `output.ts` does not exist (the `command.test.ts` case passes already: it pins today's
      behaviour).
- [ ] **Step 3: Implement `scripts/lib/output.ts`** with the interface above and a header comment stating the four
      tags and their meaning (the Design table, one line each).
- [ ] **Step 4: Run** the same command — expected: PASS.
- [ ] **Step 5: Commit** `feat(scripts): add the tagged output lines the skills react to`.

### Task 2: Service sheets and schedule exceptions

**Files:**

- Modify: `scripts/lib/stage/core.ts:44-46,51-54,65-66,77`, `scripts/lib/stage/sheet.ts:75,86,108-121,138,187,253-262`,
  `scripts/lib/services/sheet-docx.ts:205`, `scripts/lib/services/add-exception.ts:55`
- Modify skills: `.claude/skills/parish-create-service-sheet/SKILL.md` (steps 1a, 1b, 4),
  `.claude/skills/parish-create-service-sheet/unattended.md` (Unattended run, Unattended correction),
  `.claude/skills/parish-correct-service-sheet/SKILL.md`, `.claude/skills/parish-create-exception/SKILL.md:41`
- Test: `scripts/lib/stage/core.test.ts`, `scripts/lib/stage/sheet.test.ts`, `scripts/lib/services/sheet-docx.test.ts`,
  `scripts/lib/services/add-exception.test.ts`, `scripts/lib/stage/petrklic.test.ts` and `scripts/lib/stage/event.test.ts`
  (they share `checkFree()`)

**Interfaces:**

- Consumes: Task 1 (`tell`, `ask`, `next`, `state`, `refusal`).
- Produces: `correctedHint(): string[]` (no argument; `[state("published"), next("pass --corrected for a corrected PDF")]`);
  `stage(…, takenHint: string[], …)` and `checkFree(…, takenHint: string[])` take tagged lines instead of a clause;
  `stage()`'s default `takenHint` is `[next("pick another id")]`. Task 3 and Task 4 call these.

- [ ] **Step 1: Change the expectations first** to the "After" column of the Design table for every row of this task,
      in both `--check` and real runs where a test runs both. The staged-week note in `sheet.test.ts:163` becomes:

```ts
expect((await stageSheet(env, { ...week, check: true })).lines.slice(-2)).toEqual([
  "state: staged",
  "next: start the record from the staged sheet to keep its fixes; --record replaces it",
]);
```

and a released week's draft without `--corrected` rejects with a message whose lines include `"state: published"`
and `"next: pass --corrected for a corrected PDF"`.

- [ ] **Step 2: Run** `pnpm exec vitest run --project scripts scripts/lib/stage scripts/lib/services` — expected: FAIL on
      the changed lines only.
- [ ] **Step 3: Implement** the rows of this task with `scripts/lib/output.ts`; `newerWeekNote()` returns
      `tell("Not the DOCX's newest week: …")` with the rest of its sentence unchanged and no suffix.
- [ ] **Step 4: Update the skills.** `parish-create-service-sheet` step 1a: "When it prints `state: staged`, the week
      was staged before: take it to `parish-correct-service-sheet`; `state: published` (a refusal) means the week is
      released: correct it with `--corrected`." Step 4: "Pass each `tell:` line on as printed; ask each `ask:` line."
      `unattended.md`: the new/correction branch reads "When `sheet draft` prints neither `state: staged` nor
      `state: published`"; "with `--corrected` when it prints `state: published`"; the not-newest note and the
      lines for the user are "each `tell:` line"; a document error's `ask:` line is the question in the report.
- [ ] **Step 5: Run** the Step 2 command — expected: PASS; then the global check.
- [ ] **Step 6: Commit** `refactor(scripts): tag the service sheet and schedule exception output`.

### Task 3: Events and the pin

**Files:**

- Modify: `scripts/lib/news/add-event.ts:22-30`, `scripts/lib/news/event-poster.ts:49`,
  `scripts/lib/news/pin-event.ts:26,86`, `scripts/lib/stage/event.ts:105,188`
- Modify skills: `.claude/skills/parish-create-event/SKILL.md` (lines 74, 155, 161, 178),
  `.claude/skills/parish-correct-event/SKILL.md:56`, `.claude/skills/parish-pin-event/SKILL.md:28-29`
- Test: `scripts/lib/news/add-event.test.ts`, `scripts/lib/news/event-poster.test.ts`,
  `scripts/lib/news/pin-event.test.ts`, `scripts/lib/stage/event.test.ts`

**Interfaces:**

- Consumes: Task 1; Task 2's `stage(…, takenHint: string[], …)`.
- Produces: `pinLines()` returns `[state("pinned")]` for an event that already is the only pinned one.

- [ ] **Step 1: Change the expectations** to the Design table's rows for these files; `takenIdError()`:

```ts
expect(takenIdError(newsEvent({ id: "pout-2026", title: "Pouť", start: "2026-10-10" })).message.split("\n")).toEqual([
  'id pout-2026 is already taken by "Pouť" (2026-10-10)',
  "next: use the id pout-<start YYYY-MM-DD> for another event of that title",
  "next: pnpm replace-event corrects that event (pnpm stage event --corrected for a file)",
]);
```

- [ ] **Step 2: Run** `pnpm exec vitest run --project scripts scripts/lib/news scripts/lib/stage/event.test.ts` —
      expected: FAIL on the changed lines only.
- [ ] **Step 3: Implement** the rows with `scripts/lib/output.ts`.
- [ ] **Step 4: Update the skills.** `parish-pin-event`: "`state: pinned` means nothing to do: say so and stop";
      `parish-correct-event:56`: "When it prints `next: pnpm pull-uploads`, run it first"; `parish-create-event:155`:
      "a different event whose id is taken gets the id its `next:` line gives".
- [ ] **Step 5: Run** the Step 2 command — expected: PASS; then the global check.
- [ ] **Step 6: Commit** `refactor(scripts): tag the event and pin output`.

### Task 4: Petrklíč and the gallery

**Files:**

- Modify: `scripts/lib/petrklic/add-petrklic.ts:52,55`, `scripts/lib/stage/petrklic.ts:137,147`,
  `scripts/lib/gallery/add-album.ts:162,181,263,265`, `scripts/lib/gallery/album-photos.ts:26-29`
- Modify skills: `.claude/skills/parish-create-petrklic/SKILL.md:25,49`,
  `.claude/skills/parish-correct-petrklic/SKILL.md:22,43-45`, `.claude/skills/parish-create-album/SKILL.md:52`
- Test: `scripts/lib/petrklic/add-petrklic.test.ts`, `scripts/lib/stage/petrklic.test.ts`,
  `scripts/lib/gallery/add-album.test.ts`, `scripts/lib/gallery/album-photos.test.ts`

**Interfaces:**

- Consumes: Task 1; Task 2's `correctedHint(): string[]`.
- Produces: `assertFreeOnServer(env, rel, hint: string[])` (tagged lines, like `checkFree()`).

- [ ] **Step 1: Change the expectations** to the Design table's rows for these files; the removed album:

```ts
expect(albumLines(result, true).slice(1)).toEqual(["tell: Would remove the old album a-2019 (2019-05-01)"]);
```

- [ ] **Step 2: Run** `pnpm exec vitest run --project scripts scripts/lib/petrklic scripts/lib/stage/petrklic.test.ts scripts/lib/gallery`
      — expected: FAIL on the changed lines only.
- [ ] **Step 3: Implement** the rows with `scripts/lib/output.ts`.
- [ ] **Step 4: Update the skills:** `parish-correct-petrklic`: "pass each `tell:` line on; for a `next:` line about
      `public/.htaccess`, make that change"; `parish-create-album`: "pass each `tell:` line on".
- [ ] **Step 5: Run** the Step 2 command — expected: PASS; then the global check.
- [ ] **Step 6: Commit** `refactor(scripts): tag the Petrklíč and gallery output`.

### Task 5: The calendar lines that need a person

**Files:**

- Modify: `scripts/lib/calendar/lines.ts:40-55`, `scripts/lib/content-pr/body.ts:30` (wording only if it no longer
  reads right)
- Modify skill: `.claude/skills/parish-release/SKILL.md:14-15`; docs: `docs/calendar-sync.md:15`, `docs/content-pipelines.md:144`
- Test: `scripts/lib/calendar/lines.test.ts:92-96,135`, `scripts/lib/calendar/events-sync.test.ts:56`,
  `scripts/lib/content-pr/body.test.ts`

**Interfaces:**

- Consumes: Task 1 (`ask`).

- [ ] **Step 1: Change the expectations:** the `ask` report line starts `ask: Události, 2026-10-12: "Adorace" on …`
      (the rest unchanged); the `unpaired` line starts `ask: Události, 2026-10-12: cannot pair …`; `events-sync.test.ts:56`
      matches `/^ask: Události, 2099-01-05: "Alfa" on 2099-01-05/`.
- [ ] **Step 2: Run** `pnpm exec vitest run --project scripts scripts/lib/calendar scripts/lib/content-pr` — expected:
      FAIL on those lines.
- [ ] **Step 3: Implement:** `reportLine()` returns `ask(\`Události, …\`)`for`ask`and`unpaired`; `orphan`and
   `deleted` stay untagged (nothing for a person to do).
- [ ] **Step 4: Update** `parish-release` step 2: "If the user acts on an `ask:` line before the yes, run the preview
      again" stays true; `docs/calendar-sync.md:15` and `docs/content-pipelines.md:144` say "an `ask:` or `cannot pair` line":
      both are now `ask:` lines, so say "an `ask:` line".
- [ ] **Step 5: Run** the Step 2 command — expected: PASS; then the global check.
- [ ] **Step 6: Commit** `refactor(scripts): start the calendar lines that need a person with ask:`.

### Task 6: The skills read tags, and the test checks them

**Files:**

- Modify: `scripts/lib/skill-quotes.test.ts`
- Modify skills: `.claude/skills/parish-create-event/SKILL.md:161,178`,
  `.claude/skills/parish-create-service-sheet/unattended.md:29,71-72` (the `Outcome: refused:` lines)

**Interfaces:**

- Consumes: Tasks 1–5 (the tags, `State`, `refusalReason()`).

- [ ] **Step 1: Rewrite the quotes list** in `skill-quotes.test.ts`: the sentence quotes go; the entries become
      `state: staged`, `state: published`, `state: pinned` (each matched against `state(<value>)` and a source line
      calling it), `tell:`, `ask:`, `next:` (against a source line calling `tell(`, `ask(`, `next(`), and the
      unchanged `Would pin <id> (<title>)`, `Would unpin …`, `Changed: …`. Add:

```ts
it("leaves no tag or advice clause inside a line", () => {
  const source = readdirSync(join(ROOT, "scripts/lib"), { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => readFileSync(join(ROOT, "scripts/lib", f), "utf8"))
    .join("\n");
  expect(source).not.toMatch(/\(tell the user\)|: ask the user|[^`"]: ask: /);
});
```

- [ ] **Step 2: Run** `pnpm exec vitest run --project scripts scripts/lib/skill-quotes.test.ts` — expected: PASS if
      Tasks 2–5 updated every skill; a FAIL names the skill still quoting a sentence: fix that skill.
- [ ] **Step 3: Update the report rule** in `parish-create-event` and `unattended.md`: "`Outcome: refused: <reason>`
      carries the refusal's first line; its `next:` lines say what to do, not what to publish."
- [ ] **Step 4: Run** the global check — expected: PASS.
- [ ] **Step 5: Commit** `test(scripts): check the tags the skills react to`.
