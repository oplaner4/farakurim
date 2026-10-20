---
name: parish-create-album
description: Add a photo album to the Fotogalerie of the new farakurim.cz site from a Zonerama album URL under eu.zonerama.com/FarnostKurim and the zip of its original photos - pick up to 15 photos of one shape from the zip, stage them, add the album, then publish. Use whenever the user wants to add a gallery, album or photos from Zonerama.
---

# Create a gallery album

The site serves the album's photos from `/uploads/fotogalerie/<id>/`: `pnpm add-album --write` resizes the chosen
photos from the zip of the album's originals (four widths each) and stages them in `uploads/`, and the release uploads
them. The photos never come from Zonerama: it answers a script with a "Bot Detected" image instead of the photo.
Finish with **`parish-publish-content`**.

## 1. Check the URL and get the zip

The URL must be an album: `https://eu.zonerama.com/FarnostKurim/Album/<albumId>`. The profile or a tab
(`…/FarnostKurim/425053`) lists albums, not photos: ask for the album link.

Ask the user for the zip of the album's original photos (they download it from the album on Zonerama, usually to
`~/Downloads/<YYYY_MM_DD> <title>.zip`), unless they already gave it.

## 2. Read the album

```sh
pnpm add-album "https://eu.zonerama.com/FarnostKurim/Album/<albumId>" --photos "<zip>"
```

It prints JSON with the proposed `id` (ASCII kebab-case from the title, ending with the year: `medovy-den-2026`, so
next year's album never takes over this one's links), the title (sentence case, without
Zonerama's `YYYY_MM_DD` prefix), the date from that prefix, and the photo counts. It picks up to 15 photos of the
zip's most common landscape aspect ratio, in file-name order, because the strips crop every photo to 4:3: one shape
keeps the crops consistent, and portraits would lose most of the picture. `total` / `inRatio` / `photos` say how many
photos the zip has, how many fit and how many it takes.

The title and the date come from the album page. When Zonerama does not answer, the command says so and takes them
from the zip's name, which has no diacritics: fix the title with the user. If there is no date prefix, `date` is
empty: ask the user for the date of the event.

## 3. Confirm with the user

Show the title (fix the wording if Zonerama's is a working name, e.g. lower-case or abbreviated), the date, the id
and "N of M photos (ratio 1.5)". Ask before continuing if fewer than 6 photos fit: the user may prefer another album.

Wait for the user's yes or corrections to these before adding anything.

## 4. Add the record and stage the photos

```sh
pnpm add-album "<album URL>" --photos "<zip>" --write --title "<title>" --date <YYYY-MM-DD> --id <id>
```

Pass the confirmed values (each only when it differs from the JSON). It stages the photos in
`uploads/fotogalerie/<id>/`, adds the album, removes the oldest albums beyond the site's limit (they stay on Zonerama,
their files on the server) and prints each one it removed, then runs the gallery test. It refuses an id or album
already on the site, an album older than all the kept ones, and an id whose folder is already on the server (the
server's files are never overwritten): pass another `--id`.

## 5. Publish

Follow **`parish-publish-content`**: the release uploads the staged photos.

## Common mistakes

- Using the profile or tab URL instead of the album URL (the script refuses it).
- Writing the record or its photo paths by hand instead of `--write`.
- Downloading the photos from Zonerama, or resizing them by hand: the zip and `--write` do it.
