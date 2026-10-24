# farakurim.cz

The new website of **Římskokatolická farnost Kuřim**. Next.js (App Router) exported as a **static site**: the
hosting runs PHP only, with no Node.js, so `pnpm build` writes plain HTML/CSS/JS to `out/`.

Live at **https://farakurim.cz/** since v1.0.0, replacing the old PHP site (backed up on the server, see
[Deployment](#deployment)).

Working on it with Claude Code: `CLAUDE.md` adds the rules an agent follows on top of this README, and
`.claude/rules/` and `.claude/skills/` hold the topic rules and the project skills.

## Requirements

- **Node.js ≥ 22**, the version CI builds the releases with (`.github/workflows/check.yml`); keep `@types/node` on
  the same major
- **pnpm 10** (`corepack enable` picks up the version in `package.json`). Do not use npm or yarn.
- **Python 3** for `pnpm mockups`
- **poppler-utils** (`pdftoppm`, `pdfinfo`, `pdftotext`, `pdfseparate`, `pdfunite`) for the PDFs of `pnpm stage`;
  its tests skip the PDF cases without it
- **LibreOffice** (`soffice` on the `PATH` or in its usual install folder), or **Word** on Windows, to convert the
  parish's service sheet DOCX with `pnpm stage sheet`; its tests skip the conversion without LibreOffice
- **Bash, ssh and rsync**, and SSH key access to the server, to release (`pnpm release` with newly staged uploads,
  `pnpm release --local`) and for `pnpm pull-uploads`: set up once as in
  [docs/deployment.md § SSH access](docs/deployment.md#ssh-access). On Windows, Git Bash has ssh but not rsync
- Optional: `pip install --user fonttools brotli` to regenerate the web fonts (`pnpm fonts`), and PHP to try
  `public/biblicky-citat.php` locally (`php -S`)

## Getting started

```sh
pnpm install   # also installs the git hooks (husky)
pnpm dev       # http://localhost:3000
```

`pnpm dev` and `pnpm preview` serve the uploaded files from the local staging folder (see [Content](#content)) and
redirect missing files to the live site.

### Keys in `.env.local` (optional)

Copy the example file to `.env.local` (never committed) and fill in what you need:

```sh
cp .env.local.example .env.local
```

- **`NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY`**: the Kalendář page and the homepage week calendar read the parish's two
  public Google Calendars. Without the key they show entries generated from the regular mass schedule and the
  event records. The key ends up in the published JavaScript, so restrict it in Google Cloud to the
  `farakurim.cz` referrer and the Google Calendar API.
- **`GOOGLE_CALENDAR_SERVICE_ACCOUNT`**: the credentials (a JSON text or the path of its file) that act as the Google
  service account `pnpm calendar-sync --apply` writes to the Události and Bohoslužby calendars as; the maintainer shares both calendars with its address ("Make changes to events"). Locally, rather than a key, impersonate the account with your own login
  (it needs the "Service Account Token Creator" role on the account), into a folder of its own so it leaves your other
  Google credentials alone:

  ```sh
  CLOUDSDK_CONFIG=~/.config/farakurim/gcloud gcloud auth application-default login \
    --impersonate-service-account=<the account's address>
  ```

  and set the variable to `~/.config/farakurim/gcloud/application_default_credentials.json` (written out in full). The
  account's JSON key works too, and the deploy workflow uses workload identity federation
  ([deployment](docs/deployment.md#setup-once)). A secret: never `NEXT_PUBLIC_`, never committed, never printed. The
  preview needs only the API key above.

- **`NEXT_PUBLIC_MATOMO_URL`** and **`NEXT_PUBLIC_MATOMO_SITE_ID`**: anonymous statistics (see below). Leave them
  empty locally so development visits are not counted.

Every build checks the keys that are set (`src/lib/shared/build-env.ts`): a malformed key, or only one of the Matomo
pair, stops it. A release build (`RELEASE_BUILD=1`, set by the deploy workflow and by `pnpm release --local`) needs all
three, so a release never ships the generated calendars or skips the statistics.

### Statistics (Matomo)

The site counts anonymous visits with a self-hosted [Matomo](https://matomo.org/) at
`https://statistiky.farakurim.cz` (its own web root on the hosting, installed and updated by hand, not in this repo).
The tracker sets no cookies and stores nothing in the browser; Matomo shortens IP addresses and deletes raw visits
after 90 days. The privacy page (`/ochrana-osobnich-udaju/`) describes it and the other third-party services the site
loads: update it when that list changes.

### "Slovo na dnešek" (vira.cz)

The footer shows the day's verse from the
[vira.cz widget](https://www.vira.cz/Servis-pro-vas/Sluzby-pro-webmastery/Zobrazeni-biblickeho-citatu). The build
fetches it into every page. vira.cz sends no CORS headers, so in the browser the page asks
`public/biblicky-citat.php`, a small PHP proxy that fetches the verse once a day, caches it in `/cache/` and falls back
to the last verse while vira.cz is down. It is the only server-side code; `pnpm dev` and `pnpm preview` run no PHP, so
they show the build's verse. The "Zdroj: www.vira.cz" link is vira.cz's condition of use.

## Commands

| Command                                    | What it does                                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                 | Dev server at http://localhost:3000, uploaded files from the staging folder or the live site                    |
| `pnpm build`                               | Static export to `out/`; clears Next's fetch cache first, so calendars and the verse are read anew              |
| `pnpm preview`                             | Serve `out/` at http://localhost:4173 (run `pnpm build` first), uploads as in `pnpm dev`                        |
| `pnpm test`                                | Vitest unit tests: `test:site` (`src/**/*.test.ts`, hooks in jsdom) and `test:scripts` (`scripts/**/*.test.ts`) |
| `pnpm lint`                                | ESLint (Next core-web-vitals, TypeScript and React hooks rules)                                                 |
| `pnpm exec tsc --noEmit`                   | Type check                                                                                                      |
| `pnpm format`                              | Prettier, including Tailwind class sorting                                                                      |
| `pnpm mockups`                             | Render the design mockups and serve them at http://localhost:4174/mockups/                                      |
| `pnpm release [--local] [--yes] [--major]` | Publish the site (see [Deployment](#deployment)); asks unless `--yes`                                           |
| `pnpm pull-uploads [--dry-run]`            | Download the server's uploaded files missing in the staging folder (never overwrites or deletes)                |
| `pnpm icons`                               | Regenerate `src/app/icon.png` and `apple-icon.png` from `src/app/icon.svg`                                      |
| `pnpm fonts`                               | Build `src/fonts/farnost-sans-*.woff2` (Oxygen with fixed `ť ď ľ Ľ`) from `fonts-source/`                       |

Content tooling, used by the content skills (see [Content](#content)):

| Command                                                                    | What it does                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm stage event\|sheet\|petrklic … [--check]`                            | Stage files for upload; petrklic adds the issue to `petrklic.json`, the others add a `--record` (without one, only `--check`); `--corrected` for corrected files                                                                                                                             |
| `pnpm add-event <record.json> [--check]`                                   | Add an event to its month's JSON file in `src/content/news/`, checked by its schema                                                                                                                                                                                                          |
| `pnpm replace-event <record.json> [--check]`                               | Correct the event with the record's id, keeping its `published` and pin; a new start month moves it to that month's file                                                                                                                                                                     |
| `pnpm pin-event <id> \| --none [--check]`                                  | Pin an event for "Doporučujeme" and unpin every other one (`--none`: unpin all); a pinned new record moves the pin itself                                                                                                                                                                    |
| `pnpm event-poster <id> "<label>" \| --none [--check]`                     | Make an attachment of the event its poster (rendering `<file>-poster.webp`), or remove the poster                                                                                                                                                                                            |
| `pnpm calendar-sync [--calendar events\|services] [--apply \| --problems]` | Preview (no flag) or apply the changes that bring the calendars in line: Události with the event records (never deletes an event), Bohoslužby with the services of the next six months (deletes only its own events). `--calendar` picks one, `--problems` previews only what needs a person |
| `pnpm add-exception <record.json> \| --remove <date> [--check]`            | Add a change announced for a day no service sheet covers to `schedule-exceptions.json` (`--remove`: take it out)                                                                                                                                                                             |
| `pnpm add-album <album-url> [--photos <zip>] [--write \| --check …]`       | Propose a Zonerama album with photos from its zip (downloaded, or `--photos`) as JSON; `--write` stages the photos, adds it to `gallery.json` and removes the oldest beyond 6, `--check` only says what `--write` would do                                                                   |

Before you commit, run the full check and compare the change with the mockups: see
[docs/conventions.md](docs/conventions.md), which also holds the language, stack, static-export and commit conventions.

## Project layout

```
design/              Design handoff: DESIGN.md (the spec) and mockups per page, size and theme
src/app/             Pages (one folder per route), sitemap and 404
src/styles/          globals.css (Tailwind theme tokens), utilities.css, lightbox.css
src/components/      One component per block, by domain group (news/, services/, gallery/, parish/, …), ui/ shared
src/hooks/           Every React hook, one use-<name>.ts each
src/lib/<group>/     Pure logic with unit tests, by the same groups plus shared/ (Prague time, Czech grammar, links)
src/content/         Content, one file per domain (hand-edited data only); news/ holds the events (one JSON file per month)
src/content/types/   The content types, one file per domain
src/server/          Server-only build-time code: Google Calendar, the vira.cz verse, the schedule exceptions
public/              Static assets, plus .htaccess (404 page, caching, redirects of moved URLs) and biblicky-citat.php
scripts/             One entry point per pnpm command: dev and preview servers, release and deploy, icon, font, mockup and content tooling
scripts/lib/         The scripts' logic with its tests, by the same groups (news/, gallery/, …) plus stage/ and the shared helpers
cron-scripts/        PHP scripts the hosting's cron runs daily to start the workflows on time (synced by pnpm release)
fonts-source/        Original Oxygen TTFs and their OFL licence (input for `pnpm fonts`)
.github/workflows/   check.yml checks pushes and pull requests; deploy.yml deploys (see Deployment)
.claude/             Claude Code project skills (content, release, commit, design) and rules by topic
.agents/skills/      Third-party agent skills (see License), pinned in skills-lock.json
docs/                Conventions, deployment, and design specs and plans of larger features
uploads/             Uploaded files (posters, PDFs, Petrklíč, group and camp photos) staged for the server; git-ignored
```

Where code goes and the conventions per topic (styling tokens, accessibility, dates and "now" in a static build,
links, hooks, checking against the design) are in `.claude/rules/`.

## Content

Content lives in `src/content/` and is added with the Claude Code project skills in `.claude/skills/`:

| Skill                          | Adds                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `parish-create-event`          | An event from a poster or PDF, into `news/`                                                     |
| `parish-correct-event`         | A corrected event (record, poster or attachment)                                                |
| `parish-cancel-event`          | A cancelled or postponed event, or a dropped meeting of a series                                |
| `parish-pin-event`             | The "Doporučujeme" pin, moved to an existing event or removed                                   |
| `parish-create-service-sheet`  | The weekly service sheet (the parish's DOCX or PDF), into `service-sheets.json`                 |
| `parish-correct-service-sheet` | A corrected service sheet (record, DOCX or PDF)                                                 |
| `parish-create-exception`      | A change to the mass schedule on a day no service sheet covers, into `schedule-exceptions.json` |
| `parish-remove-exception`      | A withdrawn change to the mass schedule, out of `schedule-exceptions.json`                      |
| `parish-create-album`          | A Zonerama album (its zip downloaded or given), into `gallery.json`                             |
| `parish-create-petrklic`       | A Petrklíč newsletter PDF, into `petrklic.json`                                                 |
| `parish-correct-petrklic`      | A corrected Petrklíč PDF or issue record                                                        |

Each finishes with `parish-publish-content`, which commits and releases with `parish-release`.

The weekly service sheet can also arrive by e-mail: the parish sends its DOCX to the service sheet mailbox and a daily
workflow opens a pull request with the week, which the maintainer reviews and merges; the merge releases the site.
Setup and use: [docs/deployment.md](docs/deployment.md#service-sheet-by-e-mail).

New events can arrive by e-mail too: an accepted sender mails a poster (or a subject and a text) to the
events mailbox, and a workflow opens one pull request per mail with its new events, which the maintainer
reviews and merges. Corrections are refused there and made with the skills. Setup and use:
[docs/deployment.md](docs/deployment.md#events-by-e-mail).

Uploaded files (posters, PDFs, photos) are not in git: they are staged in a configurable git-ignored folder that
mirrors the one on the server and linked root-relative; `pnpm pull-uploads` downloads the server's files you lack.
The old site's uploads in `/nahrane/` stay on the server so old links keep working, but new content never links or
adds to them.

## Deployment

`pnpm release` publishes the site: it uploads the newly staged files, tags `vX.Y.Z` and pushes, and GitHub
Actions checks, builds and deploys the tag to https://farakurim.cz/ over SSH. The workflow also rebuilds the latest
release weekly, so date-dependent content stays current. The old PHP site is backed up in `/stary.farakurim.cz/` on
the server. Releases, the refresh, the GitHub setup and the server: [docs/deployment.md](docs/deployment.md).

## License

The source code is under the [MIT License](LICENSE). The content of the site is not: the texts and data in
`src/content/`, the photos, posters, logo and other images in `public/` and the design in `design/` are
© Římskokatolická farnost Kuřim, all rights reserved. Third-party parts keep their own licences:

- the Oxygen font (`fonts-source/`, and its subsets in `src/fonts/`):
  [SIL Open Font License](fonts-source/Oxygen/OFL.txt);
- the agent skills in `.agents/skills/`, MIT License from their sources: `tailwind-design-system` from
  [wshobson/agents](https://github.com/wshobson/agents) (© 2024 Seth Hobson), `vercel-react-best-practices` from
  [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) (© Vercel) and `seo-audit` from
  [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) (© 2025 Corey Haines).
