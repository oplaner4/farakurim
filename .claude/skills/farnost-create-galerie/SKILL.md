---
name: farnost-create-galerie
description: Add a photo album to the Fotogalerie of the new farakurim.cz site from a Zonerama album URL under eu.zonerama.com/FarnostKurim - read the album, pick up to 15 photos of one shape, add an Album to src/content/gallery.ts, then publish. Use whenever the user wants to add a gallery, album or photos from Zonerama.
---

# Create a gallery album

The photos stay on Zonerama: the site links Zonerama's image URLs, so nothing is downloaded or uploaded. An album is
one `Album` record (`src/content/types.ts`) in `src/content/gallery.ts` (design/DESIGN.md §19.2). Finish with
**`farnost-publish-content`** (no files to stage).

## 1. Check the URL

It must be an album: `https://eu.zonerama.com/FarnostKurim/Album/<albumId>`. The profile or a tab
(`…/FarnostKurim/425053`) lists albums, not photos: ask for the album link.

## 2. Read the album

```sh
python3 scripts/zonerama-album.py "https://eu.zonerama.com/FarnostKurim/Album/<albumId>"
```

It prints JSON with the title (sentence case, without Zonerama's `YYYY_MM_DD` prefix), the date from that prefix,
and up to 15 photos as `{ small, large }` URLs (800 and 1600 px wide). The photos share the album's most common
landscape aspect ratio, because the strips crop every photo to 4:3: one shape keeps the crops consistent, and
portraits would lose most of the picture. `total` / `inRatio` say how many photos the album has and how many fit.

If the title had no date prefix, `date` is empty: ask the user for the date of the event.

## 3. Confirm with the user

Show the title (fix the wording if Zonerama's is a working name, e.g. lower-case or abbreviated), the date, and
"N of M photos (ratio 1.5)". Ask before continuing if fewer than 6 photos fit: the user may prefer another album.

## 4. Add the record

Add the album at the top of `albums` in `src/content/gallery.ts` (newest first, by `date`):

```ts
  {
    id: "pout-vranov",
    title: "Pouť Sedmiradostnou cestou na Vranov",
    date: "2026-08-30",
    href: album(16128406),
    photoCount: 15,
    photos: [
      {
        small: "https://eu.zonerama.com/photos/662362616_800x534_18.jpg",
        large: "https://eu.zonerama.com/photos/662362616_1600x1068_18.jpg",
      },
      // …
    ],
  },
```

- `id`: ASCII kebab-case from the title, unique in the file (it is the block's anchor `#album-<id>`).
- `href`: the `album()` helper with the album number.
- `photoCount` **equals `photos.length`**: the strips render `photoCount` tiles and fill the missing ones with
  placeholders.
- The page shows the 6 newest albums and the homepage the 4 newest; remove records beyond the 6th, older albums
  stay reachable on Zonerama.

## 5. Publish

Follow **`farnost-publish-content`**; check `/fotogalerie/` (strip, counter "1–3 / 15", photos load) and the
homepage album carousel.

## Common mistakes

- Using the profile or tab URL instead of the album URL (the script refuses it).
- Setting `photoCount` to the album's total on Zonerama: the extra tiles become placeholders.
- Inserting the album out of date order: the homepage shows `albums[0]` as the newest.
- Downloading photos or hosting them on the server: the URLs point at Zonerama.
