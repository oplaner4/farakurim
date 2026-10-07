---
name: commit
description: Create a git commit in this repo with a commitlint-valid Conventional Commits message (type(scope): subject). Use whenever the user asks to commit, save work to git, or write a commit message.
---

# Commit with commitlint

Commits in this repo must pass `@commitlint/config-conventional` (`commitlint.config.mjs`).
The husky `commit-msg` hook (`.husky/commit-msg`) rejects anything else, so validate the message
**before** committing instead of discovering the failure from the hook.

## Steps

1. **Look at the change.** Run `git status` and `git diff` (plus `git diff --staged`). If the work mixes
   unrelated changes, propose separate commits rather than one catch-all.
2. **Verify it.** Unless the change is docs-only, run
   `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`.
   Do not commit failing code; report the failure instead.
3. **Stage explicitly.** Use `git add <paths>`, not `git add -A`/`.`. Never stage `out/`, `.next/`,
   `.design-preview/`, `node_modules/`, `.env*` or screenshots (`.gitignore` covers most of them; check anyway).
4. **Write the message** (format below) and **validate it**:
   ```sh
   printf '%s\n' "feat(mass): show countdown to the next mass" | pnpm exec commitlint
   ```
   For a multi-line message, validate the same text you will commit. Fix only the rules commitlint names.
5. **Commit** with a heredoc, so blank lines and the trailer survive:
   ```sh
   git commit -F - <<'EOF'
   feat(mass): show countdown to the next mass

   Countdown tiles hydrate after load; the prerendered values would be stale.

   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   EOF
   ```
   Use the attribution trailer from the current session's instructions when Claude wrote the change.
6. Run `git log --oneline -1` and report the commit hash and subject. Never push unless asked.
   If the hook still rejects the message, fix the message and commit again; never use `--no-verify`.

## Message format

```
<type>(<scope>): <subject>

<body: optional, explains why, wrapped at 100 chars>

<footer: optional, e.g. BREAKING CHANGE: …, Refs #12, Co-Authored-By: …>
```

- **Header ≤ 100 characters**, in English (repo convention: code and commits in English, UI in Czech).
- **type**, lower-case, one of:

  | type       | use for                                                     |
  | ---------- | ----------------------------------------------------------- |
  | `feat`     | new user-visible functionality                              |
  | `fix`      | bug fix                                                     |
  | `refactor` | code change with no behaviour change                        |
  | `style`    | formatting only (Prettier, class order), not visual changes |
  | `perf`     | performance                                                 |
  | `test`     | adding or fixing tests                                      |
  | `docs`     | CLAUDE.md, comments, design docs                            |
  | `build`    | dependencies, Next/Tailwind/PostCSS config, scripts         |
  | `ci`       | CI configuration                                            |
  | `chore`    | maintenance that fits nothing above                         |
  | `revert`   | reverting an earlier commit                                 |

- **scope** (optional, lower-case kebab): the area touched. Use the established ones:
  `header`, `carousel`, `mass`, `news`, `gallery`, `petrklic`, `contacts`, `footer` (homepage blocks),
  `content` (content data), `lib` (date/schedule logic), `theme` (Tailwind tokens), `fonts`, `icons`,
  `deps`, `config`, `skills`. Omit the scope when the change spans many areas.
- **subject**: imperative mood ("add", not "added"/"adds"), lower-case start, no trailing period.
  commitlint rejects sentence-case, Start-Case, PascalCase and UPPER-CASE subjects.
- **Breaking change**: add `!` after the type/scope (`feat(content)!: …`) and a `BREAKING CHANGE:` footer.
- Leave a blank line between header, body and footer (`body-leading-blank`, `footer-leading-blank`).

## Examples

- `feat(news): highlight events that are happening today`
- `fix(carousel): keep the active slide aligned after a resize`
- `refactor(lib): replace hand-written time-zone code with @date-fns/tz`
- `build(deps): use caret ranges for all dependencies`
- `docs: describe the design comparison workflow in CLAUDE.md`
