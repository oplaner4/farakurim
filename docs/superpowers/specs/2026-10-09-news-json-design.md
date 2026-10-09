# Aktuality as JSON data

Date: 2026-10-09

## Goal

The Aktuality (`src/content/news/`) are TypeScript source today: one file per migrated year (`2019.ts` … `2025.ts`),
one file per month from 2026 (`2026/01.ts` … `2026/12.ts`), an `index.ts` per year folder and a `news/index.ts`
joining the years. `scripts/add-aktualita.ts` edits that source as text: `insertRecord()` walks the `  {` … `  },`
blocks and reads `start:` with a regex, `yearFiles()` and `addYear()` generate and patch the index files, and it adds
the `UPLOADS` import when a record needs it. `newsIds()` (`scripts/content-files.ts`) finds the IDs with a regex over
the sources, and `add-ohlasky.ts` relies on it. A record that starts in a migrated year is refused ("add the record
by hand").

The Aktuality become JSON data, one file per month. Scripts parse, change and write it; nothing edits TypeScript
text. This follows the ohlášky change (`2026-10-09-ohlasky-json-design.md`).

Success means:

- the site renders exactly what it renders today (same data, same order, same `NewsEvent` type);
- `pnpm stage aktualita … --record <json>` and `pnpm add-aktualita` write the JSON month file, for any year;
- invalid data fails `pnpm test`, `pnpm build` and the scripts with a zod message naming the file and the field.

Out of scope: the gallery and Petrklíč data; a JSON Schema for editors; changing the `NewsEvent` type (`body` stays
one HTML string).

## Data

- `src/content/news/<year>/<MM>.json`, one file per month that has records, for every year from 2019. Each file is
  a plain `NewsEvent[]` in start-date order, holding only records that start in that month. A month without records
  has no file.
- Upload paths are literal root-relative strings (`/uploads/aktuality/x.webp`); `body` concatenations
  (`"<p>…</p>" + "<p>…</p>"`) become one string.
- Records are written as `newsEventSchema` outputs them, so their fields are in the schema's order and a rewritten
  file keeps its shape.
- Removed: every `.ts` data file (`2019.ts` … `2025.ts`, `2026/*.ts` with `2026/index.ts`) and `news/uploads.ts`
  (`UPLOADS`).

## Loading

`src/content/news/index.ts` becomes the loader (not `server-only`: news has no private fields, and
`scripts/aktualita-calendar.ts` imports `@/content/news` under tsx):

- `readEvents(dir: string): NewsEvent[]` lists the `<year>/<MM>.json` files under `dir`, newest year first and the
  months of a year in month order (today's `events` order), reads each with `fs` and parses it with
  `z.array(newsEventSchema)`. On failure it throws
  `src/content/news/2026/10.json is not valid:\n<z.prettifyError(...)>`, the path relative to the repo root.
- `events: NewsEvent[] = readEvents(join(process.cwd(), "src/content/news"))`. The 13 importers of `events` do not
  change.
- The folder is read at run time instead of imported, so a new month or year needs no code. Two things to confirm
  in the plan: `pnpm build` (Turbopack) gives no warning or trace problem for the dynamic read, and in `pnpm dev` an
  edited JSON file shows after a page refresh. If the build warns, the plan resolves it before going on (e.g. a
  `turbopackIgnore` comment, or a path Turbopack accepts).

## Script

`addAktualita(newsDir, input, { check, now })` in `scripts/add-aktualita.ts`:

1. Validates the record as today: `published` defaults to today in Prague, then `newsEventSchema`; a failure stops
   the script with zod's message.
2. Reads the existing records with `readEvents(newsDir)`: a broken file stops the script naming the file and field.
   An `id` already taken is refused.
3. The target is `<year>/<MM>.json` of the record's start. It reads that file (an empty list when it does not exist)
   and inserts the record after the last record that starts on or before it.
4. Unless `check`, it creates the year folder when needed and writes `JSON.stringify(list, null, 2)`;
   `formatAndTest()` runs Prettier on the file and the news tests, as today.

It returns `{ record, target, created, written }`. `targetLine()` prints
`Added the record to src/content/news/2026/10.json` (` (new file)` when `created`; `Would add …` under `--check`).
The migrated-year refusal is removed. The command lines of `pnpm add-aktualita` and `pnpm stage aktualita` are
unchanged.

Removed:

- `scripts/add-aktualita.ts`: `recordSource()`, `insertRecord()`, `yearFiles()`,
  `addYear()`, `MONTHS`, `UPLOADS_IMPORT`;
- `scripts/content-files.ts`: `toSource()`, `entries()`, `existingIds()`, `tsFiles()`, `UPLOADS_PATH` (no other
  script uses them);
- `src/lib/news/schema.ts`: `NEWS_EVENT_FIELDS` and its test (nothing writes fields by hand in order any more).

Changed:

- `monthFile(start)` returns only the path `<year>/<MM>.json` (no export name).
- `newsIds(newsDir)` returns the IDs of `readEvents(newsDir)`; `add-ohlasky.ts` keeps calling it.
- `scripts/stage/aktualita.ts` without `--record` prints the `"poster"` and `"attachments"` entries as JSON, to paste
  into an existing record.

## Migration

A one-off script (run once, not committed) writes every month file from today's `events`, each record parsed by
`newsEventSchema`. Before the `.ts` files are removed, a check confirms that `readEvents()` deep-equals the old
`events` export, order included.

## Tests

- `src/content/news/news.test.ts`: every record matches the schema (`it.each` per record, so a failure names it);
  unique IDs and at most one pinned event; the `.htaccess` redirect checks unchanged; every month file holds only its
  month's records, in start-date order (now also for 2019–2025); `news/` holds nothing but `<year>/<MM>.json`,
  `index.ts` and the test.
- `scripts/add-aktualita.test.ts`, `scripts/stage/aktualita.test.ts`, `scripts/stage/cli.test.ts`,
  `scripts/content-files.test.ts`: the fixture copies the JSON news folder (`scripts/test-helpers.ts`). Cases: insert
  in start-date order, also in the middle of a month; create a new month file and a new year folder; add a record to
  a 2024 month; refuse a taken `id`; `check` writes nothing; a broken JSON file stops with its file name. The tests of
  the generated source (`recordSource`, `insertRecord`, `yearFiles`, `addYear`, `toSource`, `existingIds`, the
  `UPLOADS` import) are removed.

## Docs

- `.claude/skills/farnost-create-aktualita/SKILL.md`: the target is `src/content/news/<year>/<MM>.json`, no
  `UPLOADS`, any year; a correction to an existing record is an edit of its JSON file; the pasted `poster` and
  `attachments` entries are JSON.
- `README.md` (the `pnpm add-aktualita` row and the layout), `.claude/rules/content-and-time.md`, and the header
  comments of `src/lib/news/schema.ts`, `scripts/add-aktualita.ts` and `scripts/content-files.ts` describe the JSON
  month files and `readEvents()`.
- Not changed: `design/DESIGN.md`, and older specs and plans (historical records).

## Verification

The full check (`pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`). The output must
not change, so instead of the visual mockup comparison the whole `out/` tree is diffed against a build from before
the change (news feeds the homepage, Aktuality, the archive, detail pages, `.ics` files, the sitemap, Pořad
bohoslužeb and the Kronika); only the build timestamp may differ.
