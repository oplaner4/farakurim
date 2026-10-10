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
- **Python 3** for `pnpm preview` and `pnpm mockups`
- **poppler-utils** (`pdftoppm`, `pdfinfo`, `pdftotext`) for the PDFs of `pnpm stage`; its tests skip the PDF cases
  without it
- Optional: `pip install --user fonttools brotli` to regenerate the web fonts (`pnpm fonts`), and PHP to try
  `public/biblicky-citat.php` locally (`php -S`)

## Getting started

```sh
pnpm install   # also installs the git hooks (husky)
pnpm dev       # http://localhost:3000
```

`pnpm dev` and `pnpm preview` serve `/uploads/…` from the local `uploads/` folder (git-ignored, see
[Content](#content)) and redirect missing files to the live site.

### Keys in `.env.local` (optional)

Copy the example file to `.env.local` (never committed) and fill in what you need:

```sh
cp .env.local.example .env.local
```

- **`NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY`**: the Kalendář page and the homepage week calendar read the parish's two
  public Google Calendars. Without the key they show entries generated from the regular mass schedule and the
  Aktuality records. The key ends up in the published JavaScript, so restrict it in Google Cloud to the
  `farakurim.cz` referrer and the Google Calendar API.
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

| Command                                    | What it does                                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                 | Dev server at http://localhost:3000, `/uploads/…` from `uploads/` or the live site                 |
| `pnpm build`                               | Static export to `out/`; clears Next's fetch cache first, so calendars and the verse are read anew |
| `pnpm preview`                             | Serve `out/` at http://localhost:4173 (run `pnpm build` first), uploads as in `pnpm dev`           |
| `pnpm test`                                | Vitest unit tests (`src/**/*.test.ts`, `scripts/**/*.test.ts`)                                     |
| `pnpm lint`                                | ESLint (Next core-web-vitals, TypeScript and React hooks rules)                                    |
| `pnpm exec tsc --noEmit`                   | Type check                                                                                         |
| `pnpm format`                              | Prettier, including Tailwind class sorting                                                         |
| `pnpm mockups`                             | Render the design mockups and serve them at http://localhost:4174/mockups/                         |
| `pnpm release [--local] [--yes] [--major]` | Publish the site (see [Deployment](#deployment)); asks unless `--yes`                              |
| `pnpm pull-uploads [--dry-run]`            | Download the server's `/uploads/` files missing in `uploads/` (never overwrites or deletes)        |
| `pnpm icons`                               | Regenerate `src/app/icon.png` and `apple-icon.png` from `src/app/icon.svg`                         |
| `pnpm fonts`                               | Build `src/fonts/farnost-sans-*.woff2` (Oxygen with fixed `ť ď ľ Ľ`) from `fonts-source/`          |

Content tooling, used by the content skills (see [Content](#content)):

| Command                                             | What it does                                                                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm stage aktualita\|porad\|petrklic … [--check]` | Stage a file in `uploads/`; petrklic adds the issue to `petrklic.json`, the others print or add a `--record`; `--corrected` for a corrected PDF |
| `pnpm add-aktualita <record.json> [--check]`        | Add an aktualita to its month's JSON file in `src/content/news/`, checked by its schema                                                         |
| `pnpm aktualita-calendar <id> [--out <dir>]`        | Check that the aktualita's Události event links its page; else write the `.ics`                                                                 |
| `pnpm add-album <album-url> [--write \| --check …]` | Read a Zonerama album as JSON; `--write` adds it to `gallery.json` and removes the oldest beyond 6, `--check` only says what `--write` would do |

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
src/content/         Content, one file per domain (hand-edited data only); news/ holds the aktuality (one JSON file per month)
src/content/types/   The content types, one file per domain
src/server/          Server-only build-time code: Google Calendar, the vira.cz verse, the schedule exceptions
public/              Static assets, plus .htaccess (404 page, caching, redirects of moved URLs) and biblicky-citat.php
scripts/             Dev and preview servers, release and deploy, icon, font, mockup and content tooling
fonts-source/        Original Oxygen TTFs and their OFL licence (input for `pnpm fonts`)
.github/workflows/   check.yml checks pushes and pull requests; deploy.yml deploys (see Deployment)
.claude/             Claude Code project skills (content, release, commit, design) and rules by topic
.agents/skills/      Third-party agent skills (see License), pinned in skills-lock.json
docs/                Conventions, deployment, and design specs and plans of larger features
uploads/             Uploaded files (posters, PDFs, Petrklíč, group photos) staged for the server; git-ignored
```

Where code goes and the conventions per topic (styling tokens, accessibility, dates and "now" in a static build,
links, hooks, checking against the design) are in `.claude/rules/`.

## Content

Content lives in `src/content/` and is added with the Claude Code project skills in `.claude/skills/`:

| Skill                             | Adds                                            |
| --------------------------------- | ----------------------------------------------- |
| `farnost-create-aktualita`        | An event from a poster or PDF, into `news/`     |
| `farnost-create-porad-bohosluzeb` | The weekly ohlášky PDF, into `ohlasky.json`     |
| `farnost-create-galerie`          | A Zonerama album, into `gallery.json`           |
| `farnost-create-petrklic`         | A Petrklíč newsletter PDF, into `petrklic.json` |

Each finishes with `farnost-publish-content`, which commits and releases with `farnost-release`.

Uploaded files are not in git: they are staged in `uploads/` (git-ignored, mirrors `/uploads/` on the server) and
linked root-relative as `/uploads/…`; `pnpm pull-uploads` downloads the server's files you lack. Album photos stay on
Zonerama. The old site's uploads in `/nahrane/` stay on the server so old links keep working, but new content never
links or adds to them.

## Deployment

`pnpm release` publishes the site: it uploads the new files in `uploads/`, tags `vX.Y.Z` and pushes, and GitHub
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
