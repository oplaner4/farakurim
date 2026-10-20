# Album photos in /uploads/

Date: 2026-10-20

## Goal

The Fotogalerie albums (`src/content/gallery.json`) and the camp year covers (`src/content/camp.ts`) hot-link photos
from `eu.zonerama.com`. Visitors' browsers load them from Zonerama, so the site breaks or slows down when Zonerama
changes its photo URLs or is down, and Zonerama sees every visitor (the privacy page lists it for that reason).

The photos move to the site's own `/uploads/`, like the posters, the group photos and the camp team photos: once
this is done, the site loads nothing from Zonerama. The album links stay ("Otevřít album", "Album na Zonerama", the
"Další alba" panel, the camp years' album links, the two 2020 events' links): they are plain links and load nothing.

Success means:

- the site renders what it renders today: the same albums, the same photos in the same order, the same sizes in the
  same `srcset` widths, the same camp covers, now from `/uploads/…`;
- `pnpm add-album <url> --write` downloads the chosen photos into `uploads/` as WebP, so `pnpm release` uploads them
  with the other staged files and its `check-uploads` verifies them (it reads the first `srcset` entry, `-400`, and
  the `-800` and `-1600` paths; the `-1200` file is not checked separately, as it is always written and uploaded with
  the other three: `scripts/deploy.sh` stays as it is, my call);
- no page of `out/` references `eu.zonerama.com/photos/`.

Non-goals: choosing photos differently, more or fewer photos per album, changing `MAX_ALBUMS`, a lightbox or layout
change, a skill or script for camp covers (they change once a year), deleting files from the server.

Anti-goals: a release that links a photo the server lacks; a staged file that overwrites one already on the server;
an album that mixes Zonerama and uploaded photos.

## Files

Each album photo is stored in the four widths the site asks Zonerama for today (`SRCSET_WIDTHS` in
`src/lib/gallery/albums.ts`: 400, 800, 1200, 1600 px), at the photo's aspect ratio:

```
uploads/fotogalerie/<album-id>/foto-<n>-400.webp
uploads/fotogalerie/<album-id>/foto-<n>-800.webp    ← small (strips, "Další alba", lightbox thumbnails)
uploads/fotogalerie/<album-id>/foto-<n>-1200.webp
uploads/fotogalerie/<album-id>/foto-<n>-1600.webp   ← large (homepage carousel, lightbox)
```

`<n>` is the photo's 1-based position in the album's `photos`. The folder name is the album's `id`, so it is
unique on the site; it is Czech because it is a public URL (`fotogalerie` matches the page).

Camp covers: `uploads/tabor/rocniky/<year>.webp`, 800 px wide (the width they load at today, no `srcset`, as now).

The photos are downloaded from Zonerama at 1600 px (`photoUrl(item, 1600)`), and every width is resized from that
one download with sharp (`autoOrient`, `withoutEnlargement`). The WebP drops the EXIF data, GPS included.

A photo smaller than 1600 px still gets all four files, each at most its original size, never upscaled: Zonerama
does the same today (the `adoracni-den-2026` photo is 512 × 512 px, and Zonerama serves it at 512 px under every
size in its URL), so the page renders it as it does now, and the schema and `albumSrcSet` keep one fixed set of four
widths. (My call.)

## Data and rules

`AlbumPhoto` stays `{ small, large }`. The values become root-relative upload paths:
`{ "small": "/uploads/fotogalerie/den-mensin-2026/foto-1-800.webp", "large": "…/foto-1-1600.webp" }`.

`src/lib/gallery/schema.ts`: `photoUrl` accepts only `/uploads/fotogalerie/<id>/foto-<n>-<width>.webp`. A
`superRefine` on the album checks that every photo lies in the album's own `id` folder, that `small` is width 800 and
`large` 1600 of the same `<n>`, and that `<n>` is the photo's position (1, 2, 3 …). A Zonerama photo URL fails the
schema, so a mixed album cannot load.

`src/lib/gallery/albums.ts`: `zoneramaSrcSet` becomes `albumSrcSet(large)`: for an album photo path it returns the
four widths (`…/foto-3-400.webp 400w, …-800.webp 800w, …`), for any other URL `undefined` (the group pages' photos,
as today). The `ZONERAMA_PHOTO` regex and Zonerama-specific comments go. `AlbumPhotoTile` calls the new name.

`src/content/types/gallery.ts` and `types/camp.ts`: the comments say "uploaded photo" instead of Zonerama sizes.
`camp.test.ts` checks covers are `/uploads/tabor/rocniky/<year>.webp` instead of Zonerama URLs.

## `pnpm add-album`

The proposal (no option) is unchanged and downloads nothing.

`--write`, after the record passes `albumSchema` and `addAlbum`'s checks, and before `gallery.json` is written:

1. asks the server (`onServer`, `scripts/lib/uploads.ts`) whether `fotogalerie/<id>/foto-1-800.webp` exists; if it
   does, it refuses: "the folder fotogalerie/<id>/ is already on the server: pass another id with --id". The server
   never overwrites, so a name taken there can never be reused;
2. downloads each chosen photo and writes its four WebPs to `uploads/fotogalerie/<id>/`, replacing files left there
   by an earlier run that was not released (local staged files are not on the server yet);
3. writes `gallery.json` only after every photo is written, so a failed download leaves `gallery.json` unchanged.

`--check` does step 1 and prints the files it would write (`Would stage uploads/fotogalerie/<id>/foto-1-*.webp …`
or a count), without downloading.

The lines printed after `--write` add "Staged N photos in uploads/fotogalerie/<id>/". An album removed beyond
`MAX_ALBUMS` loses only its record: its files stay in `uploads/` and on the server (they live only there and are never
deleted), and old shared links to its photos keep working.

The download and the resize go in `scripts/lib/gallery/` (or `scripts/lib/images.ts` if the resize is general
enough); the tests stub `fetch` for both the Zonerama page, the photos and the server HEAD, and write into the temp
uploads folder of `scripts/lib/test-helpers.ts`.

## Migration (one-off)

All six albums in `gallery.json` and the seven camp covers (2019–2025; 2026 has no album yet) move now, keeping
today's photos and order. The photos are not downloaded from Zonerama: the user gives a zip archive of each album's
original photos, asked for when the migration step is reached (the camp albums' archives too, unless the user says
otherwise then).

- Each zip is unpacked into its own new scratchpad folder (untrusted data). Each stored photo is matched to its
  original: Zonerama's album page gives every photo's id, original `width` × `height` and position, which narrow it
  down; what they leave ambiguous is settled by looking at the candidates next to the photo on the live site, and
  anything still unsure is asked. A stored photo without an original in the zip is reported, not guessed.
- Each matched original is resized to the four widths at `foto-<n>-*`, `<n>` its current position (`autoOrient`,
  `withoutEnlargement`); `gallery.json` is rewritten with the new paths.
- Each camp cover's original is resized to 800 px wide and saved as `uploads/tabor/rocniky/<year>.webp`, cropped as
  the Zonerama cover is today if it differs; `camp.ts` drops the `cover()` helper and points at the files.

The migration is a throwaway script run once from the scratchpad, not committed; its result is: `gallery.json` and
`camp.ts` are committed, the files are staged in `uploads/` (git-ignored) and go to the server with the next release.
It must check that no target name is already on the server, like `--write`.

New albums after the migration still come through `pnpm add-album --write`, which downloads from Zonerama.

## Docs and pages

- `.claude/skills/parish-create-album/SKILL.md`: the photos are downloaded and staged by `--write`; publish uploads
  them; "Common mistakes" no longer says not to download; mention the `--id` refusal for a folder on the server.
- `.claude/skills/parish-publish-content/SKILL.md`: albums now have staged files.
- `README.md` § Content: "Album photos stay on Zonerama" becomes where they are staged; the `pnpm add-album` row
  says `--write` stages the photos.
- `src/content/camp.ts` header comment: covers are uploaded to `/uploads/tabor/rocniky/`; how to add next year's
  (download the cover from the year's album at 800 px as WebP).
- `src/app/ochrana-osobnich-udaju/page.tsx`: the Zonerama item goes from "Obsah z jiných služeb" (nothing loads from
  it any more).
- `design/DESIGN.md` stays as it is (it is the design handoff).

## Check

The full check and the browser check (`docs/conventions.md`): the homepage carousel, the Fotogalerie strips and
lightbox and the camp page at 390, 834 and 1440 px in both themes, comparing with the mockups and with today's live
site; in the network panel, no request goes to `eu.zonerama.com`. `pnpm preview` serves the staged files from
`uploads/`.

## Left to the builder

- The WebP quality (around 80, close to Zonerama's JPEGs at a smaller size), checked by eye on two or three photos.
- Whether the resize lives in `scripts/lib/images.ts` or the gallery module.
- Parallel or sequential downloads (15 photos; sequential is fine).
