# Album Photos in /uploads/ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the Fotogalerie album photos and the camp year covers from `/uploads/` instead of hot-linking
Zonerama, so the site loads nothing from Zonerama.

**Architecture:** Shared path helpers in `src/lib/gallery/albums.ts` name every album photo
(`/uploads/fotogalerie/<id>/foto-<n>-<width>.webp`) for the site, the schema and the scripts. A scripts module
resizes a source photo into the four widths and checks the server. A one-off migration stages today's photos from
the user's zip archives and switches the schema, the `srcset`, `gallery.json` and `camp.ts` in one commit. Then
`pnpm add-album --write` downloads and stages new albums' photos.

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
- A download failing halfway through `--write`: `gallery.json` unchanged (Task 3 test).
- An album id whose folder is already on the server: refused before any download (Task 3 test); server unreachable:
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

### Task 2: Migrate today's albums and camp covers (needs the user's zips)

**Files:**

- Modify: `src/lib/gallery/schema.ts`, `src/lib/gallery/schema.test.ts`, `src/lib/gallery/albums.ts`,
  `src/lib/gallery/albums.test.ts`, `src/components/gallery/AlbumPhotoTile.tsx`, `src/content/types/gallery.ts`,
  `src/content/types/camp.ts`, `src/content/gallery.json`, `src/content/camp.ts`, `src/content/camp.test.ts`,
  `src/app/ochrana-osobnich-udaju/page.tsx`
- Create (not committed): the migration script in the scratchpad
- Staged (git-ignored): `uploads/fotogalerie/<id>/…` for the six albums, `uploads/tabor/rocniky/2019…2025.webp`

**Interfaces:**

- Consumes: `albumPhoto`, `albumSrcSet`, `ALBUM_PHOTO_WIDTHS`, `stageAlbumPhotos`, `assertFreeOnServer`,
  `toWebp`, `ALBUM_PHOTO_QUALITY` (Task 1)
- Produces: `albumSchema` accepting only upload paths (Task 3's `--write` relies on it); `zoneramaSrcSet` removed.

- [ ] **Step 1: Ask the user for the zip archives**

List the six albums in `gallery.json` (id, title, Zonerama `href`) and the camp years 2019–2025 (their `album`
link), and ask for a zip of each album's original photos. Wait for them. Unpack each into its own new, empty
scratchpad folder.

- [ ] **Step 2: Write the failing schema and camp tests**

`schema.test.ts`: the `photo` fixture becomes `albumPhoto("pout-vranov", n)`, and:

- `"refuses a Zonerama photo URL"`: a photo `{ small: "https://eu.zonerama.com/photos/1_800x533_18.jpg", … }` fails
  on `photos.0.small`.
- `"refuses a photo in another album's folder, at the wrong width or position"`: `albumPhoto("jine-album", 1)`,
  `{ small: albumPhotoPath(id, 1, 400), large }`, and photos `[albumPhoto(id, 2), albumPhoto(id, 1)]` each fail on
  `photos`.

`camp.test.ts`: the cover regex becomes `^/uploads/tabor/rocniky/(\d{4})\.webp$` with the capture equal to `year`.

Run: `pnpm exec vitest run src/lib/gallery/schema.test.ts src/content/camp.test.ts` — Expected: FAIL.

- [ ] **Step 3: Switch the schema, the srcset and the copy**

`schema.ts`: `photoUrl` is `/^\/uploads\/fotogalerie\/[a-z0-9-]+\/foto-\d+-\d+\.webp$/`; the album `superRefine`
adds an issue at `photos` unless `photos[i]` equals `albumPhoto(album.id, i + 1)`. `albums.ts`: remove
`zoneramaSrcSet`, `ZONERAMA_PHOTO` and its tests; `AlbumPhotoTile` calls `albumSrcSet`. Type comments in
`types/gallery.ts` (`AlbumPhoto`: uploaded in four widths, `small`/`large` the 800/1600 ones) and `types/camp.ts`
(`cover`: uploaded to `/uploads/tabor/rocniky/<year>.webp`). Privacy page: remove the Zonerama `<li>`.

- [ ] **Step 4: Run the migration**

A scratchpad script (`pnpm exec tsx <script>`, run from the repo root so `@/` resolves):

1. `assertFreeOnServer` for each `fotogalerie/<id>/foto-1-800.webp` and `tabor/rocniky/<year>.webp`; stop on any
   taken.
2. For each album and camp album, fetch its Zonerama album page and read `photoItems` (from
   `scripts/lib/gallery/add-album.ts`): `photoId → width × height, position`.
3. Match each stored photo (its photo id from the `large` URL; a camp cover's from `cover`) to an original in the
   zip: the same `width × height` (or swapped, if the file's EXIF rotates it) and the nearest position in sorted
   file order. Print the matches; settle an ambiguous one by viewing the candidates next to the live-site photo; ask
   the user when still unsure; stop on a photo with no candidate or a format sharp cannot read.
4. `stageAlbumPhotos(uploadsDir, id, originals)` per album in stored order; `toWebp(original,
uploads/tabor/rocniky/<year>.webp, { width: 800, quality: ALBUM_PHOTO_QUALITY })` per cover.
5. Rewrite each album's `photos` in `gallery.json` with `albumPhoto(id, n)` (`writeContentFile`); in `camp.ts`
   replace `cover()` with `` const cover = (year: number) => `/uploads/tabor/rocniky/${year}.webp` `` and
   `cover(<year>)` per year; update its header comment (how to add next year's cover: the original from the year's
   album, 800 px wide WebP).

- [ ] **Step 5: Check**

Run: `grep -rn "zonerama.com/photos" src/` — Expected: no match. Run the full check, then the browser check at 390,
834 and 1440 px in both themes: homepage carousel, Fotogalerie strips and lightbox, camp page, compared with the
mockups and with the live site (same photos, same crops); in the network panel no request to `eu.zonerama.com`.

- [ ] **Step 6: Commit**

`feat(gallery): serve album photos and camp covers from uploads`, body naming the staged folders for the release.

### Task 3: `pnpm add-album --write` stages the photos

**Files:**

- Modify: `scripts/lib/gallery/add-album.ts`, `scripts/lib/gallery/add-album.test.ts`, `scripts/add-album.ts`
  (header comment)

**Interfaces:**

- Consumes: `albumPhoto`, `stageAlbumPhotos`, `assertFreeOnServer` (Task 1); the upload-path `albumSchema` (Task 2)
- Produces:
  - `readAlbumPage(page, number, overrides)` returns `{ proposal, album, sources }`: `album.photos` are
    `albumPhoto(id, n)`, `sources[i]` the Zonerama `photoUrl(item, 1600)` of photo `i + 1`
  - `execute(command: Command, env: UploadsEnv = defaultUploadsEnv(), galleryFile = GALLERY_FILE): Promise<void>` —
    `env.fetch` reads the page, the photos and the server; the test passes a temp `uploadsDir` and `gallery.json`

- [ ] **Step 1: Write the failing tests**

In `add-album.test.ts`, `readAlbumPage`'s expectations use `albumPhoto(id, n)` and a new `sources` assertion
(`urls(n, w).large`). A new `describe("execute on a temp gallery.json and uploads/")` with a fetch stub routing by
URL: the album page → `page(...)`, a `/photos/` URL → a 2000 × 1333 sharp JPEG, a `HEAD` to the site → 404:

- `"stages the photos and adds the album"`: `--write` → `uploads/fotogalerie/<id>/foto-1-*.webp` … for each photo,
  and the album in the temp `gallery.json` with upload paths.
- `"refuses a folder already on the server before downloading"`: HEAD → 200 → rejects with `pass another id with
--id`; no `/photos/` request made; `gallery.json` unchanged.
- `"leaves gallery.json unchanged when a photo download fails"`: the third `/photos/` URL → 500 → rejects naming the
  URL; `gallery.json` byte-identical.
- `"only reports with --check"`: no `/photos/` request, no files; output contains `Would stage 4 photos in
uploads/fotogalerie/<id>/`.
- `"downloads nothing for the proposal"`: no option → no `/photos/` and no HEAD request.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm exec vitest run scripts/lib/gallery/add-album.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement**

Order in `execute` with `--write`/`--check`: date check; `addAlbum(galleryFile, album, { check: true })` (validates,
no write); `assertFreeOnServer(env, "fotogalerie/<id>/foto-1-800.webp", "pass another id with --id")`; then, only
for `--write`, download each source sequentially (`${url} answered ${status}` on a non-OK response), stage them with
`stageAlbumPhotos`, and only then `addAlbum(galleryFile, album)` and `formatAndTest`. Print `albumLines` plus
`` `${actionVerb(check, "stage")} ${n} photos in uploads/fotogalerie/${id}/` ``.

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm exec vitest run scripts/lib/gallery/add-album.test.ts` — Expected: PASS.

- [ ] **Step 5: Scripts check and commit**

Run `pnpm format && pnpm test:scripts && pnpm lint && pnpm exec tsc --noEmit`. Commit:
`feat(gallery): stage the photos of a new album in uploads`.

### Task 4: Skills and README

**Files:**

- Modify: `.claude/skills/parish-create-album/SKILL.md`, `.claude/skills/parish-publish-content/SKILL.md`,
  `README.md`

- [ ] **Step 1: Update the text**

- `parish-create-album`: intro — `--write` downloads the chosen photos and stages them in
  `uploads/fotogalerie/<id>/` (four widths), publishing uploads them; step 4 — mention the refusal of an id whose
  folder is on the server (`--id`); "Common mistakes" — replace "Downloading photos or uploading them" with
  "Downloading or converting photos by hand instead of `--write`".
- `parish-publish-content`: albums now have staged files (wherever it says they have none).
- `README.md`: § Content "Album photos stay on Zonerama" → album photos are staged in `uploads/fotogalerie/<id>/` by
  `pnpm add-album --write`; the `pnpm add-album` row: `--write` also stages the photos.

- [ ] **Step 2: Check and commit**

Run `pnpm format`. Commit: `docs(skills): describe staged album photos`.

### Task 5: Final verification

- [ ] **Step 1:** Full check, then `grep -rln "eu.zonerama.com/photos" out/` — Expected: no files.
- [ ] **Step 2:** `pnpm add-album <a current album URL> --check` — Expected: it refuses (album already in
      gallery.json), showing the command still runs end to end.
- [ ] **Step 3:** Report to the user: the staged folders, and that publishing needs `pnpm release` with their
      explicit yes (`parish-release` skill).
