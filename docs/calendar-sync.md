# Calendar sync

`pnpm calendar-sync` brings the parish's Google Calendars, Události and Bohoslužby, in line with the content; what it
changes in each is in the header of `scripts/calendar-sync.ts`. Its preview needs only the browser key, `--apply` writes
and needs the service account.

Only a release applies them, after the site is deployed (so every URL it writes is a live page):

- **`pnpm release`** prints the preview of both calendars with the commits, so the yes covers both. Without the key,
  or when Google does not answer, it says the calendar was not checked and goes on.
- **The `calendar` job of `deploy.yml`** runs after `deploy` (and its verify). On a release tag push it runs
  `pnpm calendar-sync --calendar events --apply` and `pnpm calendar-sync --calendar services --apply`; on a refresh,
  or before the `calendar-sync` environment has `GOOGLE_WORKLOAD_IDENTITY_PROVIDER` (the setup below), both are only
  previewed. Either way its lines go into the run summary, and each line that needs a person warns (`--problems`): a
  hand-made Bohoslužby event doubling a service, an `ask:` (the sync cannot tell which Události event is the record's:
  paste the page URL into the right one's description, or add the event with it) or a `cannot pair` line, as either
  leaves that event out of line until a person acts and the next release runs. A failure ends as a warning too and does not mark the release failed: the
  next release catches up. It skips a `--local` release, which applies the sync itself.
- **`pnpm release --local`** applies both calendars after its deploy and verify, with the credentials in `.env.local`.

The job runs in its own environment `calendar-sync`, never `Production`: the refresh counts the Production deployments
to find the last deploy. It acts as the service account through **workload identity federation**, so no key is stored
anywhere: `google-github-actions/auth` writes a credentials file from the job's GitHub OIDC token, which Google trusts
only from this repository's `calendar-sync` environment, and `pnpm calendar-sync --apply` exchanges it for a
short-lived token of the account. Only this job may ask for the OIDC token (`id-token: write`), so the job that builds
the site cannot act as the account.

## Setup (once)

- **Calendars**, in Google Calendar of the parish's account: create two new calendars (**Settings → Add calendar →
  Create new calendar**), "Události" and "Bohoslužby", time zone Europe/Prague, and make each public (**Access
  permissions for events → Make available to public**, "See all event details"). Put each one's **Calendar ID**
  (**Integrate calendar**) into `googleId` of `parishCalendars` in `src/content/site.ts`, and its subscribe link
  (`https://calendar.google.com/calendar/u/0?cid=` and the ID in base64, without the `=` padding) into `subscribeUrl`.
  Add no events by hand: the sync writes them all.
- **Service account**, by the maintainer: create it in the Google Cloud project that holds the browser key, with no
  roles in the project and no key. Share Události and Bohoslužby with the service account's e-mail address with the
  permission "Make changes to events". Enable the **IAM Service Account Credentials API** and the **Security Token
  Service API** in the project.
- **Workload identity pool**, in the same project (IAM → Workload Identity Federation), shared by every repository of
  the owner: the pool and its provider trust the owner, the service account's binding picks the repository and its
  environment, so another repository needs only its own binding.
  - **Pool**: name `GitHub Actions`, ID `github`.
  - **Provider**: OIDC, name `GitHub`, ID `github`, issuer `https://token.actions.githubusercontent.com`, the default
    audience, the attribute mapping `google.subject = assertion.sub`,
    `attribute.repository = assertion.repository`, `attribute.repository_owner_id = assertion.repository_owner_id`, and
    the attribute condition `assertion.repository_owner_id == '<owner-id>'` (the owner's numeric ID, [GitHub
    setup](github-setup.md); for this site `'38047115'`; more owners:
    `assertion.repository_owner_id in ['<owner-id>', '<other-owner-id>']`). The issuer is shared by every repository
    on GitHub, so the condition keeps the others out.
  - **Binding**: on the pool's page, **Grant access** → **Grant access using service account impersonation**: the
    service account, **Only identities matching the filter**, attribute name `subject` and the value
    `repo:<owner>@<owner-id>/<repo>@<repo-id>:environment:calendar-sync` ([the IDs](github-setup.md); for this site
    `repo:oplaner4@38047115/farakurim@1403139652:environment:calendar-sync`). Dismiss the configuration file it offers
    afterwards: the workflow does not need it. This grants the account's **Workload Identity User**
    (`roles/iam.workloadIdentityUser`) to the job's subject alone. GitHub's subject carries the owner's and the
    repository's IDs after the names, so a repository renamed or recreated under the same name does not match, and
    only a job in the `calendar-sync` environment does.

- **Environment** `calendar-sync`, deployment branches and tags allowing the tags `v*` (a refresh runs on `main` and
  only previews, so it needs `main` too), with the variables `GOOGLE_WORKLOAD_IDENTITY_PROVIDER` (the provider's full
  name, `projects/<project number>/locations/global/workloadIdentityPools/github/providers/github`) and
  `GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL` (the account's address). Neither is a secret. No required reviewers. The
  provider variable turns the apply on, so set it once the steps above are done.
- **Locally**, for `pnpm release --local`: impersonate the account with your own login, which needs the **Service
  Account Token Creator** role (`roles/iam.serviceAccountTokenCreator`) on the account, and set
  `GOOGLE_CALENDAR_SERVICE_ACCOUNT` in `.env.local` to the file it writes
  ([README § Keys](../README.md#keys-in-envlocal-optional)). The account's JSON key works there too, if the
  organisation allows keys; never commit it or print it.

The calendars start empty, so the first release after the setup only adds: every event record to Události and the
services of the next six months to Bohoslužby, all listed in its preview.
