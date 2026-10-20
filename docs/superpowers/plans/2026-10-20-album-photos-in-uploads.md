# Album Photos in /uploads/ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the Fotogalerie album photos and the camp year covers from `/uploads/` instead of hot-linking
Zonerama, so the site loads nothing from Zonerama.

**Architecture:** Shared path helpers in `src/lib/gallery/albums.ts` name every album photo
(`/uploads/fotogalerie/<id>/foto-<n>-<width>.webp`) for the site, the schema and the scripts. A scripts module
resizes a source photo into the four widths and checks the server. A one-off migration stages today's photos from
the user's zip archives and switches the schema, the `srcset`, `gallery.json` and `camp.ts` in one commit. Then
`pnpm add-album --photos <zip> --write` stages new albums' photos from the user's zip.

**Tech Stack:** TypeScript, Next.js 16 static export, zod 4, sharp, Vitest, tsx scripts.

**Spec:** `docs/superpowers/specs/2026-10-20-album-photos-in-uploads-design.md`

## Global Constraints

- Album photos: `/uploads/fotogalerie/<album-id>/foto-<n>-<width>.webp`, widths `400, 800, 1200, 1600`; `small` is
  800, `large` is 1600; `<n>` is the 1-based position in `photos`.
- Camp covers: `/uploads/tabor/rocniky/<year>.webp`, 800 px wide, no `srcset`.
- Resize with sharp `autoOrient` and `withoutEnlargement`; never upscale; the WebP carries no EXIF.
- Never overwrite a file already on the server: refuse a folder/name `onServer` reports as taken. Local staged files
  not on the server may be replaced.
- Album links stay Zonerama (`href`, "Otevřít album", "Album na Zonerama", "Další alba", camp `album`).
- `design/DESIGN.md` and `scripts/deploy.sh` are not changed.
- Never connect to the server yourself; never release without the user's explicit yes (CLAUDE.md § Deployment).
- Commits via the `commit` skill; the full check (`docs/conventions.md`) before each commit touching `src/`, the
  scripts check for a `scripts/`-only commit.

## Review Focus

- A source photo smaller than 1600 px: all four files exist, none wider than the source (Task 1 test).
- A photo with EXIF orientation and GPS: written upright, without EXIF (Task 1 test).
- Staging failing halfway through `--write` (an unreadable image): `gallery.json` unchanged (Task 4 test).
- A zip with folders, non-images or two photos of one name; a 500 MB zip (streamed, Task 2).
- An album id whose folder is already on the server: refused before anything is written (Task 4 test); server unreachable:
  refused, not treated as free (covered by `onServer`).
- A re-run after an unreleased `--write`: local files replaced without error (Task 1 test).

---

### Task 1: Photo paths and staging helpers

**Files:**

- Modify: `src/lib/gallery/albums.ts`, `src/lib/gallery/albums.test.ts`
- Modify: `scripts/lib/images.ts` (`toWebp` accepts a buffer; `ALBUM_PHOTO_QUALITY`)
- Create: `scripts/lib/gallery/album-photos.ts`, `scripts/lib/gallery/album-photos.test.ts`

**Interfaces:**

- Produces (site, `src/lib/gallery/albums.ts`):
  - `ALBUM_PHOTO_WIDTHS = [400, 800, 1200, 1600] as const` (replaces `SRCSET_WIDTHS`)
  - `albumFolder(id: string): string` → `/uploads/fotogalerie/<id>`
  - `albumPhotoPath(id: string, n: number, width: number): string` → `…/foto-<n>-<width>.webp`
  - `albumPhoto(id: string, n: number): AlbumPhoto` → `{ small: …-800.webp, large: …-1600.webp }`
  - `albumSrcSet(url: string): string | undefined` — four widths for an album photo path, else `undefined`
    (added beside `zoneramaSrcSet`, which Task 2 removes)
- Produces (scripts, `scripts/lib/images.ts`): `toWebp(input: string | Buffer, dest, { width, quality })`;
  `ALBUM_PHOTO_QUALITY = 80`
- Produces (scripts, `scripts/lib/gallery/album-photos.ts`):
  - `stageAlbumPhotos(uploadsDir: string, id: string, sources: (string | Buffer)[]): Promise<string[]>` — writes the
    four widths of source `i` as `foto-<i+1>-*`, returns the written paths
  - `assertFreeOnServer(env: UploadsEnv, rel: string, hint: string): Promise<void>` — throws
    `` `${rel} is already on the server: ${hint}` `` when `onServer` says it exists

- [ ] **Step 1: Write the failing tests**

`albums.test.ts`:

```ts
describe("album photo paths", () => {
  it("names each width in the album's folder", () => {
    expect(albumPhotoPath("den-mensin-2026", 3, 1200)).toBe("/uploads/fotogalerie/den-mensin-2026/foto-3-1200.webp");
    expect(albumPhoto("den-mensin-2026", 3)).toEqual({
      small: "/uploads/fotogalerie/den-mensin-2026/foto-3-800.webp",
      large: "/uploads/fotogalerie/den-mensin-2026/foto-3-1600.webp",
    });
  });
});

describe("albumSrcSet", () => {
  it("offers an album photo in four widths", () => {
    const at = (w: number) => `/uploads/fotogalerie/den-mensin-2026/foto-3-${w}.webp ${w}w`;
    expect(albumSrcSet(albumPhoto("den-mensin-2026", 3).large)).toBe([400, 800, 1200, 1600].map(at).join(", "));
  });
  it("leaves other photos alone", () => {
    expect(albumSrcSet("/uploads/skupiny/schola/foto-1.webp")).toBeUndefined();
    expect(albumSrcSet("https://eu.zonerama.com/photos/662362586_1600x1067_18.jpg")).toBeUndefined();
  });
});
```

`album-photos.test.ts` (temp dir via `freshTempDir`; sources made with sharp `create` → `.jpeg()`):

- `"writes the four widths of each photo"`: two 2000 × 1500 sources → 8 files; `foto-2-1200.webp` is 1200 × 900.
- `"never enlarges a small photo"`: a 512 × 512 source → `foto-1-400.webp` 400 wide, `-800`, `-1200`, `-1600` all
  512 wide.
- `"turns the photo upright and drops its EXIF"`: a 2000 × 1500 source written with
  `.withMetadata({ orientation: 6 })` → `foto-1-1600.webp` is 1200 × 1600 and `metadata().exif` is `undefined`.
- `"replaces files left by an earlier run"`: staging the same id twice succeeds; the second source's size wins.
- `"refuses a name on the server"`: `assertFreeOnServer` with a fetch stub answering 200 rejects with
  `fotogalerie/x/foto-1-800.webp is already on the server: pass another id with --id`; with 404 it resolves.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm exec vitest run src/lib/gallery/albums.test.ts scripts/lib/gallery/album-photos.test.ts`
Expected: FAIL (`albumPhotoPath`, `albumSrcSet`, `stageAlbumPhotos` not exported).

- [ ] **Step 3: Implement the helpers**

`albums.ts` builds the paths from `UPLOADS_PATH`. `albumSrcSet` matches
`^(/uploads/fotogalerie/[a-z0-9-]+/foto-\d+)-\d+\.webp$` and maps `ALBUM_PHOTO_WIDTHS`. `stageAlbumPhotos` maps a
site path to `join(uploadsDir, path.slice(UPLOADS_PATH.length))` and calls `toWebp` per width with
`ALBUM_PHOTO_QUALITY`. `toWebp` passes a buffer to sharp as is (it reads a path into a buffer today).

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm exec vitest run src/lib/gallery/albums.test.ts scripts/lib/gallery/album-photos.test.ts`
Expected: PASS.

- [ ] **Step 5: Full check and commit**

Run the full check (`docs/conventions.md`); no browser check (nothing renders differently). Commit:
`feat(gallery): add upload paths and staging for album photos`.

### Task 2: Photos from a zip of originals

Replanned on 2026-10-20 (see the spec's Files and Migration): Zonerama serves a bot image to scripts, so the photos
come from the user's zip. The old Task 2 (migration) becomes Task 3, the old Task 3 (`add-album`) Task 4.

**Files:**

- Create: `scripts/lib/gallery/zip-photos.ts`, `scripts/lib/gallery/zip-photos.test.ts`
- Modify: `scripts/lib/gallery/add-album.ts` (`selectPhotos` generic), `scripts/lib/gallery/add-album.test.ts`

**Interfaces:**

- Produces:
  - `type LocalPhoto = { file: string; width: number; height: number }` — `file` an absolute path, the size upright
  - `extractPhotos(zip: string, dir: string): Promise<LocalPhoto[]>` — unpacks the zip's images (`.jpg`, `.jpeg`,
    `.png`, `.webp`, any case) flat into `dir` by file name, ignoring folders and other files, sorted by name with
    `localeCompare(…, "cs", { numeric: true })`; two images with the same name throw `the zip has two photos named
<name>`; no image throws `the zip has no photos`
  - `titleAndDateFromZip(zip: string): { title: string; date: string }` — the zip's base name through the same
    `YYYY_MM_DD` rule as `titleAndDate`
  - `selectPhotos<T extends { width: number; height: number }>(items: T[])` — unchanged rule, any sized item

- [ ] **Step 1: Write the failing tests** (`zip-photos.test.ts`, zips built with fflate `zipSync` from sharp JPEGs):
      `"unpacks the images flat, sorted by number"` (`b/dnm-10.jpg`, `a/dnm-9.JPG`, `notes.txt` → `dnm-9.JPG`,
      `dnm-10.jpg`, sizes read); `"reads a rotated photo upright"` (orientation 6, 2000 × 1500 → 1500 × 2000);
      `"refuses two photos with one name"`; `"refuses a zip without photos"`; `titleAndDateFromZip("/x/2026_09_27 pesi
pout na Vranov.zip")` → `{ title: "Pesi pout na Vranov", date: "2026-09-27" }`. In `add-album.test.ts`,
      `selectPhotos` also takes `{ width, height, file }` items.
- [ ] **Step 2: Run** `pnpm exec vitest run scripts/lib/gallery/` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement** with fflate's streaming `Unzip` + `UnzipInflate` over `createReadStream` (zips reach
      500 MB; never the whole archive in memory), sizes via sharp `metadata()` (swap for orientation ≥ 5). Factor the
      `YYYY_MM_DD` parsing out of `titleAndDate` and reuse it.
- [ ] **Step 4: Run** `pnpm exec vitest run scripts/lib/gallery/` — Expected: PASS.
- [ ] **Step 5: Scripts check and commit** `feat(gallery): read album photos from a zip of originals`.

### Task 3: Migrate today's albums and camp covers

**Files:** as the old plan's Task 2: `src/lib/gallery/schema.ts` (+ test), `src/lib/gallery/albums.ts` (+ test),
`src/components/gallery/AlbumPhotoTile.tsx`, `src/content/types/gallery.ts`, `src/content/types/camp.ts`,
`src/content/gallery.json`, `src/content/camp.ts` (+ test), `src/app/ochrana-osobnich-udaju/page.tsx`; the
migration script in the scratchpad (not committed); staged `uploads/fotogalerie/<id>/…`, `uploads/tabor/rocniky/…`.

**Interfaces:** consumes Task 1 and Task 2; produces `albumSchema` accepting only upload paths; `zoneramaSrcSet`
removed.

- [ ] **Step 1: Write the failing schema and camp tests** — as specified before: `schema.test.ts` fixture
      `albumPhoto("pout-vranov", n)`, `"refuses a Zonerama photo URL"`, `"refuses a photo in another album's folder, at
the wrong width or position"`; `camp.test.ts` cover regex `^/uploads/tabor/rocniky/(\d{4})\.webp$` equal to `year`.
      Run `pnpm exec vitest run src/lib/gallery/schema.test.ts src/content/camp.test.ts` — Expected: FAIL.
- [ ] **Step 2: Switch the schema, the srcset and the copy** — `photoUrl` regex
      `^/uploads/fotogalerie/[a-z0-9-]+/foto-\d+-\d+\.webp$`, the album `superRefine` requires `photos[i]` to equal
      `albumPhoto(album.id, i + 1)`; remove `zoneramaSrcSet`/`ZONERAMA_PHOTO`; `AlbumPhotoTile` uses `albumSrcSet`; type
      comments; privacy page drops the Zonerama `<li>`.
- [ ] **Step 3: Run the migration** (scratchpad script, `pnpm exec tsx`): `assertFreeOnServer` for every target;
      for each of the five zips `extractPhotos` → `selectPhotos` → first 15 → `stageAlbumPhotos`; rewrite each album's
      `photos` with `albumPhoto(id, n)` and `photoCount` with their number, drop `pout-vranov`; covers via
      `toWebp(<year>.jpg, uploads/tabor/rocniky/<year>.webp, { width: 800, quality: ALBUM_PHOTO_QUALITY })`; `camp.ts`
      `` const cover = (year: number) => `/uploads/tabor/rocniky/${year}.webp` `` and its header comment. Print per album
      "N of M photos (ratio r)" for the user; ask before continuing if fewer than 6 fit (the skill's rule).
- [ ] **Step 4: Check** — `grep -rn "zonerama.com/photos" src/` empty; full check; browser check at 390/834/1440 in
      both themes (homepage carousel, Fotogalerie strips and lightbox, camp Ročníky) against the mockups; no request to
      `eu.zonerama.com` in the network panel.
- [ ] **Step 5: Commit** `feat(gallery): serve album photos and camp covers from uploads`.

### Task 4: `pnpm add-album --photos <zip>` stages the photos

**Files:** `scripts/lib/gallery/add-album.ts` (+ test), `scripts/add-album.ts` (header and usage).

**Interfaces:**

- Consumes: `extractPhotos`, `titleAndDateFromZip`, `selectPhotos` (Task 2); `albumPhoto`, `stageAlbumPhotos`,
  `assertFreeOnServer` (Task 1); upload-path `albumSchema` (Task 3)
- Produces:
  - `Command` gains `photos: string` (required: a missing `--photos` throws the usage)
  - `proposeAlbum(page: string | null, zip: string, photos: LocalPhoto[], number: string, overrides)` →
    `{ proposal, album, sources }` (replaces `readAlbumPage`): title/date from the page, else `titleAndDateFromZip`;
    `album.photos` = `albumPhoto(id, n)`, `sources[i]` the chosen `LocalPhoto.file`
  - `execute(command, env: UploadsEnv = defaultUploadsEnv(), galleryFile = GALLERY_FILE)`

- [ ] **Step 1: Write the failing tests** — `proposeAlbum` with a page and with `null` (zip-name title and date);
      `parseCommand` refuses a missing `--photos`; `describe("execute on a temp gallery.json and uploads/")` with a
      fetch stub (album page → `page(...)` or 500; HEAD → 404/200) and a temp zip: `"stages the photos and adds the
album"`; `"falls back to the zip's name when the page fails"`; `"refuses a folder already on the server before
writing"` (no files, `gallery.json` unchanged); `"leaves gallery.json unchanged when staging fails"` (an
      unreadable image in the zip); `"only reports with --check"` (`Would stage N photos in uploads/fotogalerie/<id>/`,
      no files); `"writes nothing for the proposal"` (no HEAD request, no files). No request to `/photos/` is ever made.
- [ ] **Step 2: Run** `pnpm exec vitest run scripts/lib/gallery/add-album.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** — order: parse; `extractPhotos` into `mkdtempSync` (removed in `finally`); fetch the
      page (a non-OK answer or a page without a Zonerama title → `null`); `proposeAlbum`; proposal → print; else date
      check, `addAlbum(…, { check: true })`, `assertFreeOnServer`, then for `--write` `stageAlbumPhotos`, `addAlbum`,
      `formatAndTest`; print `albumLines` plus `` `${actionVerb(check, "stage")} ${n} photos in
uploads/fotogalerie/${id}/` ``. `photoUrl` and the Zonerama `image` template go if nothing else uses them.
- [ ] **Step 4: Run** `pnpm exec vitest run scripts/lib/gallery/add-album.test.ts` — Expected: PASS.
- [ ] **Step 5: Scripts check and commit** `feat(gallery): stage a new album's photos from its zip`.

### Task 5: Skills and README

**Files:**

- Modify: `.claude/skills/parish-create-album/SKILL.md`, `.claude/skills/parish-publish-content/SKILL.md`,
  `README.md`

- [ ] **Step 1: Update the text**

- `parish-create-album`: ask the user for the album's zip of originals (never download from Zonerama: it serves
  a bot image); intro — `--photos <zip>` chooses the photos and `--write` stages them in
  `uploads/fotogalerie/<id>/` (four widths), publishing uploads them; step 4 — mention the refusal of an id whose
  folder is on the server (`--id`); "Common mistakes" — replace "Downloading photos or uploading them" with
  "Downloading or converting photos by hand instead of `--write`".
- `parish-publish-content`: albums now have staged files (wherever it says they have none).
- `README.md`: § Content "Album photos stay on Zonerama" → album photos are staged in `uploads/fotogalerie/<id>/` by
  `pnpm add-album --write`; the `pnpm add-album` row: `--write` also stages the photos.

- [ ] **Step 2: Check and commit**

Run `pnpm format`. Commit: `docs(skills): describe staged album photos`.

### Task 6: Final verification

- [ ] **Step 1:** Full check, then `grep -rln "eu.zonerama.com/photos" out/` — Expected: no files.
- [ ] **Step 2:** `pnpm add-album <a current album URL> --check` — Expected: it refuses (album already in
      gallery.json), showing the command still runs end to end.
- [ ] **Step 3:** Report to the user: the staged folders, and that publishing needs `pnpm release` with their
      explicit yes (`parish-release` skill).
