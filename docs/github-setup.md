# GitHub setup

What the repository on GitHub needs for the [release](deployment.md#release) and the
[content pipelines](content-pipelines.md): its name, the `Production` environment, the variables, the ruleset on
`main` and the check.

- **Repository**: the workflows and scripts read the repository from GitHub (`GITHUB_REPOSITORY`), so the setup
  works in any repository. Three places name it and must match the repository the site runs from: `GITHUB_REPOSITORY`
  in `cron-scripts/github.inc.php` ([hosting.md](hosting.md#starting-the-workflows-on-time)), the Google workload
  identity binding ([calendar-sync.md](calendar-sync.md#setup-once)) and the Claude Console federation rules, which also need the owner's and the
  repository's numeric IDs
  (`gh api repos/<owner>/<repo> --jq '"\(.owner.id) \(.id)"'`). This site's: `oplaner4/farakurim`, owner ID
  `38047115`, repository ID `1403139652`.
- **`Production` environment**: the secret `DEPLOY_SSH_KEY` and `DEPLOY_KNOWN_HOSTS` (secret or variable).
- **Its deployment branches and tags** must allow the tags `v*` (releases) **and the branch `main`**: the scheduled and
  manual refreshes run on `main`, and without it GitHub rejects their `deploy` job ("Branch "main" is not allowed to
  deploy to Production").
- **Repository variables** `GOOGLE_CALENDAR_API_KEY`, `MATOMO_URL` and `MATOMO_SITE_ID` for the build (the build job
  has no environment).
- **A ruleset on `main`** requiring the status check `check` (the job of `check.yml`), with the content GitHub App and
  the **Repository admin** role as bypass actors, so a red content PR cannot be merged while the content release's
  commit and tag still push. The admin role keeps `pnpm release` and your own pushes to `main` working: a required
  check rejects a direct push whose commit has no passing `check`, and `check.yml` skips release commits and
  docs-only changes. Without the ruleset nothing stops a red merge: the content release does not look at checks, and
  it would push a release tag whose `deploy.yml` check then fails. A bypass actor skips every rule of its ruleset, so
  keep this ruleset to the required check alone: put any other rule (block force pushes, restrict deletions) in a
  separate ruleset on `main` with no bypass actors. No push of the release or yours needs a force push or a deletion.

`.github/workflows/check.yml` checks and builds pushes to `main` and pull requests with no secrets, skipping docs-only
changes and release commits. The deploy workflow calls it for the tag, so a release runs the same check (with the site's
tests only) before it builds with the variables above.

## Checks on content PRs

The content workflows (`service-sheet.yml`, `events.yml`) do not test or build before they open a PR: `check.yml` runs
on every commit the App pushes to a content PR. What stays in them are the cheap guards (the patch's allowed files, the
ids an open events PR holds, the commit message, the report's format, and a report that creates or corrects nothing
carries no change). A mail whose change fails the check is no longer left unread for the next run: it is filed and its
PR opens red. Fix a red check with an [`@claude` comment](content-pipelines.md#fixing-content-prs-with-comments) or a commit to the PR's
branch; a red check notifies nobody, so look at the PR before merging.
