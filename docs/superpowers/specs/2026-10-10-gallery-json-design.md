# Fotogalerie as JSON data

Date: 2026-10-10

## Goal

The Fotogalerie albums are TypeScript source today: `src/content/gallery.ts` holds `GALLERY_URL`, an `album(n)` helper
building the Zonerama `href`, and the `albums` array (5 albums, up to 15 photos each). `scripts/zonerama-album.py
--write` edits that source as text: it splits the array into `  {` … `  },` blocks, reads `id:` and `date:` with
regexes, inserts the new block, keeps the 6 newest and runs Prettier. Nothing validates the albums on load, and the
script has no tests.

The albums become JSON data in one file, checked by a zod schema on load and by the script before it writes. The
script is rewritten in TypeScript (`scripts/add-album.ts`), like the other content scripts, and keeps at most
`MAX_ALBUMS` albums, removing the oldest when an album is added (as `addOhlasky()` removes the outdated sheets and the
covered `laterExceptions`). This follows the ohlášky and Aktuality changes (`2026-10-09-ohlasky-json-design.md`,
`2026-10-09-news-json-design.md`).

Success means:

- the site renders exactly what it renders today (same data, same order, same `Album` type);
- `pnpm add-album <album-url>` prints the same proposal as `zonerama-album.py`, and with `--write` adds the album to
  `gallery.json`, removing the albums beyond `MAX_ALBUMS`;
- invalid data fails `pnpm test`, `pnpm build` and the script with a zod message naming the field.

Out of scope: the Petrklíč data; the group pages' photos (`PhotoSet` in `groups.ts`); changing the `Album` type;
choosing photos differently from today.

## Data

- `src/content/gallery.json`: `{ "albums": Album[] }`, newest first. Each album is written as `albumSchema` outputs
  it, so its fields keep the schema's order.
- `href` is the full album URL (`https://www.zonerama.com/FarnostKurim/Album/16583642`); the `album()` helper is
  removed. Photos stay `{ "small", "large" }` Zonerama URLs.

## Rules

`src/lib/gallery/albums.ts` gains `MAX_ALBUMS = 6`: the albums the site keeps (the Fotogalerie shows them all, the
homepage the 4 newest; older ones stay on Zonerama). `src/app/fotogalerie/page.tsx` imports it instead of its own
`ALBUMS_SHOWN = 6`.

`src/lib/gallery/schema.ts` (new) holds the rules, used by the loader and the script:

- `albumSchema` (`z.strictObject`): `id` ASCII kebab-case; `title` non-empty trimmed text; `date` `z.iso.date()`;
  `href` matching `^https://(www|eu)\.zonerama\.com/FarnostKurim/Album/\d+$`; `photoCount` a positive integer;
  `photos` optional, an array of `{ small, large }`, each an `https://eu.zonerama.com/photos/…` URL; a `superRefine`
  refuses more photos than `photoCount`.
- `galleryFileSchema`: `{ albums: albumSchema[] }` with a `superRefine` refusing duplicate ids, the same Zonerama
  album twice (compared by its number, `albumNumber(href)`, so `eu.` and `www.` match) and albums out of
  newest-first order (equal dates allowed).

The schema does not limit the number of albums: a file over `MAX_ALBUMS` still loads, the content test fails on it,
and the next `pnpm add-album` removes the extra ones.

## Loading

`src/content/gallery.ts` stays the module the importers use (`src/app/page.tsx`, `src/app/fotogalerie/page.tsx`,
`src/components/gallery/ZoneramaPanel.tsx` do not change). It imports `./gallery.json` statically (as
`src/server/ohlasky.ts` imports `ohlasky.json`), parses it with `galleryFileSchema` and throws
`src/content/gallery.json is not valid:\n<z.prettifyError(...)>` on failure. It exports `albums: Album[]` and
`GALLERY_URL` (a setting, not an album, so it stays in TypeScript). Not `server-only`: the albums have no private
fields.

## Script

`scripts/add-album.ts` replaces `scripts/zonerama-album.py`; `package.json` gains
`"add-album": "tsx scripts/add-album.ts"`.

Command line, as today:

```sh
pnpm add-album <album-url> [--write [--title "<title>"] [--date YYYY-MM-DD] [--id <kebab-id>]]
```

- A URL other than `https://(eu|www).zonerama.com/FarnostKurim/Album/<n>` stops the script (profile or tab given).
- Without `--write` it prints the proposal as JSON: `id`, `title`, `date`, `ratio`, `total`, `inRatio`, `photos`.
- With `--write`, a missing date (no `YYYY_MM_DD` prefix and no `--date`) or an id that is not kebab-case stops it;
  otherwise it adds the album and prints `albumLines()`.

Pure functions (exported, tested without the network), ported from the Python script:

- `titleAndDate(page)`: the `<title>` before ` | Zonerama`, HTML-unescaped; a `YYYY_MM_DD ` prefix becomes the date,
  the rest the title with its first letter upper-cased; no prefix gives `date: ""`.
- `photoItems(page)`: the JSON object after `var result = `, found by brace counting, its `items` with a `photoId`
  and an `image`, videos (`data-type="video"` in `html`) skipped.
- `selectPhotos(items)`: the most common landscape aspect ratio (width / height rounded to 2 dp; all photos when
  none is landscape), the photos of that ratio sorted with the most common exact size first. Returns
  `{ ratio, group }`.
- `photoUrl(item, width)`: `image` with `{width}` and `{height}` (height scaled and rounded) filled in; the album
  takes the first `MAX_PHOTOS = 15` photos at 800 and 1600 px wide.
- `slug(title)`: NFKD, ASCII only, lower case, runs of other characters to `-`, trimmed.

`addAlbum(galleryFile, input, { check })`:

1. Parses `input` with `albumSchema`; a failure throws with zod's message.
2. Reads the file and parses it with `galleryFileSchema`; a broken file throws naming the file and field.
3. Refuses an `id` already in the file (`pass another one with --id`) and an `href` already in it.
4. Inserts the album before the first album dated on or before it (newest first) and keeps the first `MAX_ALBUMS`.
   When the new album is not among them it throws
   `the album <id> (<date>) is older than the <MAX_ALBUMS> albums kept: nothing to add`, before writing anything.
5. Unless `check`, writes `JSON.stringify({ albums }, null, 2)` and a newline.

It returns `{ album, position, removed, written }` (`position` 1-based, `removed` the `{ id, date }` of the albums
dropped, `written` the file or nothing under `check`). The CLI then runs `formatAndTest(written,
"src/content/gallery.test.ts")`. `albumLines(result, check)` returns:

- `Added <id> (<n> photos) at position <k> in src/content/gallery.json` (`Would add` under `check`);
- `Removed the old album <id> (<date>)` for each removed album (`Would remove` under `check`).

`scripts/content-files.ts` gains `GALLERY_FILE`. `scripts/zonerama-album.py` is deleted.

## Migration

A one-off script (run once, not committed) writes `gallery.json` from today's `albums`, each album parsed by
`albumSchema`. Before the array is removed from `gallery.ts`, a check confirms that the loaded `albums` deep-equal the
old export, order included.

## Tests

- `src/content/gallery.test.ts`: every album matches `albumSchema` (`it.each`, so a failure names it); the file
  matches `galleryFileSchema`; at most `MAX_ALBUMS` albums.
- `src/lib/gallery/schema.test.ts` (new): a valid album passes; a non-kebab id, an invalid date, a non-Zonerama
  `href` or photo URL, an unknown field, more photos than `photoCount`, duplicate ids or `href`s and albums out of
  order are refused.
- `scripts/add-album.test.ts` (new), on a small album page built in the test with Zonerama's markup (a title with a
  date prefix, 3:2 and 4:3 landscape photos, a portrait, a video, a banner):
  - `titleAndDate` with and without the prefix; `photoItems` skips the video; `selectPhotos` picks the common ratio
    and puts the common size first; `photoUrl` fills the size; `slug` of a Czech title;
  - `addAlbum` on a temp copy of `gallery.json`: inserts in date order; a 7th album removes the oldest and reports
    it; an album inserted into the middle of a full list removes the oldest; an album older than all kept ones is
    refused and nothing is written; a taken `id` or `href` is refused; `check` writes nothing but reports the
    removals; a broken file throws naming it;
  - `albumLines` with and without `check`.

## Docs

- `.claude/skills/farnost-create-galerie/SKILL.md`: `pnpm add-album` instead of `python3 scripts/zonerama-album.py`;
  the target is `src/content/gallery.json`; the script keeps `MAX_ALBUMS` albums and says which it removed.
- `README.md`: the command row (`pnpm add-album`), the skill row (`gallery.json`), and Python 3 only for
  `pnpm preview` and `pnpm mockups`.
- `.claude/rules/content-and-time.md`: the Fotogalerie bullet names `content/gallery.json`, the schema and
  `MAX_ALBUMS`.
- Header comments of `src/content/gallery.ts`, `src/lib/gallery/schema.ts`, `scripts/add-album.ts` and
  `scripts/content-files.ts`.
- Not changed: `design/DESIGN.md`, and older specs and plans (historical records).

## Verification

The full check (`pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`). The output must not
change, so instead of the visual mockup comparison the whole `out/` tree is diffed against a build from before the
change (the albums feed the homepage and the Fotogalerie); only the build timestamp may differ. `pnpm add-album` is
run once without `--write` against a real album URL to confirm it prints the same proposal as `zonerama-album.py`.
