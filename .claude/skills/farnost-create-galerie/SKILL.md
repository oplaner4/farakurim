---
name: farnost-create-galerie
description: Add a photo album to the Fotogalerie of the new farakurim.cz site from a Zonerama album URL under eu.zonerama.com/FarnostKurim - read the album, pick up to 15 photos of one shape, add an Album to src/content/gallery.json, then publish. Use whenever the user wants to add a gallery, album or photos from Zonerama.
---

# Create a gallery album

The photos stay on Zonerama: the site links Zonerama's image URLs, so nothing is downloaded or uploaded. An album is
one `Album` record (`src/content/types/gallery.ts`) in `src/content/gallery.json` (design/DESIGN.md §19.2). Finish with
**`farnost-publish-content`** (no files to stage).

## 1. Check the URL

It must be an album: `https://eu.zonerama.com/FarnostKurim/Album/<albumId>`. The profile or a tab
(`…/FarnostKurim/425053`) lists albums, not photos: ask for the album link.

## 2. Read the album

```sh
pnpm add-album "https://eu.zonerama.com/FarnostKurim/Album/<albumId>"
```

It prints JSON with the proposed `id` (ASCII kebab-case from the title), the title (sentence case, without
Zonerama's `YYYY_MM_DD` prefix), the date from that prefix, and the photo counts. It picks up to 15 photos of the
album's most common landscape aspect ratio, because the strips crop every photo to 4:3: one shape keeps the crops
consistent, and portraits would lose most of the picture. `total` / `inRatio` / `photos` say how many photos the
album has, how many fit and how many it takes.

If the title had no date prefix, `date` is empty: ask the user for the date of the event.

## 3. Confirm with the user

Show the title (fix the wording if Zonerama's is a working name, e.g. lower-case or abbreviated), the date, the id
and "N of M photos (ratio 1.5)". Ask before continuing if fewer than 6 photos fit: the user may prefer another album.

## 4. Add the record

```sh
pnpm add-album "<album URL>" --write --title "<title>" --date <YYYY-MM-DD> --id <id>
```

Pass the confirmed values (each only when it differs from the JSON). It adds the album to `src/content/gallery.json`,
newest first, with `photoCount` equal to the photos and the `{ small, large }` URLs (800 and 1600 px wide), checks it
with the album schema, removes the albums beyond `MAX_ALBUMS` (`src/lib/gallery/albums.ts`; the page shows them all,
the homepage 4; older ones stay on Zonerama) and prints each album it removed, then formats the file and runs the
gallery test. It refuses an id or album already in the file, and an album older than all the kept ones. Do not edit
the photo URLs by hand.

## 5. Publish

Follow **`farnost-publish-content`**.

## Common mistakes

- Using the profile or tab URL instead of the album URL (the script refuses it).
- Writing the record by hand instead of `--write`: `photoCount` must equal `photos.length` and the albums stay in
  date order (the homepage shows `albums[0]` as the newest).
- Downloading photos or hosting them on the server: the URLs point at Zonerama.
