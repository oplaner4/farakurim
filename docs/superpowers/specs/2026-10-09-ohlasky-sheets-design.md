# Several ohlášky sheets, published in advance

Date: 2026-10-09

## Goal

The parish office can publish next week's pořad bohoslužeb (ohlášky) on any day, and the site keeps showing the
current week until the next one starts. Today `src/content/ohlasky.ts` holds one `serviceSheet`, so publishing the
next week early drops the rest of the current week: its days fall back to the regular schedule (a cancelled or moved
mass disappears from the countdown) and the homepage, the header and `/porad_bohosluzeb/` show next week too soon.

Success means:

- a sheet released before its week changes nothing visible until its `validFrom`, then takes over in the browser
  without a rebuild;
- every day of every kept sheet drives the countdown and the calendar fallback, the newer sheet winning a shared day;
- the agent adds a sheet with one command from a JSON record, the script removes outdated sheets, and nothing in the
  content tests depends on today's date.

## Data

### Files

- `src/content/ohlasky/<validFrom>.ts`, one per sheet, **generated** by the script: `import "server-only"`, the
  `ServiceSheet` type import and one exported constant (`sheet20261004`) with plain data. Mass rows are written out
  with `mass: true`; `massRow()` and the phrase constants (`FOR_PARISHIONERS`) leave the content. `massRow()` is
  removed from `src/lib/services/service-sheet.ts` (and its tests) once nothing uses it.
- `src/content/ohlasky/index.ts`: `import "server-only"`, the sheet imports, `serviceSheets` (sorted by `validFrom`)
  and the hand-edited `laterExceptions`. The script maintains the import lines and the array, as `addYear()` does
  for `news/index.ts`. Imports from `@/content/ohlasky` keep their path; `serviceSheet` becomes `serviceSheets`.
- The `ServiceSheet`, `SheetDay`, `SheetRow` and `Announcement` types stay as they are.

### How sheets relate

- Sorted by `validFrom`, each sheet starts **on or after the previous sheet's `validTo`**: consecutive weeks share
  at most their boundary day (the Sunday that ends one PDF and starts the next). The data stays as the PDF prints it
  ("od 4. 10. do 11. 10."); nobody trims a day.
- On a shared day the **newer sheet wins**, both for its services and as the shown sheet. The older sheet's Sunday
  remains the fallback when the next PDF comes late.
- A gap between sheets is allowed: its days follow the regular schedule, as after a week today.
- A record with the same `validFrom` as an existing sheet **replaces** it (a corrected PDF, staged with `--rev 2`).
  Any other overlap is refused.

### `laterExceptions`

Unchanged in purpose and still hand-edited (now in `index.ts`). Their rule becomes "after the **last** sheet's
`validTo`". When a new sheet covers an entry, the script names it and the agent removes it; the content test fails
until then, as today.

## Adding a sheet

`pnpm stage porad "<pdf>" --record <scratchpad>/record.json` (`scripts/stage-upload.ts`, mirroring `pnpm stage
aktualita … --record`). `--check` keeps working without `--record` and prints the week; with `--record` it validates
everything and writes nothing.

`record.json` holds `days` and `announcements` in the existing `SheetDay` / `Announcement` shape. `pdfUrl`,
`validFrom` and `validTo` are not in it: the script takes them from the staged PDF (`parseWeek()`, or `--from` /
`--to`).

Steps, in order:

1. **Validate before anything is staged.** A new zod `serviceSheetSchema` in `src/lib/services/schema.ts` (like
   `src/lib/news/schema.ts`) checks the shape: ISO dates, `H:MM` times, known fields only, a category from
   `AnnouncementCategory`, `place` a parish church id or free text. The script then checks what spans records:
   every date from `validFrom` to `validTo` appears exactly once and in order, rows are in time order, each `newsId`
   is an existing aktualita, and the sheet fits among the existing sheets (the rules above). The error names each
   problem.
2. **Stage the PDF** to `uploads/porady_bohosluzeb/` (unchanged, including the "already on the server" refusal).
3. **Write the sheet file** and update `index.ts` (or replace the file of the same `validFrom`).
4. **Prune**: keep the current sheet (the last with `validFrom ≤ today` in Prague) and every later one; delete the
   older files and their index entries. The current sheet is kept even when its week is over, so the site never
   loses its ohlášky.
5. **Format** the written files with Prettier and **run the ohlášky tests**; print the `laterExceptions` entries the
   new sheet covers, if any.

The generator and the index editing live in a new `scripts/add-ohlasky.ts` (as `scripts/add-aktualita.ts` does for
news), called by `stagePorad()`.

## The site

### Choosing the current sheet

- `currentSheet(sheets, today)` in `src/lib/services/service-sheet.ts`: the last sheet with `validFrom ≤ today`, or
  the first sheet when all are in the future. Pure and unit-tested.
- `CurrentSheet` (`src/components/services/CurrentSheet.tsx`, `"use client"`): props `items: { validFrom; node }[]`
  and `renderedAt`. It calls `useToday(renderedAt)` and renders the chosen item's node only. The prerender and
  hydration use the build day (no mismatch); after load the visitor's date decides. Without JS the build day decides,
  as for the countdown.

### Where

- **`/porad_bohosluzeb/`**: per sheet, the page renders `OhlaskyPanel` and `WeekSchedule` as today
  (`publicDays(markChanges(…))` on the server, so non-public details never reach the client) and wraps them in
  `CurrentSheet`.
- **`SiteHeader`**: the "Ohlášky" PDF button is rendered per sheet inside `CurrentSheet` (`renderedAt={BUILD_TIME}`).
- **`NextMass`** (already a client component): the `sheet` prop becomes `sheets` (`pdfUrl`, `validFrom`, `validTo`
  of each); it picks with `currentSheet()` and `useToday()` for the dates and the PDF link.

### Countdown and calendar

`scheduleExceptions(sheets, later, places)` takes every sheet: each sheet's days (`sheetExceptions()`), a newer
sheet's day replacing the same date of an older one, then the `later` entries after the last sheet's `validTo`.
`currentExceptions` in `src/server/services.ts` keeps its name and its callers (homepage countdown, calendar
fallback).

The pages carry the other sheets' nodes in their payload (usually one extra week); the design does not change.

## Skill and docs

- `farnost-create-porad-bohosluzeb`: step 2 describes `record.json`; steps 4 and 5 become the one command; the
  "rewrite `serviceSheet`" and module-shape instructions go; it says a sheet can be published any day before its
  week, that the script removes old sheets, and that the agent removes the `laterExceptions` entries it names.
- `.claude/rules/content-and-time.md`: the ohlášky paragraph (several sheets, the shared Sunday, the current sheet
  chosen in the browser, pruning).
- `README.md` (the skills table: "into `ohlasky/`") and the usage header of `scripts/stage-upload.ts`.
- `design/DESIGN.md` is not edited.

## Testing

- **Lib** (`service-sheet.test.ts`): `currentSheet()` (before, inside, on the shared Sunday, in a gap, after the
  last); `scheduleExceptions()` with several sheets (shared Sunday, gap, `laterExceptions` after the last sheet).
- **Schema**: a valid record passes; each broken field is named.
- **Script** (`add-ohlasky.test.ts`, `stage-upload.test.ts`): the generated source, the index update, pruning (keeps
  the current sheet even when stale, drops older ones), replacing the same `validFrom`, a refused overlap, a missing
  or duplicate day, nothing staged when validation fails, and the covered `laterExceptions` reported.
- **Content** (`ohlasky.test.ts`): every sheet passes the schema and the relation rules; `laterExceptions` after the
  last sheet. No dependence on today's date (the daily refresh build rebuilds old tags on later days).
- **Migration**: the current sheet is regenerated through the generator into `ohlasky/2026-10-04.ts`; the built
  pages are unchanged.
- **Verification**: the full check; the browser check at 390, 834 and 1440 px in both themes; a switch check with a
  temporary second sheet and Playwright's clock set into its week (header button, `NextMass` and
  `/porad_bohosluzeb/` show it after load, the build's sheet before), the temporary sheet removed afterwards.
