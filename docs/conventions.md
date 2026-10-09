# Conventions

The project conventions for people and agents. `README.md` links here and `CLAUDE.md` imports this file, so keep it
short.

- **Language:** UI copy (all visible text, alt texts, aria-labels) is **Czech**; code (identifiers, comments, file
  names) and commit messages are **English**.
- **Stack:** Next.js 16 (App Router), React 19, TypeScript and **pnpm only**. Styling with Tailwind CSS v4 and the
  design tokens in `src/styles/globals.css` only (no hex or arbitrary values); dates with date-fns v4 and
  `@date-fns/tz` (Prague time); the lightbox is yet-another-react-lightbox, loaded on first use and restyled in
  `src/styles/lightbox.css`. Prefer an established library over hand-written helpers. Dependencies use caret ranges
  (`^x.y.z`) so `pnpm update` picks up minor and patch releases.
- **Static export only:** `output: "export"` in `next.config.ts`, because the hosting (cesky-hosting.cz) runs PHP 8.4
  and no Node.js. Nothing that needs a Node server: route handlers reading the request, server actions,
  `cookies()`/`headers()`, rewrites/redirects/headers in the config, ISR, proxy/middleware or `next/image`
  optimisation (check `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`). The one server-side piece is
  `public/biblicky-citat.php` (README § "Slovo na dnešek").
- **Build time vs. now:** Server Components run at build time, so anything that depends on the current date is
  re-computed in the browser (`.claude/rules/content-and-time.md`).
- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat(news): …`), checked by
  commitlint in the husky `commit-msg` hook. Don't bypass the hook with `--no-verify`.
- **Checked before commit:** run the full check, then, for a code or design change (not for content alone), compare
  it with the mockups in `design/mockups/` in a browser at 390, 834 and 1440 px, in the light and dark theme
  (`pnpm mockups` next to `pnpm preview`; how: `.claude/rules/design-check.md`):

  ```sh
  pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build
  ```
