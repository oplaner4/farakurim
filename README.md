# farakurim.cz

The new website of **Římskokatolická farnost Kuřim**. Next.js (App Router) exported as a **static site**: the
hosting runs PHP only, with no Node.js, so `pnpm build` writes plain HTML/CSS/JS to `out/`.

Built so far: the homepage, Aktuality (with the archive and event detail pages), Pořad bohoslužeb, Kontakty and
Kalendář. Links to pages that are not rebuilt yet point to the live site.

## Requirements

- **Node.js ≥ 20.9** (required by Next.js 16)
- **pnpm 10** (`corepack enable` picks up the version in `package.json`). Do not use npm or yarn.
- **Python 3** for `pnpm preview` and `pnpm mockups`
- Optional: `pip install --user fonttools brotli` to regenerate the web fonts (`pnpm fonts`)

## Getting started

```sh
pnpm install   # also installs the git hooks (husky)
pnpm dev       # http://localhost:3000
```

### Google Calendar (optional)

The Kalendář page and the homepage week calendar read the parish's two public Google Calendars. Without a key they
show mock data generated from the regular mass schedule and the Aktuality records. To use the real calendars, create
`.env.local` (never committed):

```sh
NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY=…
```

The key is read at build time and again in the browser, so it ends up in the published JavaScript. Restrict it in
Google Cloud to the `farakurim.cz` referrer and the Google Calendar API.

## Commands

| Command                  | What it does                                                               |
| ------------------------ | -------------------------------------------------------------------------- |
| `pnpm dev`               | Dev server at http://localhost:3000                                        |
| `pnpm build`             | Static export to `out/`                                                    |
| `pnpm preview`           | Serve `out/` at http://localhost:4173 (run `pnpm build` first)             |
| `pnpm test`              | Vitest unit tests (`src/**/*.test.ts`)                                     |
| `pnpm lint`              | ESLint                                                                     |
| `pnpm exec tsc --noEmit` | Type check                                                                 |
| `pnpm format`            | Prettier, including Tailwind class sorting                                 |
| `pnpm mockups`           | Render the design mockups and serve them at http://localhost:4174/mockups/ |
| `pnpm icons`             | Regenerate `src/app/icon.png` and `apple-icon.png` from `src/app/icon.svg` |
| `pnpm fonts`             | Regenerate `src/fonts/*.woff2` from `fonts-source/Oxygen/*.ttf`            |

Before you commit, run the full check:

```sh
pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build
```

Then compare the change with the mockups in a browser at 390, 834 and 1440 px, in the light and dark theme
(`pnpm mockups` next to `pnpm preview`).

## Project layout

```
design/         Design handoff: DESIGN.md (the spec) and mockups per page, size and theme
src/app/        Pages (one folder per route) and globals.css (Tailwind theme tokens)
src/components/ One component per block, grouped by page: ui/, layout/, home/, news/, services/, contacts/, calendar/
src/content/    Content behind typed modules (types.ts): mock data now, an API later
src/lib/        Pure date and schedule logic (date-fns, Europe/Prague) with unit tests
scripts/        Icon, font and mockup tooling
public/         Static assets served as is
```

`CLAUDE.md` and `.claude/rules/` describe the conventions in detail: styling tokens, accessibility, dates and
"now" in a static build, and checking against the design.

## Conventions

- UI copy is **Czech**; code, comments and commit messages are **English**.
- Styling uses Tailwind CSS v4 with the design tokens in `src/app/globals.css` only (no hex or arbitrary values).
- Everything must work as a static export: no route handlers reading the request, server actions, middleware,
  ISR or `next/image` optimisation.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat(news): …`), checked by
  commitlint in the `commit-msg` hook. Don't bypass the hook with `--no-verify`.

## Deployment

There is no CI. Build locally (with `.env.local` in place) and upload the **contents** of `out/` over SFTP to the
web root. `trailingSlash: true` produces `page/index.html`, so Apache serves the pages without rewrite rules.
