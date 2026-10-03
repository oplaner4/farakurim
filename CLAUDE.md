@AGENTS.md

# CLAUDE.md

New website of **Římskokatolická farnost Kuřim** (farakurim.cz). Current scope: the **homepage only**.
The other pages follow once the homepage design is approved; until then, nav links point to the live site.

## Language convention

- **UI copy** (all visible text, alt texts, aria-labels): **Czech**.
- **Code** (identifiers, comments, file names, commit messages): **English**.

## Stack and the static-export constraint

- Next.js 16 (App Router) + React 19 + TypeScript, **pnpm only** (never npm/yarn).
- Styling: **Tailwind CSS v4** (utility classes in the components). Dates: **date-fns v4 + `@date-fns/tz`**.
  Class names: `clsx`. Prefer an established library over hand-written helpers; check it with context7 first.
- Dependencies use caret ranges (`^x.y.z`) so `pnpm update` picks up minor and patch releases.
- `output: "export"` in `next.config.ts`: `pnpm build` writes plain HTML/CSS/JS to `out/`.
- **Why:** the hosting (cesky-hosting.cz) runs PHP 8.4 only, with **no Node.js**. Anything that needs a
  Node server is off the table: route handlers reading the request, server actions, `cookies()`/`headers()`,
  rewrites/redirects/headers in config, ISR, proxy/middleware, and `next/image` optimization.
  Check `node_modules/next/dist/docs/01-app/02-guides/static-exports.md` before using a Next feature.
- Server Components run **at build time**. Anything that depends on "now" (next mass, countdown, which
  news are current) is rendered with the build timestamp (`src/lib/build-time.ts`) and re-computed in the
  browser through `useNow()` (`src/lib/use-now.ts`, `useSyncExternalStore`, no hydration mismatch).
  Client components get `renderedAt={BUILD_TIME}` as a prop; never call `Date.now()` during render.
- Accepted trade-off: content only changes on rebuild and redeploy, and visitors without JS see the
  build-time next mass.

## Commands (run in this folder)

| Command                  | What it does                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`               | Dev server at http://localhost:3000                                                                           |
| `pnpm build`             | Static export to `out/`                                                                                       |
| `pnpm test`              | Vitest unit tests (`src/**/*.test.ts`)                                                                        |
| `pnpm lint`              | ESLint (Next core-web-vitals + TypeScript + React hooks rules)                                                |
| `pnpm format`            | Prettier, including Tailwind class sorting (`prettier-plugin-tailwindcss`)                                    |
| `pnpm preview`           | Serve `out/` at http://localhost:4173 (needs a prior `pnpm build`)                                            |
| `pnpm mockups`           | Render the design mockups to static HTML and serve them at http://localhost:4174/mockups/                     |
| `pnpm exec tsc --noEmit` | Type check                                                                                                    |
| `pnpm icons`             | Regenerate `src/app/icon.png` (32 px) and `apple-icon.png` (180 px) from `src/app/icon.svg`                   |
| `pnpm fonts`             | Regenerate `src/fonts/*.woff2` from `fonts-source/Oxygen/*.ttf` (needs `pip install --user fonttools brotli`) |

Before you call work done, run: `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`,
then check the change in a browser (Playwright or Claude in Chrome) at **390, 834 and 1440 px** against
`design/mockups/` (see "Checking against the design").

## Git and commits

Commit messages follow **Conventional Commits** (`type(scope): subject`), checked by commitlint in the husky
`commit-msg` hook. Use the `commit` skill (`.claude/skills/commit/SKILL.md`); never bypass the hook with `--no-verify`.

## Deployment

No CI. Build locally, then upload the **contents** of `out/` over SFTP to the web root.
`trailingSlash: true` emits `page/index.html`, so Apache serves it without rewrite rules.

## Project structure

```
design/            Design handoff: DESIGN.md (source of truth), mockups (*.dc.html), logo
fonts-source/      Oxygen TTFs + OFL licence (input for `pnpm fonts`)
scripts/           generate-icons.mjs, subset-fonts.sh, render-mockups.py
public/assets/img/ logo + carousel photos pozadi/{sm,md,lg}/{1-7}.webp (served at the same URLs as the old site)
src/app/           layout.tsx (font, metadata), page.tsx (homepage), globals.css (Tailwind theme), icons
src/components/    One component per block, styled with Tailwind utilities; ButtonLink, SectionHeading, icons shared
src/content/       Mock content (types.ts + one file per domain): the future API boundary
src/lib/           Pure logic on date-fns (prague.ts, czech.ts, masses.ts, news.ts) + tests, useNow hook
```

## Design rules

- `design/DESIGN.md` is the **source of truth**. The mockups give exact values (sizes, spacing, copy);
  never copy their structure (inline styles, three separate files).
- Tokens live in the `@theme` block of `src/app/globals.css`. Tailwind's default palette, breakpoints,
  type scale, radii and shadows are **removed**, so only design values exist:
  colours `blue`, `blue-ink`, `magenta-tint`, `ink-2`, `muted`, …; sizes named by pixels (`text-26`,
  `rounded-24`, `shadow-card`); spacing is Tailwind's 4 px scale (`p-4` = 16 px, `h-13` = 52 px).
  No hard-coded hex values or arbitrary colours in components; add a token instead.
- **Mobile-first breakpoints:** no prefix = mobile, `md:` = tablet (≥ 768 px), `lg:` = desktop (≥ 1200 px).
  Use `max-md:` / `max-lg:` when a style must not leak upwards (e.g. borders with `not-first:`).
  One markup per component; breakpoint layouts use `contents`, `order-*`, grid and `hidden`/`block`.
- Custom utilities in `globals.css`: `container-page` (16/32 px gutter, max 1200 px content),
  `shard-tl|tr|br|bl` (clip-path triangles named by their right-angle corner), `no-scrollbar`.
- Avoid `!important` (`!`) and duplicate utilities for the same property on one element.
- Section colours: blue = mass, Kontakty, primary actions · magenta = Aktuality · green = Fotogalerie · orange = Petrklíč.
- Contrast: coloured **text** uses the `*-ink` shades. Never white text on green or orange
  (the orange button has dark text).
- Font: self-hosted Oxygen via `next/font/local` (400 and 700 are registered; 300 is available).
  Oxygen has no `→` glyph, so arrows are SVG icons (`ArrowRightIcon`).
- No gradients, no emoji, no dark or sad colours. The decorative "shards" are `clip-path` triangles on `aria-hidden` spans.

## Content and data

- All content is **mock data** in `src/content/`, typed by `src/content/types.ts`. Components and `src/lib`
  only depend on those types, so a real API or CMS can replace the files later without touching the UI.
- Dates are ISO `YYYY-MM-DD`, times `H:MM`, both **Europe/Prague wall-clock**. Use `pragueDateTime()` /
  `pragueDate()` from `src/lib/prague.ts` and pass `{ in: inPrague }` to date-fns functions;
  never use the browser's local time zone for schedule maths.
- Mass schedule (`content/masses.ts`): `regularMasses` is the weekly schedule. Everything else (first Friday and
  first Saturday variants, changes from the ohlášky, cancellations) is a `scheduleExceptions` entry, which
  **replaces the whole day**. Never hard-code those variants in logic.
- Czech output: `plural()` (built on `Intl.PluralRules("cs")`), date-fns `cs` locale (genitive month names
  after a day number), `"4. 10."` short dates, `"Dnes"`/`"Zítra"` labels; see `src/lib/czech.ts`.
- External links to the live site sit in `content/site.ts` (`links`); swap them when the pages are rebuilt here.

## Checking against the design

The mockups are design-tool templates (`<x-dc>`, `<sc-if>`, `{{holes}}`) and cannot be opened directly.
`pnpm mockups` renders them to `.design-preview/` and serves them at http://localhost:4174/mockups/
(`mobile-390.html`, `tablet-834.html`, `desktop-1440.html`). Serve the build with `pnpm preview` and compare
screenshots plus block positions
(`getBoundingClientRect()` of each `section[aria-labelledby]`) at 390 / 834 / 1440 px.
Remember the mockup frames are fixed-width, so give the browser a viewport ~15 px wider for the scrollbar.
Known, intentional differences: real photos instead of tinted placeholders, the countdown values, and
designed placeholders instead of the `[foto alba]` / `[plakát akce]` labels.

## Accessibility

`<html lang="cs">`; one visually hidden `<h1>` (the parish name), then an `<h2>` per section. Real `<a>`/`<button>`
elements; icon-only buttons need a Czech `aria-label`. The menu toggle uses `aria-expanded` + `aria-controls`.
Touch targets ≥ 44 px. Decorative elements are `aria-hidden`. Respect `prefers-reduced-motion`
(the carousel autoplay is off under it and stops for good once the visitor uses the controls).

## The old site

The old PHP codebase (`/run/media/ondrej-planer/HDD/farakurim/www`) is **only a source of assets and files**.
Do not copy or imitate its code; it has known security problems (SQL built by string concatenation,
plaintext passwords).
