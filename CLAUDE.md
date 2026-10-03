@AGENTS.md

# CLAUDE.md

New website of **Římskokatolická farnost Kuřim** (farakurim.cz). Built so far: the **homepage**, **Aktuality**
(`/aktuality/`, one static page per filter), **Archiv aktualit** (`/aktuality/archiv/`, one static page per year
button), **Detail akce** (`/aktuality/<slug>/` plus `kalendar.ics`; shares the `[slug]` segment with the filters),
**Pořad bohoslužeb** (`/porad_bohosluzeb/`, with the ohlášky and the weekly schedule), **Kontakty** (`/kontakty/`),
**Kalendář** (`/kalendar/`, also the homepage "Tento týden" week calendar), **Petrklíč** (`/petrklic/aktualni/`),
**Archiv Petrklíče** (`/petrklic/archiv/`, one static page per year link) and **Fotogalerie** (`/fotogalerie/`, also the
homepage album carousel). Other pages follow as they are designed;
until then, nav links point to the live site.

## Language convention

- **UI copy** (all visible text, alt texts, aria-labels): **Czech**.
- **Code** (identifiers, comments, file names, commit messages): **English**.

## Stack and the static-export constraint

- Next.js 16 (App Router) + React 19 + TypeScript, **pnpm only** (never npm/yarn).
- Styling: **Tailwind CSS v4**. Dates: **date-fns v4 + `@date-fns/tz`**.
  Prefer an established library over hand-written helpers; check it with context7 first.
- Dependencies use caret ranges (`^x.y.z`) so `pnpm update` picks up minor and patch releases.
- `output: "export"` in `next.config.ts`: `pnpm build` writes plain HTML/CSS/JS to `out/`.
- **Why:** the hosting (cesky-hosting.cz) runs PHP 8.4 only, with **no Node.js**. Anything that needs a
  Node server is off the table: route handlers reading the request, server actions, `cookies()`/`headers()`,
  rewrites/redirects/headers in config, ISR, proxy/middleware, and `next/image` optimization.
  Check `node_modules/next/dist/docs/01-app/02-guides/static-exports.md` before using a Next feature.
- Server Components run **at build time**; anything that depends on "now" is re-computed in the browser
  (details in `.claude/rules/content-and-time.md`).

## Commands (run in this folder)

| Command                                          | What it does                                                                                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                       | Dev server at http://localhost:3000                                                                                                |
| `pnpm build`                                     | Static export to `out/`                                                                                                            |
| `pnpm test`                                      | Vitest unit tests (`src/**/*.test.ts`)                                                                                             |
| `pnpm lint`                                      | ESLint (Next core-web-vitals + TypeScript + React hooks rules)                                                                     |
| `pnpm format`                                    | Prettier, including Tailwind class sorting (`prettier-plugin-tailwindcss`)                                                         |
| `pnpm preview`                                   | Serve `out/` at http://localhost:4173 (needs a prior `pnpm build`)                                                                 |
| `pnpm mockups`                                   | Render the design mockups to static HTML and serve them at http://localhost:4174/mockups/                                          |
| `pnpm exec tsc --noEmit`                         | Type check                                                                                                                         |
| `pnpm icons`                                     | Regenerate `src/app/icon.png` (32 px) and `apple-icon.png` (180 px) from `src/app/icon.svg`                                        |
| `pnpm petrklic <pdf-or-dir>`                     | Render Petrklíč covers (and `--pages <id>` viewer pages) from PDFs to `public/assets/img/petrklic/`, for `farnost-create-petrklic` |
| `python3 scripts/poster-webp.py <in> <out.webp>` | Render an event poster (PDF page 1 or image) to WebP, for `farnost-create-aktualita`                                               |
| `python3 scripts/zonerama-album.py <album-url>`  | Read a Zonerama album (title, date, photo URLs) as JSON, for `farnost-create-galerie`                                              |
| `pnpm fonts`                                     | Regenerate `src/fonts/*.woff2` from `fonts-source/Oxygen/*.ttf` (needs `pip install --user fonttools brotli`)                      |

Before you call work done, run: `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`,
then check the change in a browser at **390, 834 and 1440 px** against `design/mockups/`
(how: `.claude/rules/design-check.md`).

## Git and commits

Commit messages follow **Conventional Commits** (`type(scope): subject`), checked by commitlint in the husky
`commit-msg` hook. Use the `commit` skill (`.claude/skills/commit/SKILL.md`); never bypass the hook with `--no-verify`.

## Google Calendar key

`NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY` in `.env.local` (never committed) switches the calendars from mock data to the
parish's Google Calendars, read at build time and again in the browser. It is a browser key (it ends up in the
exported JS), so it must stay restricted to the farakurim.cz referrer and the Calendar API.

## Managing content

Content is edited in `src/content/*.ts` through project skills (ported from the old site's admin workflows in
`farniWebClaudeControl`, which stays untouched): `farnost-create-aktualita` (poster/PDF → `news.ts`),
`farnost-create-porad-bohosluzeb` (weekly PDF → `ohlasky.ts`), `farnost-create-galerie` (Zonerama album →
`gallery.ts`), `farnost-create-petrklic` (Petrklíč PDF → `petrklic.ts` + WebP pages), each finishing with
`farnost-publish-content` (verify, commit, upload checklist).
Uploaded files are **not** in git: they are staged in `uploads/` (git-ignored, mirrors `/uploads/` on the server),
uploaded by hand to `/uploads/…` and linked as `https://farakurim.cz/uploads/…`. Album photos stay on Zonerama.
The old site's `/nahrane/` folder is not used by the new site.

## Deployment

No CI. Build locally, then upload the **contents** of `out/` over SFTP to the web root, plus any staged files from
`uploads/` into `/uploads/`. Never delete `/uploads/` on the server: the uploaded files live only there.
`trailingSlash: true` emits `page/index.html`, so Apache serves it without rewrite rules.

## Project structure

```
design/            Design handoff: DESIGN.md (source of truth), mockups (<page>/<light|dark>/*.dc.html), logo
fonts-source/      Oxygen TTFs + OFL licence (input for `pnpm fonts`)
scripts/           generate-icons.mjs, subset-fonts.sh, render-mockups.py, petrklic-images.py, poster-webp.py,
                   zonerama-album.py
public/assets/img/ logo + carousel photos pozadi/{sm,md,lg}/{1-7}.webp (served at the same URLs as the old site),
                   petrklic/<id>.webp covers and petrklic/<id>/<page>.webp viewer pages
src/app/           layout.tsx (font, metadata, skip link, footer), page.tsx (homepage), aktuality/ ([slug] filters + details, archiv/),
                   porad_bohosluzeb/, kontakty/, kalendar/, petrklic/ (aktualni/, archiv/[rok]/), fotogalerie/,
                   globals.css (Tailwind theme), utilities.css (custom utilities), icons
src/components/    One component per block, styled with Tailwind utilities, grouped by where it is used:
                   ui/ (shared primitives: ButtonLink, headings, icons, …), layout/ (header, footer and their parts),
                   home/ (homepage blocks), news/ (Aktuality, archive, event detail), services/ (Pořad bohoslužeb),
                   contacts/ (Kontakty), calendar/ (Kalendář), petrklic/ (Petrklíč and its archive),
                   gallery/ (Fotogalerie, photo tiles shared with the homepage). Same folder: `./X`; else `@/components/<group>/X`
src/content/       Mock content (types.ts + one file per domain): the future API boundary; calendar.ts reads Google Calendar;
                   ohlasky.ts (weekly ohlášky) is server-only
src/lib/           Pure logic on date-fns (prague.ts, czech.ts, masses.ts, office.ts, news.ts, calendar.ts (.ics),
                   agenda.ts (Kalendář, "Tento týden"), google-calendar.ts, service-sheet.ts (ohlášky), petrklic.ts, gallery.ts) + tests,
                   hooks in use-*.ts (useNow, useCalendarEntries, useSnapCarousel, useLoadMore, …),
                   links.ts (tel:/Mapy.cz hrefs), query-params.ts, theme.ts
```

## Rules

Topic rules live in `.claude/rules/` and load when you work on matching files:

| Rule                  | Covers                                                                     |
| --------------------- | -------------------------------------------------------------------------- |
| `styling.md`          | Design tokens, breakpoints, custom utilities, colours, font                |
| `accessibility.md`    | Headings, labels, touch targets, reduced motion                            |
| `content-and-time.md` | Mock content boundary, Prague dates, build time vs. `useNow`, Czech output |
| `design-check.md`     | Comparing the build with the mockups                                       |
| `hooks.md`            | `use` prefix only for hooks, one `use-<name>.ts` file per hook             |

## The old site

The old PHP codebase (`/run/media/ondrej-planer/HDD/farakurim/www`) is **only a source of assets and files**.
Do not copy or imitate its code; it has known security problems (SQL built by string concatenation,
plaintext passwords).
