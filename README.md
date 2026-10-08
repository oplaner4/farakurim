# farakurim.cz

The new website of **Římskokatolická farnost Kuřim**. Next.js (App Router) exported as a **static site**: the
hosting runs PHP only, with no Node.js, so `pnpm build` writes plain HTML/CSS/JS to `out/`.

Live at **https://farakurim.cz/** since v1.0.0, replacing the old PHP site (backed up on the server, see
[Deployment](#deployment)).

Working on it with Claude Code: `CLAUDE.md` adds the rules an agent follows on top of this README, and
`.claude/rules/` and `.claude/skills/` hold the topic rules and the project skills.

## Requirements

- **Node.js ≥ 20.9** (required by Next.js 16)
- **pnpm 10** (`corepack enable` picks up the version in `package.json`). Do not use npm or yarn.
- **Python 3** for `pnpm preview`, `pnpm mockups` and the content scripts; `pnpm petrklic`, `pnpm stage` and
  `scripts/poster-webp.py` also need Pillow and `pdftoppm` (poppler-utils)
- Optional: `pip install --user fonttools brotli` to regenerate the web fonts (`pnpm fonts`), and PHP to try
  `public/biblicky-citat.php` locally (`php -S`)

## Getting started

```sh
pnpm install   # also installs the git hooks (husky)
pnpm dev       # http://localhost:3000
```

`pnpm dev` and `pnpm preview` serve `/uploads/…` from the local `uploads/` folder (git-ignored, see
[Content](#content)) and redirect missing files to the live site.

### Google Calendar (optional)

The Kalendář page and the homepage week calendar read the parish's two public Google Calendars. Without a key they
show entries generated from the regular mass schedule and the Aktuality records. To use the real calendars, copy the
example file to `.env.local` (never committed) and fill in the key:

```sh
cp .env.local.example .env.local
```

The key is read at build time and again in the browser, so it ends up in the published JavaScript. Restrict it in
Google Cloud to the `farakurim.cz` referrer and the Google Calendar API.

Every build checks the keys that are set, this one and the two Matomo variables below (`next.config.ts`,
`src/lib/shared/build-env.ts`): a malformed key, or only one of the Matomo pair, stops it. A release build
(`RELEASE_BUILD=1`, set by the deploy workflow and by `pnpm release --local`) also needs all three, so a release never
ships the generated calendars or skips the statistics because a key went missing.

### Statistics (optional)

The site counts anonymous visits with a self-hosted [Matomo](https://matomo.org/) at
`https://statistiky.farakurim.cz` (its own web root on the hosting, installed and updated by hand, not in this repo).
The tracker sets no cookies and stores nothing in the browser; Matomo shortens IP addresses and deletes raw visits
after 90 days. It is on only when `NEXT_PUBLIC_MATOMO_URL` and `NEXT_PUBLIC_MATOMO_SITE_ID` are set, so local builds
don't track; set both in `.env.local` to test it. The privacy page (`/ochrana-osobnich-udaju/`) describes it and the
third-party services the site loads: update it when that list changes.

### "Slovo na dnešek" (vira.cz)

The footer shows the day's verse from the [vira.cz widget](https://www.vira.cz/Servis-pro-vas/Sluzby-pro-webmastery/Zobrazeni-biblickeho-citatu).
The build fetches it into every page. vira.cz sends no CORS headers, so on the server the browser asks
`public/biblicky-citat.php`, a small PHP proxy that fetches the verse once a day, caches it in `/cache/` and falls
back to the last verse while vira.cz is down. It is the only server-side code. `pnpm dev` and `pnpm preview` run no
PHP, so they show the build's verse. The "Zdroj: www.vira.cz" link is vira.cz's condition of use.

## Commands

| Command                                             | What it does                                                                                                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                          | Dev server at http://localhost:3000 (`scripts/dev-server.mjs`: `next dev` plus `/uploads/…` from `uploads/` or the live site)                                       |
| `pnpm build`                                        | Static export to `out/`                                                                                                                                             |
| `pnpm preview`                                      | Serve `out/` at http://localhost:4173 (run `pnpm build` first), `/uploads/…` from `uploads/` or the live site                                                       |
| `pnpm release [--local] [--yes] [--major]`          | Publish the site: upload new `uploads/`, tag and push, so Actions deploys (`--local`: deploy from here); asks unless `--yes`                                        |
| `pnpm pull-uploads [--dry-run]`                     | Download the server's `/uploads/` files missing in `uploads/` (never overwrites or deletes local files)                                                             |
| `pnpm test`                                         | Vitest unit tests (`src/**/*.test.ts`, `scripts/**/*.test.ts`)                                                                                                      |
| `pnpm lint`                                         | ESLint (Next core-web-vitals + TypeScript + React hooks rules)                                                                                                      |
| `pnpm exec tsc --noEmit`                            | Type check                                                                                                                                                          |
| `pnpm format`                                       | Prettier, including Tailwind class sorting (`prettier-plugin-tailwindcss`)                                                                                          |
| `pnpm mockups`                                      | Render the design mockups and serve them at http://localhost:4174/mockups/                                                                                          |
| `pnpm icons`                                        | Regenerate `src/app/icon.png` (32 px) and `apple-icon.png` (180 px) from `src/app/icon.svg`                                                                         |
| `pnpm fonts`                                        | Build `src/fonts/farnost-sans-*.woff2` (Oxygen with fixed `ť ď ľ Ľ`) from `fonts-source/Oxygen/*.ttf` (needs fonttools, brotli)                                     |
| `pnpm petrklic <id> [--pages]`                      | Render a Petrklíč issue's `cover.webp` (and viewer `pages/`) from `uploads/petrklic/<id>/petrklic-<id>.pdf`                                                         |
| `python3 scripts/poster-webp.py <in> <out.webp>`    | Render an event poster (PDF page 1 or image) to WebP                                                                                                                |
| `python3 scripts/zonerama-album.py <album-url>`     | Read a Zonerama album (title, date, photo counts) as JSON; `--write` adds it to `gallery.ts`                                                                        |
| `pnpm stage aktualita\|porad\|petrklic … [--check]` | Stage an aktualita file, the weekly PDF or a Petrklíč issue in `uploads/` and print its lines for `src/content/`; `aktualita … --record <json>` also adds the event |
| `pnpm add-aktualita <record.json> [--check]`        | Add an aktualita to its month file in `src/content/news/`, in date order, with today's `published` date; checks it with `newsEventSchema`                           |

The last five are used by the content skills (`farnost-create-petrklic`, `-aktualita`, `-galerie`, `-porad-bohosluzeb`).

Before you commit, run the full check and compare the change with the mockups: see
[docs/conventions.md](docs/conventions.md).

## Project layout

```
design/              Design handoff: DESIGN.md (the spec) and mockups per page, size and theme
src/app/             Pages (one folder per route), sitemap and 404
src/styles/          globals.css (Tailwind theme tokens), utilities.css, lightbox.css
src/components/      One component per block, by group: ui/, layout/, home/, news/, services/, contacts/,
                     calendar/, petrklic/, gallery/, support/ (Finanční podpora), links/ (Odkazy), chronicle/
                     (Kronika), activities/ (Seznam aktivit, Výuka náboženství, the group pages)
src/hooks/           Every React hook, one use-<name>.ts each
src/lib/<group>/     Pure logic with unit tests, by the same groups plus shared/ (Prague time, Czech grammar, links)
src/content/         Content, one file per domain (hand-edited data only); news/ holds the aktuality (this year one
                     file per month, 2019–2025 from the old site one per year); ohlasky.ts is server-only
src/server/          Server-only build-time code that combines content with lib, by domain: calendar.ts reads Google
                     Calendar, bible-quote.ts the vira.cz verse, services.ts the schedule exceptions from the ohlášky
src/content/types/   The content types, one file per domain
public/              Static assets served as is (logo, carousel photos at the old site's URLs), plus .htaccess (404
                     page, redirects of moved URLs) and biblicky-citat.php
scripts/             Dev and preview servers, release and deploy, icon, font, mockup and content tooling
fonts-source/        Original Oxygen TTFs and their OFL licence (input for `pnpm fonts`)
.github/workflows/   check.yml: checks pushes and pull requests; deploy.yml: deploys release tags (see Deployment)
.claude/             Claude Code project skills (content, release, commit, design) and rules (conventions by topic)
docs/                Design specs and implementation plans of larger features (e.g. Matomo)
uploads/             Uploaded files (posters, PDFs, Petrklíč, group photos) staged for the server; git-ignored
```

Where code goes and the conventions per topic (styling tokens, accessibility, dates and "now" in a static build,
links, hooks, checking against the design) are in `.claude/rules/`.

## Conventions

Language, stack, the static-export limits, commits and the check before a commit: see
[docs/conventions.md](docs/conventions.md).

## Content

Content lives in `src/content/*.ts`. It is added with project skills for Claude Code (in `.claude/skills/`): `farnost-create-aktualita` (an event from a poster or PDF, into `news/`),
`farnost-create-porad-bohosluzeb` (the weekly ohlášky PDF, into `ohlasky.ts`), `farnost-create-galerie` (a Zonerama
album, into `gallery.ts`) and `farnost-create-petrklic` (a newsletter PDF, into `petrklic.ts`). Each finishes with
`farnost-publish-content`: check, commit and release with `farnost-release`.

Uploaded files are not in git: they are staged in `uploads/` (git-ignored, mirrors `/uploads/` on the server) and
linked root-relative as `/uploads/…` (`pnpm pull-uploads` downloads the server's files you lack). Album photos stay on
Zonerama. The old site's uploads in `/nahrane/` stay on
the server so old links keep working, but new content never links or adds to them.

## Deployment

A **release** deploys the site: `pnpm release` (`scripts/release.sh`, from a clean `main` that is not behind `origin`)
pushes a tag `vX.Y.Z`, and GitHub Actions (`.github/workflows/deploy.yml`) checks and builds the tagged commit and
uploads the **contents** of `out/` to the web root `/farakurim.cz/` (served at https://farakurim.cz/) with rsync over
SSH. The tag must match `version` in `package.json` and point to a commit on `main`. The old PHP site is backed up in
`/stary.farakurim.cz/` on the server.

`pnpm release` shows the commits since the last tag, the next version (minor when a `feat` outside the `content`
scope is among them, patch otherwise, `--major` on request) and the new files in `uploads/`, asks, then uploads them
into `/uploads/` (uploaded files are not in git, so this runs from the machine that staged them), bumps the version
(commit `chore(release): vX.Y.Z` and the tag) and pushes `main` with the tag. A failed release is fixed in a new commit
and released again; a pushed tag is never moved.

`pnpm release --local` deploys from this machine instead, e.g. when GitHub Actions is down. It needs `.env.local` with
the Google Calendar key and both Matomo variables (see [Getting started](#getting-started)): it runs the full check
and a fresh release build (`RELEASE_BUILD=1`, which stops first when a key is missing or malformed), summarises what the sync will add, change and delete, and after the yes uploads the new files,
checks that every `/uploads/…` file the build links is on the server, syncs `out/` and verifies the live site before
it tags. Its release commit carries the trailer `Release-Deploy: local`, so the workflow does not deploy that tag
again.

The site is static, so what depends on the date (the © year, the prerendered calendars, the next mass for visitors
without JS) ages with the build. The deploy workflow therefore runs daily and **refreshes** the latest release tag on
`main` when the last deploy is 7 days old: it checks, builds and deploys that tag like a release (a `--local` one too).
A refresh publishes nothing that was not released, so it needs no yes; running the workflow by hand (the Actions tab,
"Run workflow") refreshes now. GitHub pauses scheduled workflows after 60 days without activity in the repository:
re-enable it in the Actions tab.

The workflow reads `DEPLOY_SSH_KEY` (secret) and `DEPLOY_KNOWN_HOSTS` from the `Production` environment and the
repository variables `GOOGLE_CALENDAR_API_KEY`, `MATOMO_URL` and `MATOMO_SITE_ID` (the build job has no
environment). The deploy stops if the build links a `/uploads/…` file that is not on the server yet (set the
`Production` variable `CHECK_UPLOADS` to `false` to skip that check). `.github/workflows/check.yml` checks and builds
pushes to `main` and pull requests, skipping docs-only changes and release commits, with no secrets; the deploy
workflow calls it for the tag, so a release runs the same check before it builds with the variables above.

The server details (SSH target, web root, rsync flags, server-only folders, verify checks) live only in
`scripts/deploy.sh`, used by both the workflow and `pnpm release`; its commands (`uploads`, `pull-uploads`, `check-uploads`,
`out`, `verify`, with `--dry-run` where it changes the server) also work on their own.

The sync deletes files that are no longer in `out/`, except four folders that live only on the server: `/uploads/`,
`/nahrane/` (the old site's uploads, kept for old links), `/virtualni_prohlidka/` (the old site's virtual tour) and
`/cache/` (the last vira.cz verse). Old `_next/static/` chunks stay 30 days, so a page opened before a release still
loads the chunks it asks for later; pages and their `*.txt` payloads are sent with `Cache-Control: no-cache`, so a
visit after a release never gets an old page whose chunks are gone. `trailingSlash: true` produces `page/index.html`, so Apache serves the pages
without rewrite rules; `public/.htaccess` serves `404.html` for missing URLs and redirects the old URLs that moved.

## License

The source code is under the [MIT License](LICENSE). The content of the site is not: the texts and data in
`src/content/`, the photos, posters, logo and other images in `public/` and the design in `design/` are
© Římskokatolická farnost Kuřim, all rights reserved. Third-party parts keep their own licences: the Oxygen font
(`fonts-source/`, and its subsets in `src/fonts/`) is under the [SIL Open Font License](fonts-source/Oxygen/OFL.txt),
and the agent skills in `.agents/skills/` are under the MIT License from their sources:
`tailwind-design-system` from [wshobson/agents](https://github.com/wshobson/agents) (© 2024 Seth Hobson) and
`vercel-react-best-practices` from [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) (© Vercel).
