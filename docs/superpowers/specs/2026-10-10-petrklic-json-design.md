# Petrklíč as JSON data

Date: 2026-10-10

## Goal

The Petrklíč issues are TypeScript source today: `src/content/petrklic.ts` lists 86 issues as
`issue("2026-1", 2026, 1, 36)` lines, three of them with `{ note: "…" }`. The id repeats the year and number, the
content test checks that they agree (`parsePetrklicId()`), and adding an issue is a hand step: `pnpm stage petrklic
<pdf> <id> [--note]` copies the PDF, renders the cover and pages, and prints an `issue(...)` line that the
farnost-create-petrklic skill pastes at the top of the list.

The issues become JSON data that the stage command writes itself, so nothing is pasted. A stored issue holds only
what cannot be computed: `year`, `number`, the optional `note` and `pageCount`. The id, the file URLs and the current
issue's viewer pages are computed. The issue and the file are checked by one zod schema in the loader and in the
script. This follows the Aktuality, ohlášky and Fotogalerie changes (`2026-10-09-news-json-design.md`,
`2026-10-09-ohlasky-json-design.md`, `2026-10-10-gallery-json-design.md`).

Success means:

- the site renders exactly what it renders today (same issues, same order, same `PetrklicIssue` type and ids);
- `pnpm stage petrklic <pdf> --year <y> --number <n> [--note "<note>"]` stages the files and adds the issue to
  `petrklic.json`, checked before anything is copied;
- invalid data fails `pnpm test`, `pnpm build` and the script with a zod message naming the field.

Out of scope: changing the `PetrklicIssue` type or the upload layout (`/uploads/petrklic/<id>/`); `petrklicTexts`
and `petrklicEditorial`, which stay in TypeScript (settings, not issues); `pnpm petrklic` (re-rendering by id) apart
from its header comment.

## Data

- `src/content/petrklic.json`: `{ "issues": PetrklicRecord[] }`, newest first.
- `PetrklicRecord` (`src/content/types/petrklic.ts`) = `Pick<PetrklicIssue, "year" | "number" | "note" |
"pageCount">`, written in that field order. `PetrklicFile = { issues: PetrklicRecord[] }`.
- Removed: the `issue()` helper and the `petrklicIssues` array literal.

## The id

`issueId({ year, number, note })` in `src/lib/petrklic/issues.ts`: `"<year>-<number>"`, plus `"-<slug(note)>"` when
there is a note (`2012-4-mimoradne` for "mimořádné", `2012-1-2-cast` for "2. část"). The id names the upload folder
and the PDF, so rewording a note changes them; notes are rarely edited, and the content test's `/uploads/` checks do
not see the server, so the skill says so.

`slug()` moves from `scripts/add-album.ts` to `src/lib/shared/slug.ts` (with its tests), used by `issueId()` and
`add-album.ts`. `parsePetrklicId()` is removed: nothing reads a year and number back out of an id any more.

## Rules

`src/lib/petrklic/schema.ts` (new), used by the loader and the script:

- `petrklicRecordSchema` (`z.strictObject`): `year` an integer from 2006 (the first volume, `FIRST_YEAR`); `number`
  a positive integer; `note` optional non-empty trimmed text; `pageCount` a positive integer.
- `petrklicFileSchema`: `{ issues: petrklicRecordSchema[] }` with a `superRefine` refusing two issues with the same
  `issueId()` and issues out of order: each issue's `(year, number)` must not be after the one before it (year
  descending, then number descending; equal pairs allowed, so the two parts of 1/2012 keep their order).

## Loading

`src/content/petrklic.ts` imports `./petrklic.json` statically, parses it with `petrklicFileSchema` and throws
`src/content/petrklic.json is not valid:\n<z.prettifyError(...)>` on failure. It builds `petrklicIssues:
PetrklicIssue[]` with `toIssue(record)` from `src/lib/petrklic/issues.ts`: the record plus `id`,
`pdfUrl: /uploads/petrklic/<id>/petrklic-<id>.pdf` and `cover: /uploads/petrklic/<id>/cover.webp`, and gives the
first issue `pageImages` (`/uploads/petrklic/<id>/pages/<n>.webp`), as today. `petrklicTexts` and
`petrklicEditorial` stay in the file. The importers do not change.

## Script

Command line (scripts/stage/cli.ts), replacing `petrklic <pdf> <id> [--note]`:

```sh
pnpm stage petrklic <pdf> --year <year> --number <number> [--note "<note>"] [--check]
```

`--year` and `--number` are required and must be integers (otherwise `wrong arguments` and the usage, as for the
other commands' bad options).

`scripts/add-petrklic.ts` (new, like `add-ohlasky.ts` for `stage porad`):

- `readPetrklic(file): PetrklicFile`: reads and parses the file; a broken file throws naming it.
- `addPetrklic(file, input, { check })`: parses `input` with `petrklicRecordSchema` (failure:
  `the issue is not valid:\n…`); reads the file; refuses an issue whose id is taken
  (`the issue <id> is already in petrklic.json`); inserts it before the first issue whose `(year, number)` is not
  after it (a new part of an existing issue goes before the older parts); checks the new list with
  `petrklicFileSchema`; unless `check`, writes `JSON.stringify({ issues }, null, 2)` and a newline. Returns
  `{ record, id, position, written }`.
- `petrklicLines(result, check)`: `Added <number>/<year>[ (<note>)] (<n> pages) at position <k> in
src/content/petrklic.json`, with ` (the current issue)` at position 1 and ` (not the current issue: newer issues
come first)` otherwise; `Would add` under `check`.

`stagePetrklic(env, { source, year, number, note, check })` (scripts/stage/petrklic.ts):

1. Finds the source PDF as today and counts its pages (`pdfPageCount`).
2. Calls `addPetrklic(env.petrklicFile, record, { check: true })`, so a wrong year or number, a taken id or a broken
   file stops it before anything is copied.
3. Stages the PDF as `uploads/petrklic/<id>/petrklic-<id>.pdf` and renders the cover and pages (skipped under
   `--check`, as today).
4. Unless `check`, calls `addPetrklic(env.petrklicFile, record)`; `runCommand` then runs `formatAndTest` on the file
   with `src/content/petrklic.test.ts`, as for `stage porad`.

It returns the staged line and `petrklicLines()`. `StageEnv` gains `petrklicFile` (default `PETRKLIC_FILE` in
`scripts/content-files.ts`; the stage fixture copies `petrklic.json`).

## Migration

A one-off script (run once, not committed) writes `petrklic.json` from today's `petrklicIssues`, each issue reduced
to `{ year, number, note?, pageCount }` and parsed by `petrklicRecordSchema`. Before the array is removed, a check
confirms that the loaded `petrklicIssues` deep-equal the old export, ids, URLs, order and `pageImages` included.

## Tests

- `src/lib/petrklic/schema.test.ts` (new): a valid issue passes, with and without a note; a year before 2006, a
  number or page count of 0 or not an integer, an empty note and an unknown field are refused; the file refuses a
  duplicate id (also two parts with the same note) and issues out of order, and accepts equal `(year, number)`
  pairs.
- `src/lib/petrklic/issues.test.ts`: `issueId()` with and without a note (the three real notes); `toIssue()`;
  the `parsePetrklicId()` tests are removed.
- `src/lib/shared/slug.test.ts` (new): the `slug()` cases moved from `scripts/add-album.test.ts`, plus "2. část".
- `src/content/petrklic.test.ts`: every issue matches `petrklicRecordSchema` (`it.each`, named by id); the file
  matches `petrklicFileSchema`; the `/uploads/` and page-image checks stay; the id and order checks go (the schema
  has them).
- `scripts/add-petrklic.test.ts` (new), on a temp `petrklic.json`: a new issue goes to position 1; an older one is
  inserted in order and reported as not current; a new part of an existing issue goes before the older parts; a
  taken id is refused; an invalid issue is refused; `check` writes nothing; a broken file throws naming it, also
  under `check`, leaving it unchanged; `petrklicLines` with and without `check`.
- `scripts/stage/petrklic.test.ts`: stages with `--year`/`--number`/`--note`, writes the issue under the fixture's
  `petrklic.json` and prints the lines; a taken id stops before any file is copied (`uploads/` stays empty).
- `scripts/stage/cli.test.ts`: the new usage line; `--year` without `--number`, a non-integer year, and the old
  positional id are `wrong arguments`.

## Docs

- `.claude/skills/farnost-create-petrklic/SKILL.md`: the command takes `--year`, `--number` and `--note`; the paste
  step goes; the script adds the issue to `src/content/petrklic.json` and says whether it is the current issue;
  a correction (wrong page count, note) is an edit of the JSON, and changing a note renames the issue's folder.
- `scripts/stage/cli.ts` usage and header comment; `scripts/stage/petrklic.ts` and `scripts/upload-images.ts` header
  comments (no `issue(...)` line, no "for src/content/petrklic.ts").
- `README.md` (the `pnpm stage` row if it names the id, the skill row) and `.claude/rules/content-and-time.md` (the
  Petrklíč bullet names `content/petrklic.json`, the schema and the computed id and URLs).
- Not changed: `design/DESIGN.md`, and older specs and plans.

## Verification

The full check (`pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`). The output must not
change, so the whole `out/` tree is diffed against a build from before the change (the issues feed the homepage card,
Petrklíč aktuální číslo and the archive); only build-time values (the Bible quote, the countdown, `.ics` stamps) may
differ. `pnpm stage petrklic` is run once with `--check` on a real issue PDF if one is at hand (otherwise on a
generated PDF) to confirm the printed lines.
