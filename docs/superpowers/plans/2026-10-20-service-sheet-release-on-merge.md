# Service sheet by e-mail, phase 2 §7 (release on merge) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merging a `service-sheet/*` PR releases the site: a workflow downloads the PR's staged PDFs, uploads them,
runs `pnpm release --yes`, waits for `deploy.yml` and comments "Released in vX.Y.Z" on the PR.

**Architecture:** A new workflow `service-sheet-release.yml` runs on pushes to `main` that touch `src/content/`. Job
`plan` (no environment) runs `pnpm sheet-release --pushed <sha>`, a small script that reads the
commits since the last tag and the GitHub API and prints a JSON plan: skip, nothing, blocked (with the reason) or
release (the PRs and their PDF artifacts in order). A blocked plan is commented on the PRs. Job `release` (environment
`Production`) downloads the artifacts into `uploads/porady_bohosluzeb/`, runs `pnpm release --yes` (which uploads
them), waits for the deploy run, and comments and deletes the branches. The GitHub App key becomes a repository secret,
shared by both sheet workflows.

**Tech Stack:** TypeScript (tsx, vitest), GitHub REST through `fetch`, GitHub Actions, `gh`,
`actions/create-github-app-token`.

**Spec:** `docs/superpowers/specs/2026-10-16-service-sheet-email-pipeline-design.md` (§7 and "GitHub setup").

### Where this deviates from the spec (decided here)

1. **Trigger: `push` to `main`, not `pull_request: closed`.** GitHub matches an environment's deployment branch rule
   against `GITHUB_REF`, which is `refs/pull/N/merge` for a `pull_request` run. `Production` allows only `v*` and
   `main`, and adding `refs/pull/*/merge` would open its SSH key to every PR workflow. A squash merge is a push to
   `main`, so the job acts only when the pushed commit is a sheet PR's squash commit.
2. **Every workflow commit's artifact, not just the head commit's.** Each phase 1 run uploads only the PDFs it staged
   (`docs/deployment.md` already says to download every commit's artifact). Within a PR the commits are applied
   oldest first, and the PRs in merge order, so the newest PDF of a week wins.
3. **The App key `SHEET_APP_PRIVATE_KEY` moves from the `service-sheet-publish` environment to a repository secret.**
   The `plan` and `release` jobs need it too (comments on a locked PR, the push of the release commit), and `release`
   runs in `Production`. A secret still reaches only the steps that name it; fork PRs and Dependabot get no repository
   secrets.

Not done, on purpose (agreed with the maintainer): no check of the linked uploads before the tag (a PDF staged only
on the maintainer's machine makes `deploy.yml` stop at `check-uploads` after the tag, with the live site untouched),
and no guard in `release.sh` against a local release that includes a merged sheet PR whose PDF is not in `uploads/`.

## Global Constraints

- Code, comments, messages, docs and PR comments in English (`docs/conventions.md`).
- `scripts/<command>.ts` is only a `runCommand()` entry point documenting the command. The logic and its tests go in
  `scripts/lib/services/` (`.claude/rules/structure.md`).
- Actions pinned by commit SHA with the version in a comment, the same SHAs as `service-sheet.yml`/`deploy.yml`;
  runner `ubuntu-24.04`; `permissions: contents: read` at the top, widened per job.
- A release needs the maintainer's merge: the workflow releases only when **every** commit since the last tag is the
  squash commit (`merge_commit_sha`) of a merged PR whose head branch starts with `service-sheet/` and whose head
  repository is this one.
- The deploy itself stays in `deploy.yml`, unchanged. Never move or delete a tag; a failed release is fixed in a new
  commit (spec §7.7).
- Never connect to the server except through `scripts/deploy.sh` and `pnpm release` (`CLAUDE.md`).
- The site's URL for the comment: `https://farakurim.cz/porad_bohosluzeb/` (the route folder is
  `src/app/porad_bohosluzeb/`; the spec's hyphen is a typo).
- Commits: `build:` scripts, `ci:` workflows, `docs:` docs; the `commit` skill; never `--no-verify`.
- Check: `pnpm format && pnpm test:scripts && pnpm lint && pnpm exec tsc --noEmit` for `scripts/` (Task 1); the full
  check in `docs/conventions.md` before the last commit. No browser check: nothing under `src/` changes.

## Review Focus

1. **Two sheet PRs merged minutes apart.** Expect one release holding both, a "Released" comment on each PR, and the
   second run ending green without a comment. Concurrency group `service-sheet-release`, queued: a third pending run
   replaces the second, which is harmless. Planner test: "releases two PRs in merge order".
2. **The release job's own push.** The `chore(release)` commit touches only `package.json` and must not start the
   workflow (the `paths` filter). If it does start, the plan is `skip`. Planner test: "skips a push that is not a
   sheet merge".
3. **A commit the maintainer pushed to the sheet branch with a PDF staged locally** (no artifact). Expect the
   commit to be skipped, the release to go on, and `deploy.yml` to stop at `check-uploads`. The failure comment on the
   PR then names the tag. Planner test: "skips commits without an artifact".
4. **`main` moves between `plan` and `release`.** Expect the `release` job to stop before uploading (HEAD ≠ the
   planned sha), with a failure comment and nothing tagged. Workflow step "Check out the planned main".
5. **The deploy fails after the tag.** Expect a failure comment linking the run, no "Released" comment and the
   branch kept. Workflow steps "Wait for the deploy" and "Report a failure".

---

### Task 1: `pnpm sheet-release`, the release planner

**Files:**

- Create: `scripts/lib/services/sheet-release.ts`
- Create: `scripts/lib/services/sheet-release.test.ts`
- Create: `scripts/sheet-release.ts`
- Modify: `package.json` (scripts: `"sheet-release": "tsx scripts/sheet-release.ts"`, after `sheet-mail`)

**Interfaces:**

- Produces (in `scripts/lib/services/sheet-release.ts`):

```ts
export type UnreleasedCommit = { sha: string; subject: string };
/** A PR that contains a commit, as GET /repos/{repo}/commits/{sha}/pulls gives it. */
export type CommitPull = {
  number: number;
  branch: string; // head.ref
  headRepo: string | null; // head.repo.full_name (null when the fork is gone)
  mergedAt: string | null; // merged_at
  mergeSha: string | null; // merge_commit_sha
};
export type Artifact = { name: string; runId: number; expired: boolean };
export type GitHubReader = {
  pullsOfCommit(sha: string): Promise<CommitPull[]>;
  /** The PR's commit shas, oldest first (GET /repos/{repo}/pulls/{n}/commits?per_page=100). */
  commitsOfPull(number: number): Promise<string[]>;
  /** GET /repos/{repo}/actions/artifacts?name={name}&per_page=100. */
  artifactsNamed(name: string): Promise<Artifact[]>;
};
export type SheetPull = {
  number: number;
  branch: string;
  mergedAt: string;
  /** The PDF artifacts to apply in this order. */
  artifacts: { name: string; runId: number }[];
};
export type ReleasePlan =
  | { action: "skip"; reason: string } // the push is not a sheet PR's squash commit
  | { action: "none"; reason: string } // nothing since the last tag: released already
  | { action: "blocked"; reason: string; pulls: SheetPull[] } // comment `reason` on the pulls, release nothing
  | { action: "release"; pulls: SheetPull[] }; // the pulls in merge order

export const SHEET_BRANCH_PREFIX = "service-sheet/";
export const pdfArtifactName = (sha: string) => `service-sheet-pdf-${sha}`;
export function sheetPullOf(sha: string, pulls: CommitPull[], repo: string): CommitPull | undefined;
export async function planRelease(input: {
  repo: string; // owner/name
  pushed: string; // the pushed head sha
  commits: UnreleasedCommit[]; // since the last tag, newest first
  github: GitHubReader;
}): Promise<ReleasePlan>;
export function gitHubReader(repo: string, token: string, fetchImpl?: typeof fetch): GitHubReader;
export function unreleasedCommits(cwd?: string): UnreleasedCommit[];
export function parseCommand(args: string[]): { pushed: string };
export async function execute(command: { pushed: string }): Promise<void>; // prints the plan as one JSON line
```

- Consumed by Task 2: the JSON plan on stdout of `pnpm --silent sheet-release --pushed <sha>` (env `GH_TOKEN`,
  `GITHUB_REPOSITORY`).

- [ ] **Step 1: Write the failing tests** in `scripts/lib/services/sheet-release.test.ts`.

  Build a fake `GitHubReader` from three maps (sha → `CommitPull[]`, PR → shas, artifact name → `Artifact[]`), in
  the style of `fakeMailbox` in `sheet-mail.test.ts`. Use `repo = "oplaner4/farakurim"` and a helper
  `sheetPull(number, sha, mergedAt, overrides?)` that returns a merged `CommitPull` with
  `branch: "service-sheet/2026-10-19"`, `headRepo: repo` and `mergeSha: sha`.

  - `planRelease` "releases two PRs in merge order": commits (newest first) `b` (PR 12, merged 10:05) and `a` (PR 11,
    merged 10:00), pushed `b`. PR 11 has commits `a1, a2`, with artifacts for both (runs 101, 102). PR 12 has `b1`
    (run 201). Expect `{ action: "release", pulls: [ {number: 11, artifacts: [{name:"service-sheet-pdf-a1", runId:101},
{name:"service-sheet-pdf-a2", runId:102}]}, {number: 12, artifacts:[{name:"service-sheet-pdf-b1", runId:201}]} ] }`
    (`toMatchObject`).
  - "skips commits without an artifact": PR 11 has commits `a1` (artifact) and `m1` (none). Expect its `artifacts` to
    be the `a1` entry only.
  - "takes the newest unexpired artifact of a commit": two artifacts of one name (runs 101 expired, 105 not). Expect
    runId 105.
  - "blocks on an expired artifact": the only artifact of `a1` is expired. Expect `action: "blocked"`, `reason`
    containing `a1`.slice(0, 7), `#11` and `expired`, and `pulls` listing PR 11 (so the workflow can comment).
  - "blocks when main has other unreleased commits": commits `b` (sheet PR 12, pushed) and `x` with subject
    `feat(news): add the Hubertská mše event` and no PRs. Expect `blocked`, the reason containing
    `main has other unreleased commits` and `feat(news): add the Hubertská mše event`, and `pulls` = [PR 12].
  - "skips a push that is not a sheet merge", one `it.each` over pushed commits whose pulls are: none; branch
    `feature/x`; `headRepo: "someone/farakurim"` (a fork); `mergedAt: null`; `mergeSha: "other"` (a rebase). Each one
    expects `action: "skip"`.
  - "does nothing when everything is released": `commits: []`, pushed `b` a sheet squash. Expect `action: "none"`.
  - `gitHubReader` "reads the API with the token": the stub `fetchImpl` records the URLs and returns JSON. Expect the
    `pullsOfCommit("abc")` URL `https://api.github.com/repos/oplaner4/farakurim/commits/abc/pulls`, the header
    `Authorization: Bearer t0k`, and the mapping from `{number, merged_at, merge_commit_sha, head:{ref, repo:{full_name}}}`.
    Expect `artifactsNamed("n")` to map `{artifacts:[{name, expired, workflow_run:{id}}]}`.
  - `gitHubReader` "fails on an error status": stub `404`; expect a rejection matching `/404/`.
  - `unreleasedCommits` "lists the commits since the last tag, newest first": in a `freshTempDir` git repo (as
    `release-version.test.ts` or `test-helpers.ts` set one up), make `chore: one`, tag `v1.0.0`, then `feat: two` and
    `fix: three`. Expect `[{subject:"fix: three"}, {subject:"feat: two"}]`, each with a 40-char sha. A repo without a
    tag lists every commit.
  - `parseCommand`: `["--pushed", "abc"]` → `{ pushed: "abc" }`; `[]` throws `/--pushed/`.

- [ ] **Step 2: Run the tests to see them fail**

  Run: `pnpm exec vitest run --project scripts scripts/lib/services/sheet-release.test.ts`
  Expected: FAIL (module not found).

- [ ] **Step 3: Implement `scripts/lib/services/sheet-release.ts`**

  - `sheetPullOf`: the first pull with `mergedAt` set, `mergeSha === sha`, `branch` starting with
    `SHEET_BRANCH_PREFIX` and `headRepo === repo`.
  - `planRelease`, in this order:
    1. The pushed commit's sheet pull. If there is none, return `skip` ("<sha7> is not a merged service sheet PR").
    2. No commits: return `none` ("Nothing to release since the last tag").
    3. Each commit's sheet pull. The commits without one become "others".
    4. The sheet pulls sorted by `mergedAt` ascending. Each pull's artifacts come from `commitsOfPull` (oldest
       first): a commit with no artifact of `pdfArtifactName(sha)` is skipped; one whose artifacts are all expired
       goes to an expired list; otherwise take the unexpired one with the highest `runId`.
    5. Others, then `blocked` with reason `main has other unreleased commits: release by hand (<sha7> <subject>, …)`.
       Expired, then `blocked` with `The PDF artifact of <sha7> (PR #<n>) expired: stage the PDF and release by hand`.
       Otherwise `release`.
  - `gitHubReader`: `fetchImpl(\`https://api.github.com/repos/${repo}${path}\`, { headers: { Authorization:
    \`Bearer ${token}\`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } })`. A
response that is not OK throws `GitHub <path>: <status>`. Use `encodeURIComponent` for the artifact name.
  - `unreleasedCommits`: `execFileSync("git", …)` as `scripts/lib/release-version.test.ts`/`content-files.ts` do.
    The last tag comes from `git describe --tags --abbrev=0 --match v*` (empty on failure), then
    `git log --format=%H%x09%s [<tag>..]HEAD`.
  - `parseCommand` with `parseCommandLine(args, { pushed: { type: "string" } }, USAGE)`; a missing `--pushed` throws
    `--pushed is required\n${USAGE}`.
  - `execute`: `GITHUB_REPOSITORY` and `GH_TOKEN` from the environment (a missing one throws, naming it), then
    `console.log(JSON.stringify(await planRelease(…)))`.

  `scripts/sheet-release.ts`: a header comment in the style of `scripts/sheet-mail.ts`. It says what the plan is, that
  only `service-sheet-release.yml` runs it, and gives the usage `pnpm --silent sheet-release --pushed <sha>` and the
  env. Then
  `runCommand("sheet-release", import.meta.url, parseCommand, execute);`.

- [ ] **Step 4: Run the tests to see them pass**

  Run: `pnpm exec vitest run --project scripts scripts/lib/services/sheet-release.test.ts`
  Expected: PASS.

- [ ] **Step 5: Run the scripts check**

  Run: `pnpm format && pnpm test:scripts && pnpm lint && pnpm exec tsc --noEmit`
  Expected: all pass.

- [ ] **Step 6: Commit** (`commit` skill)

  ```
  build: plan the release of merged service sheet PRs
  ```

### Task 2: `service-sheet-release.yml`

**Files:**

- Create: `.github/workflows/service-sheet-release.yml`
- Modify: `.github/workflows/service-sheet.yml` (header lines 15–18: merging now releases, and the App key is a
  repository secret, not part of the environment; the PR body footer line 303:
  `Merge to publish: the merge releases the site (service-sheet-release.yml).`)

**Interfaces:**

- Consumes: Task 1's JSON plan (`action`, `reason`, `pulls[].number`, `.branch`, `.artifacts[].name`, `.runId`).
- Produces: PR comments, the release tag (through `pnpm release --yes`).

- [ ] **Step 1: Write the workflow.** It opens with a header comment in the style of `service-sheet.yml` covering
      the architecture above, deviations 1–4 and why. Then:

  ```yaml
  name: Service sheet release
  on:
    push:
      branches: [main]
      paths: ["src/content/**"]
  concurrency:
    group: service-sheet-release
    cancel-in-progress: false
  permissions:
    contents: read
  ```

  **Job `plan`**: `ubuntu-24.04`, no environment, permissions `contents: read`,
  `pull-requests: read`, `actions: read`; outputs `action`, `plan` (the JSON) and `sha`.
  1. Check out `main` (not `github.sha`: a later run then sees every merge) with `fetch-depth: 0` (tags) and
     `persist-credentials: false`. Then pnpm, node 22 and `pnpm install --frozen-lockfile`, as in `service-sheet.yml`.
  2. "Plan": `pnpm --silent sheet-release --pushed "$GITHUB_SHA" > "$RUNNER_TEMP/plan.json"` with
     `GH_TOKEN: ${{ github.token }}`. Write the outputs `action` (`jq -r .action`), `plan` (`jq -c .`) and
     `sha=$(git rev-parse HEAD)`. Add a `::notice::` with `.reason` for skip/none.
  3. When `action == 'blocked'`: create the App token (`vars.SHEET_APP_ID`, `secrets.SHEET_APP_PRIVATE_KEY`). For
     each `pulls[].number`, `gh pr comment <n> --body "Not released: <reason>. Run \`pnpm release\` by hand after
     fixing it (docs/deployment.md)."`. Then `::error::<reason>`and`exit 1`.

  **Job `release`**: `needs: plan`, `if: needs.plan.outputs.action == 'release'`, `ubuntu-24.04`,
  `environment: { name: Production, url: https://farakurim.cz/porad_bohosluzeb/ }`, `timeout-minutes: 60`, permissions
  `contents: read` and `actions: read` (artifacts and the deploy run; the push and the comments use the App token).
  Env: `PLAN: ${{ needs.plan.outputs.plan }}`.
  1. Create the App token (same inputs).
  2. Check out `main` with `fetch-depth: 0` and `token: ${{ steps.app.outputs.token }}` (credentials persisted:
     `release.sh` fetches and pushes). "Check out the planned main": fail with
     `::error::main moved since the plan` unless `git rev-parse HEAD` equals `needs.plan.outputs.sha`.
  3. pnpm, node 22 and `pnpm install --frozen-lockfile`. Set `git config user.name "<slug>[bot]"` and `user.email`
     the way `service-sheet.yml`'s "Commit and push" does (`gh api "/users/$bot" --jq .id`). The husky commit-msg hook
     stays on: `chore(release): vX.Y.Z` passes it.
  4. "Set up SSH": the same step as `deploy.yml` (`DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`).
  5. "Download the PDFs": `mkdir -p uploads/porady_bohosluzeb`, then
     `jq -r '.pulls[].artifacts[] | "\(.runId) \(.name)"' <<< "$PLAN"`, in order, with `GH_TOKEN: github.token`:
     `gh run download "$run" -n "$name" -D "$RUNNER_TEMP/pdf/$name"`, then copy its `*.pdf` into
     `uploads/porady_bohosluzeb/`. A later copy overwrites an earlier one, so the newest PDF of a week wins.
  6. "Release": `pnpm release --yes` (it uploads the PDFs and the cron scripts first), then write the outputs
     `tag` (`v` + the version in `package.json`) and `sha` (`git rev-parse HEAD`).
  7. "Wait for the deploy": poll `gh run list --workflow deploy.yml --commit "$SHA"` (its first `databaseId`) every
     10 s for up to 5 minutes (fail if nothing appears), then `gh run watch "$id" --exit-status --interval 30`. Use
     `GH_TOKEN: github.token`.
  8. "Report the release" (App token): comment on each pull "Released in $TAG: https://farakurim.cz/porad_bohosluzeb/",
     then delete its branch with `gh api -X DELETE "repos/$GITHUB_REPOSITORY/git/refs/heads/<branch>"` (`|| true`:
     it may be deleted already).
  9. "Report a failure": `if: failure()`, using the App token. Comment on each pull: "The release failed: <run url>.
     Nothing is published unless a tag was pushed; fix it in a new commit and release with `pnpm release` (never move
     a tag)." When step 6 succeeded, name the tag and add: a deploy that stopped at `check-uploads` is fixed by
     uploading the missing PDF and re-running the deploy run.
  10. "Summary" (`if: always()`): the tag, the PRs and the outcome to `$GITHUB_STEP_SUMMARY`.

- [ ] **Step 2: Update `service-sheet.yml`.** In the header, "Merging and releasing stay with the maintainer, who
      downloads…" becomes "Merging releases the site (`service-sheet-release.yml`)". "the environment
      `service-sheet-publish` (the IMAP login, the App key; …)" drops the App key, which is now a repository secret
      (`secrets.SHEET_APP_PRIVATE_KEY` reads the same either way). In the PR body footer, use the line above.

- [ ] **Step 3: Validate**

  Run: `pnpm exec prettier --check .github/workflows && python3 -c "import yaml,sys;[yaml.safe_load(open(f)) for f in sys.argv[1:]]" .github/workflows/service-sheet-release.yml .github/workflows/service-sheet.yml`
  Expected: no output, exit 0. Then check by eye that every `uses:` is a SHA copied from `service-sheet.yml` or
  `deploy.yml`, and that no step that runs repo code names `SHEET_APP_PRIVATE_KEY` or `DEPLOY_SSH_KEY` beyond the
  ones above.

- [ ] **Step 4: Commit** (`commit` skill)

  ```
  ci: release the site when a service sheet PR is merged
  ```

### Task 3: Docs and the full check

**Files:**

- Modify: `docs/deployment.md` (§ "Answering the PR (phase 1)" and "Setup (once)", around lines 82–125)
- Modify: `README.md:153-155`

- [ ] **Step 1: `docs/deployment.md`**

  - Rename "Answering the PR (phase 1)" to "Answering the PR". Merge means yes: **squash merge** (the PR title is the
    commit), and the merge releases the site. `service-sheet-release.yml` uploads the PDFs of every workflow commit,
    releases and comments "Released in vX.Y.Z" once the deploy has succeeded. It stops with a PR comment, releasing
    nothing, when `main` has other unreleased commits or an artifact expired. A commit you pushed to the branch
    yourself has no artifact: its PDF is released only if it is on the server, else `deploy.yml` stops at
    `check-uploads` (upload it with `pnpm release`, then re-run the deploy). Keep the manual download loop as
    "Releasing by hand", for those cases. Keep "comments with `@claude` come in phase 2" (§6 is not built).
  - Setup: `SHEET_APP_PRIVATE_KEY` becomes a **repository** secret (move it out of `service-sheet-publish`; the
    environment keeps the IMAP host, user and password). Allow squash merging (Settings → General). If `main` has a
    ruleset or branch protection that restricts pushes, add the App as a bypass actor (the release commit and tag
    are pushed with its token).
  - First release: the first merge's run comments "Released in …" and the deploy run of the tag is green.

- [ ] **Step 2: `README.md`**: "…which the maintainer merges and releases" becomes "…which the maintainer reviews
      and merges; the merge releases the site."

- [ ] **Step 3: The full check**

  Run: `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`
  Expected: all pass. No browser check: nothing under `src/` changed.

- [ ] **Step 4: Commit** (`commit` skill)

  ```
  docs: release the service sheet on merge
  ```
