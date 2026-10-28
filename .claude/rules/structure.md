---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
  - "scripts/**/*.ts"
---

# Where code goes

`src/` is split by **kind** first, then by the same **domain groups** everywhere:
`news`, `services` (Pořad bohoslužeb, masses), `contacts`, `calendar`, `petrklic`, `gallery`, `support` (Finanční
podpora and Starší projekty), `links` (Odkazy; content in `web-links.ts`, as `links` in `site.ts` are the site's own
routes), `chronicle` (Kronika farnosti), `activities` (Seznam aktivit, Výuka náboženství and the group pages; content in
`activities.ts`, `religious-education.ts` and `groups.ts`, types in `types/activities.ts`), `camp` (Tábor; content in
`camp.ts`), `nativity` (Betlémy; content in `nativity.ts`), `parish` (Pastorační
rada and Kněží – rodáci; content in `parish-council.ts` and `native-priests.ts`), `home`, `layout`
(header, footer and their parts) and `shared` (`ui` in components) for what several domains use.

| Folder                         | Holds                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| `src/components/<group>/`      | React components, one per block                                                       |
| `src/hooks/`                   | Every React hook, one `use-<name>.ts` each (`hooks.md`)                               |
| `src/lib/<group>/<topic>.ts`   | Pure logic with its `<topic>.test.ts` beside it; no React, no content imports         |
| `src/content/<domain>.ts`      | The content (hand-edited data only): the boundary an API could replace                |
| `src/server/<domain>.ts`       | Server-only build-time code that combines content with `lib`: fetches, derived values |
| `src/content/types/<group>.ts` | The content types of one domain; `shared.ts` holds `IsoDate`, `ClockTime`, `Weekday`  |
| `src/test/`                    | What several site tests share: fixtures, checks, fetch answers and the test setup     |

- **`src/lib`** files are named after their topic inside the group, not after the group: `lib/news/events.ts`,
  `lib/news/timing.ts`, `lib/news/archive.ts`, `lib/news/ics.ts`, `lib/services/masses.ts`,
  `lib/contacts/office-hours.ts`, `lib/layout/bible-quote.ts`.
- **`lib/shared/`** holds only what two or more domains use (`prague.ts`, `czech.ts`, `links.ts`, `slug.ts`, …),
  flat, without subfolders. A helper one domain uses lives in that domain's folder (`news/query-params.ts`,
  `layout/analytics.ts`), and moves to `shared/` when a second domain needs it. **Why:** `shared/` stays a short
  list of what really is shared, instead of a drawer for everything without an obvious home.
- `lib` may import `@/content/site` for URLs and
  `@/content/types/*` for types, never the content data itself (tests may, to check real records).
- When a `lib` file grows two independent topics, split it by topic (as `news/events.ts`, `news/timing.ts`,
  `news/posters.ts` and `news/archive.ts`) rather than letting it pass ~300 lines.
- **`src/server`** files start with `import "server-only"` and are named after their domain: `server/calendar.ts`
  (`loadCalendarEntries()`, `linkablePages`), `server/services.ts` (`currentExceptions`), `server/bible-quote.ts`
  (`loadBibleQuote()`), `server/seasonal-nav.ts` (the seasonal menu item). They may import content and `lib`; pages and Server Components import them, client components
  and hooks never do. **Why:** `content` stays the data alone and `lib` stays free of it, so a value computed from
  content (or read at build time) has one home instead of being recomputed in every page.
- **Types:** import each type from its domain file (`import type { NewsEvent } from "@/content/types/news"`).
  There is no `types` index file (no barrel). A type used by two domains lives in the domain that owns the data
  (`ChurchColor` in `services.ts`, used by `contacts.ts`).
- **Imports:** same folder `./x`, anything else `@/…` (no `../`).
- **Tests** sit beside their module; what several of them share goes in `src/test/` (`fixtures.ts` with the
  `newsEvent()` and `event()` records and `at()`, `content-checks.ts` for the content tests, `fetch.ts` for stubbed
  answers) or, for the scripts, `scripts/lib/test-helpers.ts` (`freshTempDir()`, `useStageFixture()`, `emptyWeek()`).
  `vitest.config.mts` stands in for `server-only` and runs `src/hooks/` in jsdom with `cleanup()` after each test, so
  the tests need neither a mock nor an environment comment.

## Scripts

`scripts/` holds only the entry points: one `<command>.ts` per `pnpm` command (plus the shell, Python and `.mjs`
tooling), each a `runCommand()` call (`scripts/lib/command.ts`) with no logic of its own. The logic and its tests go
in `scripts/lib/`: by the same domain groups as `src/` (`lib/news/add-event.ts`), `lib/stage/` for `pnpm stage`,
and the helpers several scripts share at its top (`content-files.ts`, `command.ts`, `test-helpers.ts`). A module
exports `parseCommand` (wrong arguments throw, exit 2) and `execute` (a failure throws, exit 1). **Why:** what you
can run is what you see in `scripts/`, and the tests import the logic without starting a command.

- **The entry point documents the command:** its header says what `pnpm <command>` does, which skill uses it, the
  `Usage:` line and the options. A `scripts/lib/` module describes what it does, never which command or module calls
  it (no "for `pnpm stage`", no list of callers). **Why:** a list of callers goes stale when a new caller appears,
  as nothing in the module changed; the entry point is where someone running the command looks.
