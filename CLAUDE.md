@AGENTS.md
@docs/conventions.md

# CLAUDE.md

New website of **Římskokatolická farnost Kuřim** (farakurim.cz). The project conventions (language, stack, static
export, commits, the check before a commit) are imported above from `docs/conventions.md`. `README.md` describes the
rest: the requirements, the commands, the layout, the content workflow and how deployment works. **Read it first.**
This file holds only what an agent must follow on top of them. Pages not rebuilt yet have placeholders ("Stránku
připravujeme"); the design spec is `design/DESIGN.md` (the shared lightbox is §21, the header and footer §20, nav
groups in `navGroups`).

## Working rules

- Check a library with context7 before you use it, and check
  `node_modules/next/dist/docs/01-app/02-guides/static-exports.md` before you use a Next feature.
- `NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY` ends up in the exported JS: never commit `.env.local`, and keep the key
  restricted to the farakurim.cz referrer.
- Keep the Matomo tracker (`MatomoTracker`) cookieless, and update the privacy page when the site starts loading a
  new third-party service.

## Done means checked

Never call work done before the full check and the browser check in `docs/conventions.md` pass. A content-only
change (`src/content/` through the content skills) needs no browser check: its tests check the data.

## Git and commits

Use the `commit` skill (`.claude/skills/commit/SKILL.md`); never bypass the commitlint hook with `--no-verify`.

## Managing content

Use the content skills listed in [README.md § Content](README.md#content).

## Deployment

`pnpm release` (`scripts/release.sh`) releases, and the `farnost-release` skill says how an agent runs it.
What an agent must never get wrong:

- Pushing a release tag `vX.Y.Z` **publishes the site** (GitHub Actions deploys it; pushes to `main` are only a
  backup), and so do `pnpm release --yes` (it pushes the tag), `pnpm release --local --yes`, `scripts/deploy.sh out`
  and `scripts/deploy.sh uploads`: ask the user for an explicit yes before any of them. Preview with `pnpm release`,
  and run `pnpm release --yes` only after that yes.
- `/stary.farakurim.cz/` on the server is the backup of the old PHP site: never deploy there or delete it.
- Never delete `/uploads/`, `/nahrane/`, `/virtualni_prohlidka/` or `/cache/` on the server: they live only there.
- The SSH target, web root, rsync flags, server-only folders and verify checks live only in `scripts/deploy.sh`
  (used by `pnpm release` and the deploy workflow): change them there.

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
