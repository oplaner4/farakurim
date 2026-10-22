# Content release: design

Status: draft. Generalises the service sheet release so that merged service sheet PRs and merged event PRs are
released by one workflow. No plan yet. Date: 2026-10-22.

## Intent

`.github/workflows/service-sheet-release.yml` releases the site when the maintainer squash-merges a `service-sheet/*`
PR (docs/deployment.md "Service sheet by e-mail"). An events pipeline (events e-mailed to a mailbox, a PR per change,
the same shape as the sheet pipeline) is planned next. Its PRs need the same release on merge, and with two pipelines
plus the maintainer's own commits on `main`, today's release stops far too often: any unreleased commit that is not a
sheet PR blocks it, even a `docs:` or `ci:` commit that cannot change what is published.

**Why:** the merge is meant to be the whole of the maintainer's work for a sheet or an event. Every "Not released:
main has other unreleased commits" sends them back to a computer for `pnpm release` by hand, which is what the
pipelines exist to avoid.

## Goals

- One release workflow, started by the squash merge of a PR of either kind: `service-sheet/*` (service sheets) or
  `events/*` (events). It releases every merged PR of these kinds since the last tag together, in merge order, each
  with the files its workflow runs staged (from their artifacts).
- It releases nothing more than those PRs, except commits that cannot carry staged uploads or a feature (the rule
  below), which go out with them.
- One artifact format for every kind, so a new kind is one entry in a table, not a new download step.
- The service sheet pipeline keeps working through the switch, including a sheet PR open at that moment.

## Non-goals

- **The events pipeline itself** (mailbox, workflow, Claude run, PR). Until it exists, the `events/` kind never
  matches. This design only fixes the contract it must meet (below).
- **A preflight** (build `out/` and run `scripts/deploy.sh check-uploads` before tagging, so the maintainer's own
  content commits could go out too). Possible later; not now.
- Releasing the maintainer's own content commits (`content` scope) or features (`feat`) automatically.
- Any change to `pnpm release`, `scripts/deploy.sh` or `deploy.yml`.

## Anti-goals (a failure even if it works)

- A release whose deployed page links a file that is not on the server: the tag is pushed, `deploy.yml`'s
  `check-uploads` stops the deploy, and the maintainer has a broken release to repair.
- An artifact that can write outside its kind's folder in `uploads/` (an event PR replacing a Petrklíč PDF or a
  sheet).
- A feature the maintainer has not chosen to release going live because a parish event was merged.

## Constraints

- Everything `service-sheet-release.yml` does today stays: `pull_request_target: closed`, checking out `main` only and
  never the PR's code, the `plan` job without secrets beyond the App key for comments, planning again in the `release`
  job, the App token push (so the tag starts `deploy.yml`), waiting for the deploy, the "Released in" and failure
  comments, deleting the merged branches, one release at a time.
- Only artifacts of runs on this repository's `main` count (`trusted` in the planner today).
- The repo's structure rules: the entry point `scripts/content-release.ts` is a `runCommand()` call documenting the
  command; the logic and its tests live in `scripts/lib/`.
- The workflow `if:` and `concurrency:` expressions cannot import TypeScript, so the branch prefixes appear there as
  literals; a test keeps them equal to the table (as `uploads-path.test.ts` and `site-url.test.ts` do for the
  workflow `env`).

## Decided

### Kinds

A table in `scripts/lib/content-release.ts`:

| Kind     | Branch prefix    | Folder under `uploads/` (the only one its artifacts may write)     | Page in the comment                     |
| -------- | ---------------- | ------------------------------------------------------------------ | --------------------------------------- |
| `sheet`  | `service-sheet/` | `porady_bohosluzeb/` (`SHEETS_FOLDER`)                             | `links.services` (`/porad_bohosluzeb/`) |
| `events` | `events/`        | `aktuality/` (the folder `scripts/lib/stage/event.ts` stages into) | `links.news` (`/aktuality/`)            |

A merged PR counts when its squash commit is the unreleased commit, its head branch starts with a prefix of the
table, and its head repository is this one (as `sheetPullOf()` checks today).

### Which other commits may go out with the PRs (the maintainer's rule)

Every unreleased commit since the last `v*` tag is one of:

1. **A content PR's squash commit** (above): released, with its artifacts.
2. **A merge commit** (more than one parent, e.g. "Merge pull request #3 from …/dependabot/…"): ignored itself. The
   commits it brings in are in the same `git log <tag>..HEAD` list and are judged on their own.
3. **Any other commit**, judged by its Conventional Commit header `type(scope)!: subject`:
   - **blocks** when the type is `feat`, or the scope is `content`, or the header has `!` (a breaking change), or
     the header does not parse;
   - **goes out** otherwise (`fix` outside `content`, `docs`, `ci`, `build`, `chore`, `refactor`, `test`, `perf`,
     `style`).

**Why `content` blocks:** the maintainer's own content commits (`feat(content)`, `fix(content)` from
`parish-publish-content`) may stage files under `uploads/` that exist only on their machine (a corrected poster
under a new rev name). **Why `feat` blocks:** a feature goes live when the maintainer releases it. Since a `feat` never
passes, an automatic release is always a patch (`scripts/release-version.ts` counts only `feat` outside `content` as
minor).

A blocked plan names the blocking commits, as today, and the maintainer releases by hand.

### Artifacts: `content-uploads-<sha>`

- Each content workflow run that pushes a commit to a content PR's branch uploads the files it staged as the artifact
  `content-uploads-<sha>` (`sha` = that commit), retention 30 days. The artifact holds the files **with their paths
  relative to `uploads/`**: `porady_bohosluzeb/2026-10-25-porad-bohosluzeb.pdf`,
  `aktuality/hody-2026-plakat.pdf`.
- `service-sheet.yml` switches to this name and layout (today: `service-sheet-pdf-<sha>`, flat `*.pdf`). Its `%PDF`
  check of each staged file stays.
- **Transition:** the planner also accepts `service-sheet-pdf-<sha>` for a sheet PR's commit and treats its files as
  `porady_bohosluzeb/<name>`. The fallback is removed in a later commit once no such artifact can be live (30 days
  after the switch).
- **Order of the switch:** the planner and the restore must accept `content-uploads-<sha>` in a commit **before**
  (or together with) the commit that makes `service-sheet.yml` upload under that name. The other way round, the old
  planner finds no artifact for a bot commit, takes it as having staged nothing, and the release ships a sheet whose
  PDF is not on the server (the first anti-goal).
- **Restoring** (release job): the artifacts are applied in the plan's order (PRs by merge time, each PR's commits
  oldest first), so a later file of the same path wins (a correction), as today. Before copying, every file is checked
  against its PR's kind: a regular file (no symlink, no directory entry outside the tree), its relative path without
  `..` or a leading `/`, under the kind's folder, with an extension of `UPLOAD_EXTENSIONS`. One file failing the check
  stops the release before anything is uploaded or tagged, with a failure comment naming the file.
- The rest of the existing artifact rules stay: an expired artifact blocks; a commit on a PR's branch not authored by
  a bot and without an artifact blocks (it may have staged files only on the maintainer's machine); a bot commit
  without an artifact staged nothing.

### Workflow and command names

- `.github/workflows/service-sheet-release.yml` → `.github/workflows/content-release.yml` (name "Content release").
  The `plan` job's `if:` accepts a merged PR of this repo whose head branch starts with any prefix of the table;
  the concurrency group is `content-release` for those, a per-run group for every other closed PR.
- `pnpm sheet-release` (`scripts/sheet-release.ts`, `scripts/lib/services/sheet-release.ts`) →
  `pnpm content-release` (`scripts/content-release.ts`, `scripts/lib/content-release.ts`, shared by the domains, so
  at the top of `scripts/lib/`). The plan stays one JSON document on stdout, each PR now with its `kind`.
- The comments: "Released in vX.Y.Z: <site><page of its kind>"; the job summary is titled "Content release" and lists
  each PR with its kind and artifact count. The environment `url` is the site's home page (a release may hold both
  kinds).
- The workflow `env` gains the events folder and the news page next to `SHEETS` and `SERVICES_PAGE`, checked by the
  same tests (`uploads-path.test.ts`, `site-url.test.ts`, which name the renamed file).

### Contract for the events pipeline (later)

- Its PR branches start with `events/` and are squash-merged.
- Its bot pushes each commit with the GitHub App's bot (so `bot` is true) and uploads `content-uploads-<sha>` with the
  files it staged, all under `aktuality/`, from a run on `main`.
- Whether it keeps one rolling PR or one PR per event is its own design; the release handles any number.

### Docs

`docs/deployment.md`: the release part of "Service sheet by e-mail" becomes its own section "Content release" (what
starts it, the commit rule, the artifacts, when it blocks, releasing by hand with the new artifact name), and the sheet
section links it. The manual release loop downloads `content-uploads-<sha>` and copies the tree into `uploads/`
(`cp -R`), falling back to the old name during the transition.

## Left to the builder

- How the restore step is implemented: a subcommand of `pnpm content-release` (e.g. `apply <dir>` that validates and
  copies; testable in TypeScript, the recommended way) or a shell step with the same checks.
- How the commit header is parsed (a small regex is enough; commitlint's parser is an option).
- Whether `GitHubReader` and the existing tests are moved and extended or rewritten; the existing cases (expired,
  fork artifact, hand commit, nothing to release, a later push while a PR is unreleased) must keep passing in their new
  form, plus: mixed kinds in merge order, a `docs`/`ci` commit going out, a `fix(content)` and a `feat` blocking, a
  `!` header blocking, a Dependabot merge commit ignored, the old artifact name accepted, a path outside the kind's
  folder refused.
- Checking that every file `pnpm stage event` stages lands under `aktuality/` (posters rendered from a PDF included);
  if one does not, the events folder of the table becomes a list.
- The commit split (e.g. the planner and its tests; the workflow rename and restore; the sheet workflow's artifact;
  the docs).
