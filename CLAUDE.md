@AGENTS.md

# CLAUDE.md

New website of **Římskokatolická farnost Kuřim** (farakurim.cz). `README.md` has the pages built so far, the
requirements, the **commands**, the project layout and the deployment overview: read it first. This file holds what
an agent must follow on top of it. Pages not rebuilt yet have placeholders ("Stránku připravujeme"); the design spec is
`design/DESIGN.md` (the shared lightbox is §21, the header and footer §20, nav groups in `navGroups`).

## Language convention

- **UI copy** (all visible text, alt texts, aria-labels): **Czech**.
- **Code** (identifiers, comments, file names, commit messages): **English**.

## Stack and the static-export constraint

- Next.js 16 (App Router) + React 19 + TypeScript, **pnpm only** (never npm/yarn).
- Styling: **Tailwind CSS v4**. Dates: **date-fns v4 + `@date-fns/tz`**. Lightbox: **yet-another-react-lightbox**
  (loaded on first use, restyled in `src/styles/lightbox.css`; the URL hash opens and closes it).
  Prefer an established library over hand-written helpers; check it with context7 first.
- Dependencies use caret ranges (`^x.y.z`) so `pnpm update` picks up minor and patch releases.
- `output: "export"` in `next.config.ts`: `pnpm build` writes plain HTML/CSS/JS to `out/`.
- **Why:** the hosting (cesky-hosting.cz) runs PHP 8.4 only, with **no Node.js**. Anything that needs a
  Node server is off the table: route handlers reading the request, server actions, `cookies()`/`headers()`,
  rewrites/redirects/headers in config, ISR, proxy/middleware, and `next/image` optimization.
  Check `node_modules/next/dist/docs/01-app/02-guides/static-exports.md` before using a Next feature.
  The one server-side piece is `public/biblicky-citat.php`, the PHP proxy for the vira.cz verse (README).
- Server Components run **at build time**; anything that depends on "now" is re-computed in the browser
  (details in `.claude/rules/content-and-time.md`).
- `NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY` (`.env.local`, never committed) switches the calendars from mock data to
  Google Calendar. It ends up in the exported JS, so it must stay restricted to the farakurim.cz referrer.

## Done means checked

Commands are in [README.md § Commands](README.md#commands). Before you call work done, run
`pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`, then check the change in a browser
at **390, 834 and 1440 px** against `design/mockups/` (how: `.claude/rules/design-check.md`).

## Git and commits

Commit messages follow **Conventional Commits** (`type(scope): subject`), checked by commitlint in the husky
`commit-msg` hook. Use the `commit` skill (`.claude/skills/commit/SKILL.md`); never bypass the hook with `--no-verify`.

## Managing content

Content is edited in `src/content/*.ts` through project skills (ported from the old site's admin workflows in
`farniWebClaudeControl`, which stays untouched): `farnost-create-aktualita` (poster/PDF → `news.ts`),
`farnost-create-porad-bohosluzeb` (weekly PDF → `ohlasky.ts`), `farnost-create-galerie` (Zonerama album →
`gallery.ts`), `farnost-create-petrklic` (Petrklíč PDF → `petrklic.ts`), each finishing with
`farnost-publish-content` (verify, commit, deploy via `farnost-deploy`).
Uploaded files are **not** in git: they are staged in `uploads/` (git-ignored, mirrors `/uploads/` on the server)
and linked root-relative as `/uploads/…`. Album photos stay on Zonerama. The old site's `/nahrane/` is not used.

## Deployment

How it works is in [README.md § Deployment](README.md#deployment); the steps are in the `farnost-deploy` skill.
What an agent must never get wrong:

- Pushing a release tag `vX.Y.Z` **publishes the site** (GitHub Actions deploys `out/`; pushes to `main` are only a
  backup), and so does uploading `uploads/`: ask the user for an explicit yes before either. Releases are made by the
  `farnost-deploy` skill from a clean tree (`pnpm version` bumps `package.json`, commits and tags).
- `/farakurim.cz/` on the server is the live old PHP site: never deploy there.
- Never delete `/uploads/`, `/virtualni_prohlidka/` or `/cache/` on the server: they live only there.
- **Keep `.github/workflows/build-and-deploy.yml` and the `farnost-deploy` skill in sync:** the SSH target, web root, rsync
  flags, the three excludes and the verify checks live in both, so a change to one is a change to the other.

## Rules

Topic rules live in `.claude/rules/` and load when you work on matching files:

| Rule                  | Covers                                                                     |
| --------------------- | -------------------------------------------------------------------------- |
| `styling.md`          | Design tokens, breakpoints, custom utilities, colours, font                |
| `accessibility.md`    | Headings, labels, touch targets, reduced motion                            |
| `content-and-time.md` | Mock content boundary, Prague dates, build time vs. `useNow`, Czech output |
| `design-check.md`     | Comparing the build with the mockups                                       |
| `hooks.md`            | `use` prefix only for hooks, one `use-<name>.ts` file per hook             |
| `links.md`            | External links open in a new tab (`src/lib/shared/links.ts` helpers)       |
| `structure.md`        | Where code goes: components, hooks, `lib` and content types by domain      |

## The old site

The old PHP codebase (`/run/media/ondrej-planer/HDD/farakurim/www`) is **only a source of assets and files**.
Do not copy or imitate its code; it has known security problems (SQL built by string concatenation,
plaintext passwords).
