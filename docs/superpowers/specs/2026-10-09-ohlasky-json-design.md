# Ohlášky as JSON data

Date: 2026-10-09

## Goal

The ohlášky (`src/content/ohlasky/`) are TypeScript source today: one generated `<validFrom>.ts` per sheet and an
`index.ts` that joins them and holds the hand-entered `laterExceptions`. `scripts/add-ohlasky.ts` edits that source
as text (regexes for the imports, the `serviceSheets` array and the `laterExceptions` dates), and the agent removes a
`laterExceptions` entry a new sheet covers by hand, because the script cannot safely cut it out of the source.

The ohlášky become one JSON data file. Scripts parse, change and write it; nothing edits TypeScript text.

Success means:

- the site renders exactly what it renders today (same data, same types);
- `pnpm stage porad <pdf> --record <json>` writes the JSON and removes the `laterExceptions` entries the sheets
  cover, so the `farnost-create-porad-bohosluzeb` skill has no manual cleanup step;
- invalid data fails `pnpm test` and `pnpm build` with a zod message naming the field;
- rows marked not public still never reach a client bundle.

Out of scope: the Aktuality (`src/content/news/`), a later step; a JSON Schema for editors (the zod errors are
enough: the scripts and the agent write the file).

## Data

- `src/content/ohlasky.json`: `{ "sheets": ServiceSheet[], "laterExceptions": ScheduleException[] }`, the sheets
  sorted by `validFrom`. The fields are the ones of today's types, unchanged. The folder `src/content/ohlasky/` (the
  sheet files and `index.ts`) is removed.
- `src/lib/services/schema.ts` gains `scheduleExceptionSchema` (`satisfies z.ZodType<ScheduleException>`, strict
  fields: an ISO `date`, an optional non-empty `reason`, and `services` of `{ time: H:MM, place, title?, note? }`
  where `place` is a `z.enum` of the three `PlaceId`s, the list typed `satisfies readonly PlaceId[]`, so the parsed
  data is typed `PlaceId` as the type requires) and `ohlaskyFileSchema`
  (`{ sheets: serviceSheetSchema[], laterExceptions: scheduleExceptionSchema[] }`, strict).

## Loading

- `src/server/ohlasky.ts` (new, `import "server-only"`): imports the JSON statically, parses it with
  `ohlaskyFileSchema.parse()` and exports `serviceSheets: ServiceSheet[]` and
  `laterExceptions: ScheduleException[]`. Parsing at import fails the build on invalid data and gives the exports
  their real types (a JSON import alone types `"kurim"` as `string`).
- `src/server/services.ts`, `src/app/page.tsx`, `src/app/porad_bohosluzeb/page.tsx` and
  `src/components/layout/SiteHeader.tsx` import from `@/server/ohlasky` instead of `@/content/ohlasky`. They run on
  the server only, so `public: false` rows stay out of the browser as today (`publicDays()` unchanged).
- `scheduleExceptions()`, `currentSheet()`, `publicDays()` and the components are unchanged.

## Script

`addOhlasky(ohlaskyFile, newsDir, input, week, { check, now })` in `scripts/add-ohlasky.ts`:

1. Validates the record as today: an object without `pdfUrl`, `validFrom`, `validTo`; `serviceSheetSchema` on the
   record plus the PDF's week; every `newsId` an existing aktualita.
2. Reads `ohlasky.json` and parses it with `ohlaskyFileSchema`; a broken file stops the script with zod's message.
3. Replaces the sheet of the same `validFrom` or inserts the new one, sorts by `validFrom` and drops the sheets
   before the current one (`currentSheet()` on today in Prague). As today it refuses a sheet before the current one
   and any `sheetOrderProblems()`.
4. Drops every `laterExceptions` entry whose date is on or before the last kept sheet's `validTo` (covered by a
   sheet or past).
5. Unless `check`, writes `JSON.stringify(data, null, 2)`; `formatAndTest()` runs Prettier on it and the ohlášky test.

It returns the sheet, whether it replaced one, the removed sheets (their periods), the removed `laterExceptions`
dates and the written file. `ohlaskyLines()` prints, with `Would …` under `--check`:

- `Added the sheet 2026-10-18 – 2026-10-25 to src/content/ohlasky.json` (or `Replaced the sheet … in …`);
- `Removed the outdated sheet 2026-10-04 – 2026-10-11`;
- `Removed the laterExceptions entry on 2026-10-25 (the sheet covers it)`.

Removed: `sheetName()`, `sheetSource()`, `setSheets()`, `readWeeks()`, the `covered` regex and their constants.
`toSource()` in `scripts/content-files.ts` stays (`add-aktualita.ts` uses it).

Wiring: `OHLASKY_DIR` becomes `OHLASKY_FILE` (`scripts/content-files.ts`), `StageEnv.ohlaskyDir` becomes
`ohlaskyFile` (`scripts/stage/core.ts`), and `scripts/stage/porad.ts` and `cli.ts` pass it on; `formatAndTest()`
runs `src/content/ohlasky.test.ts`. The command line of `pnpm stage porad` is unchanged.

## Migration

A one-off conversion (run once, not committed) writes the two current sheets and the empty `laterExceptions` to
`ohlasky.json`. Before the old files are removed, a check confirms the parsed JSON deep-equals the old
`serviceSheets` and `laterExceptions` exports.

## Tests

- `src/content/ohlasky.test.ts` (moved from `src/content/ohlasky/ohlasky.test.ts`), through `@/server/ohlasky` with
  `server-only` mocked: the file matches `ohlaskyFileSchema` (zod message on failure); at least one sheet and no
  `sheetOrderProblems()`; every `newsId` exists; `laterExceptions` after the last sheet, one per date, in order (the
  dates, times and places are the schema's).
- `src/lib/services/schema.test.ts`: `scheduleExceptionSchema` and `ohlaskyFileSchema` refuse a bad date, a bad
  time, a place that is not a parish church and an unknown field, and accept a valid file.
- `scripts/add-ohlasky.test.ts`, `scripts/stage/porad.test.ts`, `scripts/stage/cli.test.ts`: the fixture copies
  `ohlasky.json`. Cases: add and replace a sheet; drop the outdated sheet; remove a covered `laterExceptions` entry
  and keep a later one; `check` writes nothing; a broken `ohlasky.json` stops with zod's message. The tests of the
  generated source (`sheetSource`, `setSheets`, the one-line and expanded `laterExceptions`) are removed.

## Docs

- `.claude/skills/farnost-create-porad-bohosluzeb/SKILL.md`: step 4 says the script removes the covered
  `laterExceptions` entries (no manual step, no test rerun); "Later changes" adds entries to
  `src/content/ohlasky.json`; corrections: never edit a sheet in `ohlasky.json` by hand, rerun with a corrected
  record; step 5 commits `src/content/ohlasky.json`.
- `.claude/rules/content-and-time.md` (the Ohlášky bullet), `README.md`, and the comments in `src/content/masses.ts`
  and `src/lib/services/schema.ts` point to `ohlasky.json` and `src/server/ohlasky.ts`.
- Not changed: `design/DESIGN.md`, and the 2026-10-09 ohlášky-sheets spec and plan (historical records).

## Verification

The full check (`pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`). The output must
not change, so instead of the visual mockup comparison the built HTML of `/`, `/porad_bohosluzeb/` and a page with
the header is diffed against a build from before the change.
