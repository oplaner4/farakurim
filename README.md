# farakurim.cz

The new website of **Římskokatolická farnost Kuřim**. Next.js (App Router) exported as a **static site**: the
hosting runs PHP only, with no Node.js, so `pnpm build` writes plain HTML/CSS/JS to `out/`.

Built so far: the homepage, Aktuality (with the event detail pages and the archive, one page per year back to
2019), Pořad bohoslužeb, Kontakty, Kalendář, Petrklíč (the current issue and the archive) and Fotogalerie. Every page
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

| Command                                          | What it does                                                               |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| `pnpm dev`                                       | Dev server at http://localhost:3000                                        |
| `pnpm build`                                     | Static export to `out/`                                                    |
| `pnpm preview`                                   | Serve `out/` at http://localhost:4173 (run `pnpm build` first)             |
| `pnpm test`                                      | Vitest unit tests (`src/**/*.test.ts`)                                     |
| `pnpm lint`                                      | ESLint                                                                     |
| `pnpm exec tsc --noEmit`                         | Type check                                                                 |
| `pnpm format`                                    | Prettier, including Tailwind class sorting                                 |
| `pnpm mockups`                                   | Render the design mockups and serve them at http://localhost:4174/mockups/ |
| `pnpm icons`                                     | Regenerate `src/app/icon.png` and `apple-icon.png` from `src/app/icon.svg` |
| `pnpm fonts`                                     | Regenerate `src/fonts/*.woff2` from `fonts-source/Oxygen/*.ttf`            |
| `pnpm petrklic <id> [--pages]`                   | Render a Petrklíč issue's cover (and viewer pages) from its PDF            |
| `python3 scripts/poster-webp.py <in> <out.webp>` | Render an event poster (PDF page 1 or image) to WebP                       |
| `python3 scripts/zonerama-album.py <album-url>`  | Read a Zonerama album (title, date, photo URLs) as JSON                    |

Before you commit, run the full check:

```sh
pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build
```

Then compare the change with the mockups in a browser at 390, 834 and 1440 px, in the light and dark theme
(`pnpm mockups` next to `pnpm preview`).

## Project layout

```
design/              Design handoff: DESIGN.md (the spec) and mockups per page, size and theme
src/app/             Pages (one folder per route), globals.css (Tailwind theme tokens), sitemap and 404
src/components/      One component per block, by group: ui/, layout/, home/, news/, services/, contacts/,
                     calendar/, petrklic/, gallery/
src/hooks/           Every React hook, one use-<name>.ts each
src/lib/<group>/     Pure logic with unit tests, by the same groups plus shared/ (Prague time, Czech grammar, links)
src/content/         Content, one file per domain (mock data and build-time fetches): an API later
src/content/types/   The content types, one file per domain
public/              Static assets served as is, plus .htaccess and biblicky-citat.php
scripts/             Dev and preview servers, icon, font, mockup and content tooling
uploads/             Uploaded files (posters, PDFs, Petrklíč) staged for the server; git-ignored
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
- Styling uses Tailwind CSS v4 with the design tokens in `src/app/globals.css` only (no hex or arbitrary values).
- Everything must work as a static export: no route handlers reading the request, server actions, middleware,
  ISR or `next/image` optimisation.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat(news): …`), checked by
  commitlint in the `commit-msg` hook. Don't bypass the hook with `--no-verify`.

## Deployment

There is no CI. Build locally (with `.env.local` in place) and upload `uploads/` into `/uploads/` and the
**contents** of `out/` to the web root with rsync over SSH (the `farnost-deploy` skill has the commands; for now the
web root is `/2026.farakurim.cz/`, served at http://2026.farakurim.cz/). The sync deletes files that are no longer in
`out/`, except three folders that live only on the server: `/uploads/`, `/virtualni_prohlidka/` (the old site's
virtual tour) and `/cache/` (the last vira.cz verse). `trailingSlash: true` produces `page/index.html`, so Apache
serves the pages without rewrite rules; `public/.htaccess` serves `404.html` for missing URLs.
