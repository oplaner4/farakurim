# farakurim.cz

The new website of **Římskokatolická farnost Kuřim**. Next.js (App Router) exported as a **static site**: the
hosting runs PHP only, with no Node.js, so `pnpm build` writes plain HTML/CSS/JS to `out/`.

Built so far: the homepage, Aktuality (with the event detail pages and the archive, one page per year back to
2019), Pořad bohoslužeb, Kontakty, Kalendář, Petrklíč (the current issue and the archive), Fotogalerie, Finanční
podpora (the projects of the year, with QR Platba codes drawn at build time, and Starší projekty with the yearly
accounts), Odkazy, Kronika farnosti, Výuka náboženství, Seznam aktivit and the group page template (Schola). The old site's
other pages have placeholders ("Stránku připravujeme") at their URLs, so nothing 404s after the switch. Every page
shares the header with the "Více" menu and the sitemap footer with the "Slovo na dnešek" Bible verse. Links to pages
that are not rebuilt yet point to the live site.

## Requirements

- **Node.js ≥ 20.9** (required by Next.js 16)
- **pnpm 10** (`corepack enable` picks up the version in `package.json`). Do not use npm or yarn.
- **Python 3** for `pnpm preview`, `pnpm mockups` and the content scripts; `pnpm petrklic` and
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
show mock data generated from the regular mass schedule and the Aktuality records. To use the real calendars, copy the
example file to `.env.local` (never committed) and fill in the key:

```sh
cp .env.local.example .env.local
```

The key is read at build time and again in the browser, so it ends up in the published JavaScript. Restrict it in
Google Cloud to the `farakurim.cz` referrer and the Google Calendar API.

### "Slovo na dnešek" (vira.cz)

The footer shows the day's verse from the [vira.cz widget](https://www.vira.cz/Servis-pro-vas/Sluzby-pro-webmastery/Zobrazeni-biblickeho-citatu).
The build fetches it into every page. vira.cz sends no CORS headers, so on the server the browser asks
`public/biblicky-citat.php`, a small PHP proxy that fetches the verse once a day, caches it in `/cache/` and falls
back to the last verse while vira.cz is down. It is the only server-side code. `pnpm dev` and `pnpm preview` run no
PHP, so they show the build's verse. The "Zdroj: www.vira.cz" link is vira.cz's condition of use.

## Commands

| Command                                          | What it does                                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                       | Dev server at http://localhost:3000 (`scripts/dev-server.mjs`: `next dev` plus `/uploads/…` from `uploads/` or the live site)   |
| `pnpm build`                                     | Static export to `out/`                                                                                                         |
| `pnpm preview`                                   | Serve `out/` at http://localhost:4173 (run `pnpm build` first), `/uploads/…` from `uploads/` or the live site                   |
| `pnpm test`                                      | Vitest unit tests (`src/**/*.test.ts`)                                                                                          |
| `pnpm lint`                                      | ESLint (Next core-web-vitals + TypeScript + React hooks rules)                                                                  |
| `pnpm exec tsc --noEmit`                         | Type check                                                                                                                      |
| `pnpm format`                                    | Prettier, including Tailwind class sorting (`prettier-plugin-tailwindcss`)                                                      |
| `pnpm mockups`                                   | Render the design mockups and serve them at http://localhost:4174/mockups/                                                      |
| `pnpm icons`                                     | Regenerate `src/app/icon.png` (32 px) and `apple-icon.png` (180 px) from `src/app/icon.svg`                                     |
| `pnpm fonts`                                     | Build `src/fonts/farnost-sans-*.woff2` (Oxygen with fixed `ť ď ľ Ľ`) from `fonts-source/Oxygen/*.ttf` (needs fonttools, brotli) |
| `pnpm petrklic <id> [--pages]`                   | Render a Petrklíč issue's `cover.webp` (and viewer `pages/`) from `uploads/petrklic/<id>/petrklic-<id>.pdf`                     |
| `python3 scripts/poster-webp.py <in> <out.webp>` | Render an event poster (PDF page 1 or image) to WebP                                                                            |
| `python3 scripts/zonerama-album.py <album-url>`  | Read a Zonerama album (title, date, photo URLs) as JSON                                                                         |

The last three are used by the content skills (`farnost-create-petrklic`, `-aktualita`, `-galerie`).

Before you commit, run the full check:

```sh
pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build
```

Then compare the change with the mockups in a browser at 390, 834 and 1440 px, in the light and dark theme
(`pnpm mockups` next to `pnpm preview`).

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
src/content/         Content, one file per domain (mock data and build-time fetches): an API later. calendar.ts reads
                     Google Calendar and bible-quote.ts the vira.cz verse at build time; news-archive/ holds the
                     2019–2025 aktuality from the old site (one file per year); ohlasky.ts is server-only
src/content/types/   The content types, one file per domain
public/              Static assets served as is (logo, carousel photos at the old site's URLs), plus .htaccess and
                     biblicky-citat.php
scripts/             Dev and preview servers, icon, font, mockup and content tooling
fonts-source/        Original Oxygen TTFs and their OFL licence (input for `pnpm fonts`)
.github/workflows/   build-and-deploy.yml: check, build and deploy (see Deployment)
uploads/             Uploaded files (posters, PDFs, Petrklíč, group photos) staged for the server; git-ignored
```

`CLAUDE.md` and `.claude/rules/` describe the conventions in detail: where code goes, styling tokens,
accessibility, dates and "now" in a static build, links, hooks and checking against the design.

## Content

Content lives in `src/content/*.ts`. It is added with project skills for Claude Code (in `.claude/skills/`):
`farnost-create-aktualita` (an event from a poster), `farnost-create-porad-bohosluzeb` (the weekly ohlášky PDF),
`farnost-create-galerie` (a Zonerama album) and `farnost-create-petrklic` (a newsletter PDF). Each finishes with
`farnost-publish-content`: check, commit and deploy. Uploaded files are not in git: they are staged in `uploads/`,
deployed to `/uploads/…` and linked root-relative. Album photos stay on Zonerama.

## Conventions

- UI copy is **Czech**; code, comments and commit messages are **English**.
- Styling uses Tailwind CSS v4 with the design tokens in `src/styles/globals.css` only (no hex or arbitrary values).
- Everything must work as a static export: no route handlers reading the request, server actions, middleware,
  ISR or `next/image` optimisation.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat(news): …`), checked by
  commitlint in the `commit-msg` hook. Don't bypass the hook with `--no-verify`.

## Deployment

GitHub Actions (`.github/workflows/build-and-deploy.yml`) checks and builds every push and pull request; pushes to `main` are
only a backup. A **release** deploys: pushing a tag `vX.Y.Z` that matches `version` in `package.json` and points to a
commit on `main` uploads the **contents** of `out/` to the web root with rsync over SSH (for now
`/2026.farakurim.cz/`, served at http://2026.farakurim.cz/). Make releases with
`pnpm version <patch|minor|major> -m "chore(release): v%s"` (it bumps, commits and tags; needs a clean tree), then
`git push origin main --follow-tags`. The workflow reads `DEPLOY_SSH_KEY` (secret) and `DEPLOY_KNOWN_HOSTS` from the `Production` environment and
the repository variable `GOOGLE_CALENDAR_API_KEY` (the build job has no environment). Uploaded files are not in git, so upload new files from `uploads/` into `/uploads/`
yourself before the release (the `farnost-deploy` skill has the commands): the workflow stops if the build links a file
that is not on the server yet (set the `Production` variable `CHECK_UPLOADS` to `false` to skip that check). The sync deletes files that are no longer in
`out/`, except three folders that live only on the server: `/uploads/`, `/virtualni_prohlidka/` (the old site's
virtual tour) and `/cache/` (the last vira.cz verse). `trailingSlash: true` produces `page/index.html`, so Apache
serves the pages without rewrite rules; `public/.htaccess` serves `404.html` for missing URLs.
