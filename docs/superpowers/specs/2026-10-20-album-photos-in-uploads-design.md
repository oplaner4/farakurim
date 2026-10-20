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
- `pnpm add-album <url> --photos <zip> --write` stages the chosen photos from the user's zip of the album's
  originals into `uploads/` as WebP, so `pnpm release` uploads them with the other staged files and `check-uploads`
  verifies them;
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

The photos come from the user's zip of the album's original photos, never from Zonerama: Zonerama answers scripted
requests for a photo with a 512 × 512 "Bot Detected" image and status 200 (found on 2026-10-20 during the migration),
so a download cannot be trusted. Every width is resized from the original with sharp (`autoOrient`,
`withoutEnlargement`). The WebP drops the EXIF data, GPS included.

A photo smaller than 1600 px still gets all four files, each at most its original size, never upscaled, so the schema
and `albumSrcSet` keep one fixed set of four widths. (My call.)

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

`pnpm add-album <album-url> --photos <zip>`: the album URL gives the album number (`href`) and, from its page, the
title and the date (Zonerama's `YYYY_MM_DD` prefix), as today. When the page cannot be read (Zonerama answers 500 at
times), the title and date come from the zip's name (`2026_09_27 pesi pout na Vranov.zip`, without diacritics), and
the user corrects them with `--title`/`--date` as today. `--photos` is required.

The photos are chosen from the zip by today's rule (`selectPhotos`): up to 15 photos of the most common landscape
aspect ratio, uncropped (the most common exact size) first, otherwise in file-name order (numeric: `dnm-9` before
`dnm-10`). The sizes are the originals' upright sizes (EXIF orientation applied). Only image files (`.jpg`, `.jpeg`,
`.png`, `.webp`) count; folders inside the zip are ignored (only the file name is used), two images with the same
name refuse the zip.

The proposal (no `--write`/`--check`) prints the same JSON as today: `total` counts the zip's photos.

`--write`, after the record passes `albumSchema` and `addAlbum`'s checks, and before `gallery.json` is written:

1. asks the server (`onServer`, `scripts/lib/uploads.ts`) whether `fotogalerie/<id>/foto-1-800.webp` exists; if it
   does, it refuses: "… is already on the server: pass another id with --id". The server never overwrites, so a name
   taken there can never be reused;
2. writes each chosen photo's four WebPs to `uploads/fotogalerie/<id>/`, replacing files left there by an earlier run
   that was not released (local staged files are not on the server yet);
3. writes `gallery.json` only after every photo is written, so a failure leaves `gallery.json` unchanged.

`--check` does step 1 and says how many photos it would stage, without writing.

The lines printed after `--write` add "Staged N photos in uploads/fotogalerie/<id>/". An album removed beyond
`MAX_ALBUMS` loses only its record: its files stay in `uploads/` and on the server (they live only there and are never
deleted), and old shared links to its photos keep working.

The zip is unpacked into a temporary folder, removed when the command ends.

## Migration (one-off)

Zonerama's photos cannot be fetched (see Files), so today's selection cannot be matched to the originals: the five
albums that stay are chosen again from the user's zips (`~/Downloads/<YYYY_MM_DD> <title>.zip`) by the same rule as
`pnpm add-album`, keeping each album's id, title, date and `href`. "Pouť Sedmiradostnou cestou na Vranov"
(`pout-vranov`) is removed from `gallery.json` (the user's decision; it has no zip). The camp covers are the photos the
user chose (`~/Downloads/<year>.jpg`, 2019–2025, some different from today's), each resized to 800 px wide as
`uploads/tabor/rocniky/<year>.webp`; `camp.ts` drops the `cover()` helper and points at the files.

The migration is a throwaway script run once from the scratchpad, not committed; its result is: `gallery.json` and
`camp.ts` are committed, the files are staged in `uploads/` (git-ignored) and go to the server with the next release.
It must check that no target name is already on the server, like `--write`.

## Docs and pages

- `.claude/skills/parish-create-album/SKILL.md`: ask the user for the album's zip of originals; `--photos <zip>` chooses the photos and `--write` stages them; publish uploads
  them; "Common mistakes" no longer says not to download, and warns against downloading from Zonerama (it serves a bot image); mention the `--id` refusal for a folder on the server.
- `.claude/skills/parish-publish-content/SKILL.md`: albums now have staged files.
- `README.md` § Content: "Album photos stay on Zonerama" becomes where they are staged; the `pnpm add-album` row
  says `--write` stages the photos.
- `src/content/camp.ts` header comment: covers are uploaded to `/uploads/tabor/rocniky/`; how to add next year's
  (the original from the parish, resized to 800 px wide WebP).
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
- How the zip is unpacked (`fflate` is already a dependency).
