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
- **Repository variable** `CONTENT_REVIEWERS` (optional): the GitHub logins, separated by commas, asked to review each
  content PR when it is opened (`service-sheet.yml` and `events.yml`), so GitHub notifies them. A repository variable,
  not one of an environment: both workflows read it. Each login needs write access to the repository. An update of an
  open PR asks no one again. A review request is only a notification: the ruleset on `main` requires no approval.
- **A ruleset on `main`** requiring the status check `check` (the job of `check.yml`), with the content GitHub App and
  the **Repository admin** role as bypass actors, so a red content PR cannot be merged while the content release's
  commit and tag still push. The admin role keeps `pnpm release` and your own pushes to `main` working: a required
  check rejects a direct push whose commit has no passing `check`, and `check.yml` skips release commits and
  docs-only changes. Without the ruleset nothing stops a red merge: the content release does not look at checks, and
  it would push a release tag whose `deploy.yml` check then fails. A bypass actor skips every rule of its ruleset, so
  keep this ruleset to the required check alone: put any other rule (block force pushes, restrict deletions) in a
  separate ruleset on `main` with no bypass actors. No push of the release or yours needs a force push or a deletion.
  Ticking "Require status checks to pass" requires nothing by itself: add the check under **Show additional settings**
  → **Add checks**, the one named `check` (GitHub Actions). Not `check / check`: that is the same job called from
  `deploy.yml`, which a PR never reports, so a PR would wait for it forever. The admin role can still merge a red PR,
  but only by ticking "Merge without waiting for requirements to be met (bypass rules)" on purpose.

`.github/workflows/check.yml` checks and builds pushes to `main` and pull requests with no secrets, skipping docs-only
changes and release commits. The deploy workflow calls it for the tag, so a release runs the same check (with the site's
tests only) before it builds with the variables above.

## Checking the setup

`pnpm github-check` (read-only) compares the repository with this page and the setup sections of
[content-pipelines.md](content-pipelines.md) and [calendar-sync.md](calendar-sync.md). It fails on what would break a
workflow and warns of names no workflow reads and of what the token may not see. It needs a token that sees the
settings, an admin's: `gh auth login` (it runs `gh auth token`) or `GH_TOKEN`; reading is all it does, so the admin
role's bypass does not matter here. Its expected setup is `scripts/lib/github-check/setup.ts`, and a test keeps it in
line with the `vars.*`, `secrets.*` and `environment:` of the workflows: add a new variable there and to these docs.

It checks:

- squash merging allowed;
- the repository's variables and secrets, and a repository setting set in an environment instead;
- each environment (`Production`, `calendar-sync`, `service-sheet-publish`, `events-publish`, `content-fix`): that it
  exists, holds its variables and secrets (or the repository does), deploys from `main` (and the tags `v*` for
  `Production` and `calendar-sync`), and has no required reviewers (all but `Production`);
- `ANTHROPIC_FEDERATION_RULE_ID` in each environment and not in the repository, and no `ANTHROPIC_API_KEY` anywhere;
- the ruleset on `main` that requires `check`, with the App and the admin role as bypass actors and no other rule.

It does **not** check, so these stay with the setup steps and the first runs:

- **Values**: names only. An empty or mistyped variable (`IMAP_HOST`, `GOOGLE_WORKLOAD_IDENTITY_PROVIDER`, a
  `CONTENT_REVIEWERS` login without write access), a wrong federation rule ID or an expired key all pass. Secrets
  cannot be read at all; variables could, but are not.
- **The GitHub App**: that the bypass actor is the content App, that it is installed on this repository with
  `contents: write` and `pull-requests: write`, and that `CONTENT_APP_CLIENT_ID` is its Client ID.
- **The `pull_request_target` Actions policy** scoped to `content-release.yml` (no API reads it).
- **The other rulesets** ("Protect main", the `releases` tag ruleset), the other repository settings (Actions
  enabled, the default branch, the workflow permissions) and the environments' wait timers.
- **Outside GitHub**: the Claude Console (issuer, service account, the three federation rules), Google Cloud (the
  service account, its APIs, the workload identity pool, provider and binding, the calendars shared with it), the
  mailboxes, the hosting's cron and the SSH key on the server.
- **That anything works**: it runs nothing. Only a workflow that authenticates, reads its mail, deploys or syncs
  proves that ([content-pipelines.md](content-pipelines.md)'s first runs, a green deploy run).

## Checks on content PRs

The content workflows (`service-sheet.yml`, `events.yml`) do not test or build before they open a PR: `check.yml` runs
on every commit the App pushes to a content PR. What stays in them are the cheap guards (the patch's allowed files, the
ids an open events PR holds, the commit message, the report's format, and a report that creates or corrects nothing
carries no change). A mail whose change fails the check is no longer left unread for the next run: it is filed and its
PR opens red. Fix a red check with an [`@claude` comment](content-pipelines.md#fixing-content-prs-with-comments) or a commit to the PR's
branch; a red check notifies nobody, so look at the PR before merging.
