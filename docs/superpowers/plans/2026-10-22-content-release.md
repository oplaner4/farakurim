# Content release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One release workflow that releases every merged `service-sheet/*` and `events/*` PR since the last tag, with
their staged files, and lets commits that cannot carry uploads or a feature go out with them.

**Architecture:** `scripts/lib/content-release.ts` replaces `scripts/lib/services/sheet-release.ts`: a kinds table, a
commit rule, a planner (JSON on stdout, as today) and an `apply` step that validates the downloaded artifacts and copies
them into `uploads/`. `content-release.yml` replaces `service-sheet-release.yml` and calls `pnpm content-release` and
`pnpm content-release apply`. `service-sheet.yml` then uploads `content-uploads-<sha>` with paths under `uploads/`.

**Tech Stack:** TypeScript (tsx, vitest), GitHub REST through `fetch`, GitHub Actions, `gh`.

**Spec:** `docs/superpowers/specs/2026-10-22-content-release-design.md`

### Where this deviates from the spec (decided here)

1. **No folder or page copies in the workflow `env`.** The plan carries each PR's `page`, and `apply` (TypeScript)
   knows each kind's folder, so `content-release.yml` keeps only `SITE` (plus `UPLOADS` is no longer needed there).
   `SHEETS`/`SERVICES_PAGE` leave that workflow and their tests drop it; `service-sheet.yml` keeps `UPLOADS` and
   `SHEETS`. Fewer copies to keep in sync; the spec's test intent (copies match) holds for what remains.
2. **The events folder constant** is `EVENTS_FOLDER = "aktuality/"`, exported from `scripts/lib/stage/event.ts` and
   used by its `eventUploadPath`; the table imports it (as it imports `SHEETS_FOLDER`).

## Global Constraints

- Branch prefixes: `service-sheet/` (kind `sheet`), `events/` (kind `events`). Folders: `porady_bohosluzeb/`,
  `aktuality/`. Pages: `links.services`, `links.news` (`@/content/site`).
- Artifact names: `content-uploads-<sha>` (paths relative to `uploads/`); legacy `service-sheet-pdf-<sha>` (flat
  PDFs, read as `porady_bohosluzeb/<name>`) for kind `sheet` only.
- Commit rule: a squash commit of a content PR is released; a merge commit is ignored; any other commit blocks when its
  type is `feat`, its scope is `content`, it has `!`, or its header does not parse; otherwise it goes out.
- Only artifacts with `trusted` (a run on this repo's `main`) count; an expired one blocks; a non-bot commit of a PR
  without an artifact blocks; a bot commit without one staged nothing.
- Every workflow guarantee of `service-sheet-release.yml` stays (header comment of that file: `pull_request_target`,
  `main` only, plan again, App token push, wait for the deploy, comments, delete branches, one release at a time).
- Scripts rules: entry point = header + `runCommand()`; logic in `scripts/lib/`; `parseCommand` throws on bad
  arguments, `execute` throws on failure. English everywhere except quoted Czech.
- Check for a `scripts/`-only change: `pnpm format && pnpm test:scripts && pnpm lint && pnpm exec tsc --noEmit`.
  Commits through the `commit` skill (commitlint; scopes e.g. `scripts`, `ci`).

## Review Focus

1. A header commitlint accepts but the regex might not: `fix(news)!: x`, `revert: x`, `Revert "feat: x"` (git's own
   revert subject) → blocks only when unparseable, `feat`, `content` or `!`. Tested in Task 1.
2. A scope list such as `fix(news,content): x` → must block (it touches content). Tested in Task 1.
3. A Dependabot merge commit plus its `ci:` commit next to a sheet PR → released. Tested in Task 1.
4. An artifact entry `porady_bohosluzeb/../petrklic/x.pdf`, an absolute path, a symlink, a `.php` file, or an events
   artifact writing `porady_bohosluzeb/…` → `apply` throws before copying anything. Tested in Task 2.
5. Two PRs writing the same path → the later merged one's file is on disk after `apply`. Tested in Task 2.

---

### Task 1: The planner

**Files:**

- Create: `scripts/lib/content-release.ts`, `scripts/lib/content-release.test.ts`, `scripts/content-release.ts`
- Modify: `scripts/lib/stage/event.ts` (export `EVENTS_FOLDER`), `package.json` (script `content-release`)
- Leave `scripts/sheet-release.ts` and `scripts/lib/services/sheet-release.ts` in place (the old workflow still runs
  them until Task 3).

**Interfaces:**

- Produces (all exported from `scripts/lib/content-release.ts`):
  - `type Kind = "sheet" | "events"`;
    `const KINDS: Record<Kind, { prefix: string; folder: string; page: string }>`.
  - `type UnreleasedCommit = { sha: string; subject: string; merge: boolean }`;
    `unreleasedCommits(cwd?): UnreleasedCommit[]` (git log `%H%x09%P%x09%s`; `merge` = more than one parent).
  - `blocksRelease(subject: string): boolean`.
  - `CommitPull`, `Artifact`, `PullCommit`, `GitHubReader`, `gitHubReader(repo, token, fetchImpl?)`: unchanged from
    `sheet-release.ts` (move them).
  - `uploadsArtifactName(sha) = "content-uploads-<sha>"`, `legacySheetArtifactName(sha) = "service-sheet-pdf-<sha>"`.
  - `type ContentPull = { number: number; kind: Kind; branch: string; page: string; mergedAt: string; artifacts: { name: string; runId: number }[] }`.
  - `type ReleasePlan` = `skip | none | blocked (reason, pulls) | release (pulls)`, as today with `ContentPull`.
  - `contentPullOf(sha, pulls: CommitPull[], repo): (CommitPull & { kind: Kind }) | undefined`.
  - `planRelease({ repo, commits, github }): Promise<ReleasePlan>`.

- [ ] **Step 1: Write the failing tests** in `scripts/lib/content-release.test.ts`, starting from
      `scripts/lib/services/sheet-release.test.ts` (same `fakeGitHub`, `commit()` gains `merge = false`, the artifact
      helper takes the name). Keep every existing `planRelease`, `gitHubReader`, `unreleasedCommits` and
      `parseCommand` case with the new names, and add:

```ts
describe("blocksRelease", () => {
  it.each([
    "feat: x",
    "feat(news): x",
    "feat(content): x",
    "fix(content): x",
    "fix(news,content): x",
    "fix!: x",
    "fix(news)!: x",
    'Revert "feat: x"',
    "no header",
  ])("blocks %s", (s) => expect(blocksRelease(s)).toBe(true));
  it.each([
    "fix(gallery): x",
    "docs: x",
    "ci: bump actions/setup-node",
    "build(deps): x",
    "chore: x",
    "refactor: x",
    "test: x",
    "perf: x",
    "style: x",
    "revert: x",
  ])("lets %s go out", (s) => expect(blocksRelease(s)).toBe(false));
});
```

    planRelease cases (new):
    - "releases a sheet PR and an events PR in merge order": pulls `a` (`service-sheet/…`, 10:00) and `b`
      (`events/2026-10-22`, 10:05) → `pulls: [{ number: 11, kind: "sheet", page: "/porad_bohosluzeb/" }, { number: 12,
      kind: "events", page: "/aktuality/" }]`, artifacts named `content-uploads-<sha>`.
    - "lets a docs commit and a Dependabot merge go out": commits `b`, `commit("d1", "docs: x")`,
      `commit("m1", "Merge pull request #3 from …", true)`, `commit("c1", "ci: bump x")` → `action: "release"`.
    - "blocks on fix(content) and feat commits, naming them": reason contains `fix(content): fix the poster` and
      `feat(gallery): add x`, not the docs commit.
    - "accepts the legacy sheet artifact": sheet PR commit `a1` with only `service-sheet-pdf-a1` → artifact
      `{ name: "service-sheet-pdf-a1" }`; when both names exist, the newest `runId` wins.
    - "ignores a legacy artifact for an events PR": events commit with only `service-sheet-pdf-<sha>` by a bot →
      no artifacts (staged nothing); by the maintainer (`m…`) → blocked.
    - "treats a PR from another prefix as an ordinary commit": a squash commit `f` of `feature/x` titled
      `feat(news): x` → `skip` when it is the only commit, `blocked` when next to a sheet PR.

- [ ] **Step 2: Run** `pnpm exec vitest run --project scripts scripts/lib/content-release.test.ts`. Expected: FAIL
      (module not found).

- [ ] **Step 3: Implement** `scripts/lib/content-release.ts` by moving `sheet-release.ts`'s reader and git code and
      generalising `planRelease`: content PR first (`contentPullOf`), then merge commits ignored, then
      `blocksRelease`. Header regex: `/^(\w+)(?:\(([\w-]+)\))?(!)?: \S/`; blocks when no match, type `feat`, scope
      `content`, or `!`. Artifacts per commit: `uploadsArtifactName`, plus `legacySheetArtifactName` for kind `sheet`;
      the trusted, unexpired one with the highest `runId` wins. Blocked reason for other commits:
      `main has commits only a release by hand may publish: <short sha> <subject>, …`. Export
      `EVENTS_FOLDER = "aktuality/"` from `scripts/lib/stage/event.ts` and use it in `eventUploadPath`.
      `parseCommand(args)` returns `{ action: "plan" }` for no arguments (Task 2 adds `apply`).
      Entry point `scripts/content-release.ts`: header in the style of `scripts/sheet-release.ts` (what it prints,
      `Usage: pnpm --silent content-release`, env `GITHUB_REPOSITORY`, `GH_TOKEN`); `package.json`:
      `"content-release": "tsx scripts/content-release.ts"`.

- [ ] **Step 4: Run** the scripts check. Expected: all pass.

- [ ] **Step 5: Commit** `feat(scripts): plan content releases of sheet and event PRs`.

### Task 2: Applying the artifacts

**Files:**

- Modify: `scripts/lib/content-release.ts`, `scripts/lib/content-release.test.ts`, `scripts/content-release.ts`
  (usage line)

**Interfaces:**

- Consumes: `ReleasePlan`, `ContentPull`, `KINDS`, `legacySheetArtifactName` (Task 1); `UPLOADS_DIR`
  (`scripts/lib/uploads.ts`); `UPLOAD_EXTENSIONS` (`@/lib/shared/uploads`).
- Produces: `applyArtifacts({ plan, from, uploads }: { plan: ReleasePlan; from: string; uploads: string }): string[]`
  — reads `<from>/<artifact name>/` for every artifact of `plan.pulls` in order, returns the copied paths relative to
  `uploads` in order. `parseCommand` also returns `{ action: "apply", plan: string, from: string }` for
  `apply <plan.json> <dir>`. Usage: `pnpm content-release apply <plan.json> <dir>`.

- [ ] **Step 1: Write the failing tests** (`describe("applyArtifacts")`, temp dirs with `freshTempDir`):
  - copies `content-uploads-a1/porady_bohosluzeb/x.pdf` and `content-uploads-b1/aktuality/y-plakat.pdf` into
    `uploads/` and returns `["porady_bohosluzeb/x.pdf", "aktuality/y-plakat.pdf"]`;
  - maps a legacy `service-sheet-pdf-a1/x.pdf` to `porady_bohosluzeb/x.pdf`;
  - the later PR's file wins for the same path (content of the file on disk);
  - throws, naming the file, and copies nothing, for: `aktuality/x.pdf` in a sheet PR's artifact,
    `porady_bohosluzeb/x.pdf` in an events PR's, a `../` entry, a symlink, `porady_bohosluzeb/x.php`, a file at the
    artifact root of a `content-uploads-` artifact;
  - throws when an artifact folder of the plan is missing;
  - returns `[]` for a plan that is not `release`.
  - `parseCommand(["apply", "p.json", "d"])` → `{ action: "apply", plan: "p.json", from: "d" }`; `["apply"]` throws.

- [ ] **Step 2: Run** the test file. Expected: FAIL.

- [ ] **Step 3: Implement** `applyArtifacts`: first walk every artifact (a recursive `readdirSync` with file types,
      or `lstat`), validate all files, then copy all (`mkdirSync` + `copyFileSync`), so a bad file copies nothing.
      `execute` for `apply` reads the plan JSON (`readJsonRecord`) and prints each copied path.

- [ ] **Step 4: Run** the scripts check. Expected: all pass.

- [ ] **Step 5: Commit** `feat(scripts): validate and apply content release artifacts`.

### Task 3: The workflow

**Files:**

- Rename: `.github/workflows/service-sheet-release.yml` → `.github/workflows/content-release.yml` (`git mv`)
- Delete: `scripts/sheet-release.ts`, `scripts/lib/services/sheet-release.ts`, `…/sheet-release.test.ts`; the
  `sheet-release` script in `package.json`
- Modify: `scripts/lib/uploads-path.test.ts`, `scripts/lib/site-url.test.ts`, `scripts/lib/content-release.test.ts`

**Interfaces:**

- Consumes: `pnpm --silent content-release` (plan JSON), `pnpm content-release apply <plan> <dir>`, `KINDS`.

- [ ] **Step 1: Write the failing test** in `content-release.test.ts`:
      "content-release.yml names every kind's prefix": for each `KINDS[k].prefix`, the workflow text contains
      `startsWith(github.event.pull_request.head.ref, '<prefix>')` exactly twice (the `plan` job's `if:` and the
      concurrency group), and no other `startsWith(github.event.pull_request.head.ref` occurs. Change
      `uploads-path.test.ts` (UPLOADS and SHEETS: `service-sheet.yml` only) and `site-url.test.ts` (SITE in
      `deploy.yml` and `content-release.yml`; drop the SERVICES_PAGE case).

- [ ] **Step 2: Run** the scripts tests. Expected: FAIL (file missing).

- [ ] **Step 3: Rewrite the workflow** after the `git mv`:
  - name `Content release`; header comment rewritten for both kinds and the commit rule (keep every reason it
    gives today);
  - `if:` and concurrency: `(startsWith(…, 'service-sheet/') || startsWith(…, 'events/'))`, group `content-release`;
  - `env`: `SITE` only; environment `url: ${{ env.SITE }}/`;
  - plan steps call `pnpm --silent content-release`;
  - "Download the artifacts": each `.pulls[].artifacts[]` into `$RUNNER_TEMP/artifacts/<name>` with `gh run download`,
    then `pnpm content-release apply "$RUNNER_TEMP/plan.json" "$RUNNER_TEMP/artifacts"`;
  - "Report the release": `Released in $TAG: $SITE<page>` from each pull's `.page`;
  - summary titled `Content release`, each PR as `PR #n (kind, branch): k artifact(s)`; comment texts say "artifact",
    not "PDF artifact".
    Delete the old script, module, test and `package.json` entry.

- [ ] **Step 4: Run** the scripts check and `pnpm exec prettier --check .github`. Expected: pass. Also
      `grep -rn "sheet-release" --exclude-dir=node_modules --exclude-dir=.git . | grep -v docs/superpowers` → only
      `docs/deployment.md` (Task 5).

- [ ] **Step 5: Commit** `ci: release merged sheet and event PRs in one content release`.

### Task 4: The sheet workflow's artifact

**Files:**

- Modify: `.github/workflows/service-sheet.yml` (collect step ~l.197–200, upload ~l.358–363, PR body ~l.315, header
  comment l.15)

- [ ] **Step 1: Change** the collect step to copy each `%PDF` file into `$run/uploads/$SHEETS/` (same check), and the
      upload to `name: content-uploads-${{ steps.commit.outputs.sha }}`, `path: ${{ runner.temp }}/run/uploads/`
      (so the artifact holds `porady_bohosluzeb/<name>.pdf`). PR body: "The staged files are in the artifact
      `content-uploads-<sha>` of each commit". Header comment: `content-release.yml`.

- [ ] **Step 2: Run** `pnpm exec prettier --check .github && pnpm test:scripts`. Expected: pass.

- [ ] **Step 3: Commit** `ci(service-sheet): upload the staged PDFs as content-uploads artifacts`. This must land with
      or after Task 3 (the spec's switch order); never before Task 1–2.

### Task 5: Docs

**Files:**

- Modify: `docs/deployment.md`

- [ ] **Step 1: Write** a section "Content release" (after "Service sheet by e-mail"): what starts it (squash merge of
      `service-sheet/*` or `events/*`), the commit rule with its reasons, the artifacts and their folders, when it
      blocks, releasing by hand. Move the release paragraphs out of the sheet section and link the new one. The
      manual loop:

```sh
git switch main && git pull
pr=<PR number>
tmp=$(mktemp -d)
for sha in $(gh pr view "$pr" --json commits --jq '.commits[].oid'); do
  gh run download -n "content-uploads-$sha" -D "$tmp/$sha" && cp -R "$tmp/$sha"/. uploads/ ||
    { gh run download -n "service-sheet-pdf-$sha" -D "$tmp/$sha" && cp "$tmp/$sha"/*.pdf uploads/porady_bohosluzeb/; } ||
    echo "No artifact for $sha (a commit the workflow did not make)."
done
pnpm release
```

      Replace every `service-sheet-release.yml` / `pnpm sheet-release` mention.

- [ ] **Step 2: Run** `pnpm format` and `grep -n "sheet-release\|service-sheet-pdf" docs/deployment.md` → only the
      legacy fallback line.

- [ ] **Step 3: Commit** `docs: describe the content release`.

### Follow-up (not in this plan)

After 2026-11-22 (30 days after Task 4 is on `main`), remove `legacySheetArtifactName`, its tests and the fallback in
the manual loop.
