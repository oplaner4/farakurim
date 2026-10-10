# Fotogalerie as JSON Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store the Fotogalerie albums in `src/content/gallery.json`, checked by a zod schema, and replace
`scripts/zonerama-album.py` with `scripts/add-album.ts`, which adds an album to the JSON and removes the albums beyond
`MAX_ALBUMS`.

**Architecture:** `src/lib/gallery/schema.ts` holds the album rules; `src/content/gallery.ts` imports the JSON,
checks it and keeps exporting `albums` and `GALLERY_URL`, so its importers do not change. `scripts/add-album.ts`
ports the Python page parsing to pure functions, and `addAlbum()` inserts the album newest first, keeps
`MAX_ALBUMS` (from `src/lib/gallery/albums.ts`) and writes the file, as `addOhlasky()` prunes the ohlášky.

**Tech Stack:** Next.js 16 (static export), TypeScript, zod 4, `entities`, vitest, tsx, Prettier, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-10-gallery-json-design.md`

## Global Constraints

- Code, comments and commit messages in English; visible text in Czech (no UI text changes here).
- Conventional Commits, checked by commitlint (body lines ≤ 100 characters); never `--no-verify`. End every commit
  message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Use the `commit` skill.
- Imports: same folder `./x`, anything else `@/…` (no `../` in `src/`).
- The site output must not change (same data, same order, same `Album` type).
- `MAX_ALBUMS = 6`, `MAX_PHOTOS = 15`, photo widths 800 and 1600 px.
- No top-level `await` in scripts: tsx runs them as CommonJS (see `scripts/add-aktualita.ts`).
- Do not edit `design/DESIGN.md` or older specs and plans.
- Check a zod or Node API with context7 before using one you have not seen in this repo (CLAUDE.md working rule).
- `<scratchpad>` below is `/tmp/claude-1000/-home-ondrej-planer-Documents-farakurim/3d8338c3-55b9-4c30-be5b-3a42a131a59d/scratchpad`.
- Full check before calling work done: `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`.

## Review Focus

- The same Zonerama album given once as `eu.` and once as `www.` (or with a different id) is refused, not added
  twice (Task 3, "refuses a taken id or album"; Task 1, "the same album twice").
- A gallery already over `MAX_ALBUMS` (an album added by hand) loses every extra album on the next add, and the
  output names each one (Task 3, "removes every album over the limit").
- An album dated the same day as an existing one goes before it, so the album just added is the first of that day
  (Task 3, "inserts newest first, a same-day album before the older one").
- Czech letters in a title are written as they are, not as `\u` escapes, and read back equal (Task 3, "writes Czech
  letters as they are").
- A page that is not an album page, or an album without usable photos, stops with a clear message instead of a
  crash in the middle (Task 2, "stops on a page without album data").

---

## File Structure

| File                                                | Change                                                                 |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/lib/gallery/schema.ts`, `schema.test.ts`       | New: `albumSchema`, `galleryFileSchema`, `albumNumber()` (Task 1)      |
| `src/lib/gallery/albums.ts`                         | Add `MAX_ALBUMS` (Task 1)                                              |
| `src/content/types/gallery.ts`                      | Add `GalleryFile`, comment (Task 1)                                    |
| `src/app/fotogalerie/page.tsx`                      | `MAX_ALBUMS` instead of `ALBUMS_SHOWN` (Task 1)                        |
| `src/content/gallery.json`                          | New: the data, migrated (Task 1)                                       |
| `src/content/gallery.ts`, `gallery.test.ts`         | Loader and schema-based test (Task 1)                                  |
| `scripts/add-album.ts`, `scripts/add-album.test.ts` | New: page parsing (Task 2), `addAlbum()`, `albumLines()`, CLI (Task 3) |
| `scripts/content-files.ts`, `package.json`          | `GALLERY_FILE`, `add-album` script (Task 3)                            |
| `scripts/zonerama-album.py`                         | Removed (Task 3)                                                       |
| Skill, rule, README                                 | Task 4                                                                 |

---

### Task 0: Baseline output

**Files:** none in the repo.

- [ ] **Step 1: Write the output normalizer** to `<scratchpad>/normalize-out.mjs`. It copies every `.html`, `.ics`
      and `.xml` file of `out/`, strips scripts and hashed asset paths (they differ between any two builds) and puts
      one tag per line for a readable diff:

```js
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const [outDir, destDir] = process.argv.slice(2);
const files = readdirSync(outDir, { recursive: true, encoding: "utf8" }).filter((f) => /\.(html|ics|xml)$/.test(f));
for (const file of files) {
  const text = readFileSync(join(outDir, file), "utf8")
    .replace(/<script\b[^]*?<\/script>/g, "")
    .replace(/\/_next\/static\/[^"' )]+/g, "/_next/static/…")
    .replace(/></g, ">\n<");
  mkdirSync(dirname(join(destDir, file)), { recursive: true });
  writeFileSync(join(destDir, file), text);
}
console.log(`${files.length} files`);
```

- [ ] **Step 2: Build the current main and keep the normalized output**

Run: `rm -rf <scratchpad>/out-before && pnpm build && node <scratchpad>/normalize-out.mjs out <scratchpad>/out-before`
Expected: build succeeds; a file count of several hundred.

- [ ] **Step 3: Keep the old albums for the migration check**

Run:

```sh
pnpm exec tsx --tsconfig tsconfig.json -e 'import { albums } from "@/content/gallery"; console.log(JSON.stringify(albums))' > <scratchpad>/albums-before.json
```

Expected: one line of JSON with 5 albums (`node -e 'console.log(require("<scratchpad>/albums-before.json").length)'`
prints `5`). If tsx refuses the `-e` import, write the same two lines to `<scratchpad>/dump.mts` and run
`pnpm exec tsx --tsconfig tsconfig.json <scratchpad>/dump.mts`.

---

### Task 1: Schema, MAX_ALBUMS, data and loader

**Files:**

- Create: `src/lib/gallery/schema.ts`, `src/lib/gallery/schema.test.ts`, `src/content/gallery.json`
- Modify: `src/content/types/gallery.ts`, `src/lib/gallery/albums.ts`, `src/app/fotogalerie/page.tsx:9-10,31`,
  `src/content/gallery.ts` (rewritten), `src/content/gallery.test.ts` (rewritten)

**Interfaces:**

- Produces: `albumSchema` (`z.ZodType<Album>`), `galleryFileSchema` (`z.ZodType<GalleryFile>`),
  `albumNumber(href: string): string` from `@/lib/gallery/schema`; `MAX_ALBUMS: number` (6) from
  `@/lib/gallery/albums`; `type GalleryFile = { albums: Album[] }` from `@/content/types/gallery`; `albums: Album[]`
  and `GALLERY_URL` from `@/content/gallery` (unchanged names).

- [ ] **Step 1: Add the `GalleryFile` type.** In `src/content/types/gallery.ts` change the comment
      `// Fotogalerie (gallery.ts): Zonerama albums.` to `// Fotogalerie (gallery.json): Zonerama albums.` and append:

```ts
/** src/content/gallery.json: the albums the site keeps, newest first. */
export type GalleryFile = {
  albums: Album[];
};
```

- [ ] **Step 2: Add `MAX_ALBUMS`** to `src/lib/gallery/albums.ts`, after the header comment:

```ts
/**
 * The albums the site keeps, newest first: the Fotogalerie shows them all, the homepage the 4 newest; older ones stay
 * on Zonerama (design/DESIGN.md §19.1). `pnpm add-album` removes the older ones.
 */
export const MAX_ALBUMS = 6;
```

In `src/app/fotogalerie/page.tsx` delete the `ALBUMS_SHOWN` constant and its comment (lines 9–10), import
`import { MAX_ALBUMS } from "@/lib/gallery/albums";` (after the `@/content/site` import), and render
`albums.slice(0, MAX_ALBUMS)`.

- [ ] **Step 3: Write the failing schema test** `src/lib/gallery/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Album } from "@/content/types/gallery";
import { albumNumber, albumSchema, galleryFileSchema } from "./schema";

const photo = (n: number) => ({
  small: `https://eu.zonerama.com/photos/${n}_800x533_18.jpg`,
  large: `https://eu.zonerama.com/photos/${n}_1600x1067_18.jpg`,
});

const album = (fields: Partial<Album> = {}): Album => ({
  id: "pout-vranov",
  title: "Pouť na Vranov",
  date: "2026-08-30",
  href: "https://www.zonerama.com/FarnostKurim/Album/16000001",
  photoCount: 2,
  photos: [photo(1), photo(2)],
  ...fields,
});

/** The paths of the problems zod found, "" for the root. */
const problemPaths = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.success ? [] : result.error!.issues.map((issue) => issue.path.join("."));

describe("albumSchema", () => {
  it("accepts an album, also without photos", () => {
    expect(albumSchema.parse(album())).toEqual(album());
    const { photos, ...withoutPhotos } = album();
    expect(albumSchema.parse(withoutPhotos)).toEqual(withoutPhotos);
  });

  it.each<[string, Partial<Album>, string]>([
    ["a non-kebab id", { id: "Pout_Vranov" }, "id"],
    ["an empty title", { title: "  " }, "title"],
    ["an invalid date", { date: "2026-02-30" }, "date"],
    ["another site's album", { href: "https://example.com/FarnostKurim/Album/1" }, "href"],
    ["another profile's album", { href: "https://www.zonerama.com/Someone/Album/1" }, "href"],
    ["no photos counted", { photoCount: 0, photos: [] }, "photoCount"],
    [
      "a photo URL off Zonerama",
      { photos: [photo(1), { ...photo(2), large: "https://example.com/x.jpg" }] },
      "photos.1.large",
    ],
    ["more photos than photoCount", { photoCount: 1 }, "photos"],
  ])("refuses %s", (_, fields, path) => {
    expect(problemPaths(albumSchema.safeParse(album(fields)))).toContain(path);
  });

  it("refuses an unknown field", () => {
    expect(albumSchema.safeParse({ ...album(), cover: "x.jpg" }).success).toBe(false);
  });
});

describe("galleryFileSchema", () => {
  const second = album({ id: "medovy-den", date: "2026-08-20", href: "https://www.zonerama.com/FarnostKurim/Album/2" });

  it("accepts albums newest first, two on the same day too", () => {
    expect(galleryFileSchema.safeParse({ albums: [album(), second] }).success).toBe(true);
    expect(galleryFileSchema.safeParse({ albums: [album(), { ...second, date: album().date }] }).success).toBe(true);
  });

  it("refuses albums out of order", () => {
    expect(problemPaths(galleryFileSchema.safeParse({ albums: [second, album()] }))).toEqual(["albums.1.date"]);
  });

  it("refuses a duplicate id", () => {
    const dup = { ...second, id: album().id };
    expect(problemPaths(galleryFileSchema.safeParse({ albums: [album(), dup] }))).toEqual(["albums.1.id"]);
  });

  it("refuses the same album twice, also once as eu. and once as www.", () => {
    const same = { ...second, href: "https://eu.zonerama.com/FarnostKurim/Album/16000001" };
    expect(problemPaths(galleryFileSchema.safeParse({ albums: [album(), same] }))).toEqual(["albums.1.href"]);
  });
});

describe("albumNumber", () => {
  it("is the album's number on Zonerama", () => {
    expect(albumNumber("https://eu.zonerama.com/FarnostKurim/Album/16583642")).toBe("16583642");
  });
});
```

- [ ] **Step 4: Run it to see it fail**

Run: `pnpm exec vitest run src/lib/gallery/schema.test.ts`
Expected: FAIL, `Cannot find module './schema'` (or "Failed to resolve import").

- [ ] **Step 5: Write `src/lib/gallery/schema.ts`**

```ts
import * as z from "zod";
import type { Album, GalleryFile } from "@/content/types/gallery";

// The rules of the Fotogalerie albums, in one place: src/content/gallery.ts checks src/content/gallery.json with them
// when the site loads it, and scripts/add-album.ts checks a new album and the file before it writes. How many albums
// the site keeps (MAX_ALBUMS) is the content test's rule and the script's, not the loader's.

const text = z.string().trim().min(1);
const photoUrl = z.string().regex(/^https:\/\/eu\.zonerama\.com\/photos\/\S+$/, "must be a Zonerama photo URL");

/** The album's number on Zonerama: the same for its eu. and www. URL. */
export const albumNumber = (href: string) => href.split("/").at(-1)!;

export const albumSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be ASCII kebab-case"),
    title: text,
    date: z.iso.date(),
    href: z
      .string()
      .regex(
        /^https:\/\/(www|eu)\.zonerama\.com\/FarnostKurim\/Album\/\d+$/,
        "must be a FarnostKurim album on Zonerama",
      ),
    photoCount: z.int().positive(),
    photos: z.array(z.strictObject({ small: photoUrl, large: photoUrl })).optional(),
  })
  .superRefine((album, ctx) => {
    if (album.photos && album.photos.length > album.photoCount) {
      ctx.addIssue({ code: "custom", path: ["photos"], message: `more than photoCount (${album.photoCount})` });
    }
  }) satisfies z.ZodType<Album>;

export const galleryFileSchema = z.strictObject({ albums: z.array(albumSchema) }).superRefine(({ albums }, ctx) => {
  albums.forEach((album, i) => {
    const earlier = albums.slice(0, i);
    if (earlier.some((a) => a.id === album.id)) {
      ctx.addIssue({ code: "custom", path: ["albums", i, "id"], message: `${album.id} is already taken` });
    }
    if (earlier.some((a) => albumNumber(a.href) === albumNumber(album.href))) {
      ctx.addIssue({ code: "custom", path: ["albums", i, "href"], message: "this album is already in the list" });
    }
    if (i > 0 && album.date > albums[i - 1].date) {
      ctx.addIssue({
        code: "custom",
        path: ["albums", i, "date"],
        message: `must not be after the album before it (${albums[i - 1].date}): newest first`,
      });
    }
  });
}) satisfies z.ZodType<GalleryFile>;
```

- [ ] **Step 6: Run the schema test**

Run: `pnpm exec vitest run src/lib/gallery/schema.test.ts`
Expected: PASS. If `photoCount: 0, photos: []` also reports `photos`, that is fine (`toContain`).

- [ ] **Step 7: Migrate the data.** Write `<scratchpad>/migrate-gallery.mts` and run it once (not committed):

```ts
import { readFileSync, writeFileSync } from "node:fs";
import { galleryFileSchema } from "@/lib/gallery/schema";

const albums = JSON.parse(readFileSync(process.argv[2], "utf8"));
const data = galleryFileSchema.parse({ albums });
writeFileSync("src/content/gallery.json", `${JSON.stringify(data, null, 2)}\n`);
console.log(`${data.albums.length} albums`);
```

Run: `pnpm exec tsx --tsconfig tsconfig.json <scratchpad>/migrate-gallery.mts <scratchpad>/albums-before.json && pnpm exec prettier --write src/content/gallery.json`
Expected: `5 albums`; `src/content/gallery.json` starts with `{` / `"albums": [` and each album has `"href":
"https://www.zonerama.com/FarnostKurim/Album/<n>"`.

- [ ] **Step 8: Rewrite the content test** `src/content/gallery.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import * as z from "zod";
import { MAX_ALBUMS } from "@/lib/gallery/albums";
import { albumSchema, galleryFileSchema } from "@/lib/gallery/schema";
import { albums } from "./gallery";
import data from "./gallery.json";

const problems = (result: z.ZodSafeParseResult<unknown>) => (result.success ? "" : z.prettifyError(result.error));

describe("Fotogalerie (gallery.json)", () => {
  it.each(data.albums.map((album) => [album.id, album] as const))("album %s matches the schema", (_, album) => {
    expect(problems(albumSchema.safeParse(album))).toBe("");
  });

  it("has unique albums, newest first", () => {
    expect(problems(galleryFileSchema.safeParse(data))).toBe("");
  });

  it(`keeps at most ${MAX_ALBUMS} albums (pnpm add-album removes the older ones)`, () => {
    expect(albums.length).toBeLessThanOrEqual(MAX_ALBUMS);
  });
});
```

If `z.ZodSafeParseResult` is not exported by the installed zod (check with context7), type the parameter as
`ReturnType<typeof albumSchema.safeParse>`.

- [ ] **Step 9: Rewrite the loader** `src/content/gallery.ts`:

```ts
import * as z from "zod";
import type { Album } from "@/content/types/gallery";
import { galleryFileSchema } from "@/lib/gallery/schema";
import data from "./gallery.json";

// The Fotogalerie albums (src/content/gallery.json, written by `pnpm add-album`, farnost-create-galerie skill):
// Zonerama albums, newest first, the photos linked from Zonerama. Checked on import, so a broken file fails the build
// naming the field.

/** The parish's profile on Zonerama, with the older albums. */
export const GALLERY_URL = "https://www.zonerama.com/FarnostKurim/425053";

const parsed = galleryFileSchema.safeParse(data);
if (!parsed.success) throw new Error(`src/content/gallery.json is not valid:\n${z.prettifyError(parsed.error)}`);

/** Newest first. */
export const albums: Album[] = parsed.data.albums;
```

- [ ] **Step 10: Check the migration**

Run:

```sh
pnpm exec tsx --tsconfig tsconfig.json -e 'import { albums } from "@/content/gallery"; import { readFileSync } from "node:fs"; import { isDeepStrictEqual } from "node:util"; console.log(isDeepStrictEqual(albums, JSON.parse(readFileSync(process.argv[1], "utf8"))) ? "SAME" : "DIFFERENT")' <scratchpad>/albums-before.json
```

Expected: `SAME` (use a `.mts` file as in Task 0 Step 3 if `-e` does not take the argument).

- [ ] **Step 11: Run the gallery tests, types and lint**

Run: `pnpm exec vitest run src/content/gallery.test.ts src/lib/gallery && pnpm exec tsc --noEmit && pnpm lint`
Expected: PASS, no type errors, no lint errors.

- [ ] **Step 12: Commit** (commit skill): stage `src/lib/gallery/schema.ts`, `src/lib/gallery/schema.test.ts`,
      `src/lib/gallery/albums.ts`, `src/content/types/gallery.ts`, `src/app/fotogalerie/page.tsx`,
      `src/content/gallery.json`, `src/content/gallery.ts`, `src/content/gallery.test.ts`.

```
refactor(content): store the Fotogalerie albums as gallery.json

The albums are JSON checked by albumSchema and galleryFileSchema on load. MAX_ALBUMS replaces the Fotogalerie
page's own ALBUMS_SHOWN, so the page and the content test share one limit.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

`scripts/zonerama-album.py --write` no longer works between this commit and Task 3 (it edits `gallery.ts`); nothing
runs it in the tests.

---

### Task 2: Page parsing in TypeScript

**Files:**

- Create: `scripts/add-album.ts` (parsing part), `scripts/add-album.test.ts` (parsing part)

**Interfaces:**

- Consumes: nothing from Task 1 except the `Album` / `AlbumPhoto` types.
- Produces (exported from `scripts/add-album.ts`): `type ZoneramaItem = { photoId: number; width: number; height:
number; image: string; html: string }`; `titleAndDate(page: string): { title: string; date: string }`;
  `photoItems(page: string): ZoneramaItem[]`; `selectPhotos(items: ZoneramaItem[]): { ratio: number; group:
ZoneramaItem[] }`; `photoUrl(item: ZoneramaItem, width: number): string`; `slug(text: string): string`;
  `type Proposal = { id: string; title: string; date: string; ratio: number; total: number; inRatio: number; photos:
number }`; `readAlbumPage(page: string, number: string, overrides?: { title?: string; date?: string; id?: string }):
{ proposal: Proposal; album: Album }`; `ALBUM_URL: RegExp` (group 2 is the album number).

- [ ] **Step 1: Write the failing parsing tests** `scripts/add-album.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { photoItems, photoUrl, readAlbumPage, selectPhotos, slug, titleAndDate, type ZoneramaItem } from "./add-album";

// An album page with Zonerama's markup (eu.zonerama.com/FarnostKurim/Album/<n>): the title, then the photos as JSON in
// `var result = {...}` inside a script. Items without a photoId are banners; data-type="video" marks a video.
const item = (photoId: number, width: number, height: number, type = "photo") => ({
  photoId,
  width,
  height,
  html: `<div class="gallery-inner " data-type="${type}" data-id="${photoId}"></div>`,
  image: `https://eu.zonerama.com/photos/${photoId}_{width}x{height}_18.jpg`,
});
const banner = {
  width: 1050,
  height: 800,
  html: '<div class="gallery-inner" data-banner="photo"></div>',
  image: "https://eu.zonerama.com/View/Banner/Image?id=6a83&width={width}&height={height}",
};
/** 3:2 photos (one cropped by 3 px), 4:3 photos, a portrait, a video, a photo without an image and a banner. */
const ITEMS = [
  banner,
  item(1, 1500, 1000),
  item(2, 1600, 1200),
  item(3, 1497, 1000),
  item(4, 1000, 1500),
  item(5, 1500, 1000),
  item(6, 1600, 1200),
  item(7, 1920, 1080, "video"),
  item(8, 1500, 1000),
  { ...item(9, 1500, 1000), image: "" },
];
const page = (title: string, items: object[] = ITEMS) =>
  `<html><head><title>${title} | Zonerama.com</title></head><body><script type="text/javascript">
    function _flowLayout_Album_Init(){
        var result = ${JSON.stringify({ items, isEnd: true })};
    }</script></body></html>`;
const ids = (items: ZoneramaItem[]) => items.map((i) => i.photoId);
/** The { small, large } URLs the album gets for photo `n` of `width` × 1000. */
const urls = (n: number, width: number) => ({
  small: photoUrl(item(n, width, 1000), 800),
  large: photoUrl(item(n, width, 1000), 1600),
});

describe("titleAndDate", () => {
  it("takes the date from the YYYY_MM_DD prefix and upper-cases the title", () => {
    expect(titleAndDate(page("2026_09_27 pěš&#237; pouť na Vranov"))).toEqual({
      title: "Pěší pouť na Vranov",
      date: "2026-09-27",
    });
  });

  it("leaves the date empty without the prefix", () => {
    expect(titleAndDate(page("Betlém &amp; koledy"))).toEqual({ title: "Betlém & koledy", date: "" });
  });
});

describe("photoItems", () => {
  it("keeps the photos with an image, without banners and videos", () => {
    expect(ids(photoItems(page("x")))).toEqual([1, 2, 3, 4, 5, 6, 8]);
  });

  it("stops on a page without album data", () => {
    expect(() => photoItems("<html><title>FarnostKurim | Zonerama.com</title></html>")).toThrow(/is it an album page/);
    expect(() => titleAndDate("<html></html>")).toThrow(/is it an album page/);
  });
});

describe("selectPhotos", () => {
  it("takes the most common landscape ratio, the most common size first", () => {
    const { ratio, group } = selectPhotos(photoItems(page("x")));
    expect(ratio).toBe(1.5);
    expect(ids(group)).toEqual([1, 5, 8, 3]);
  });

  it("takes all photos when none is landscape", () => {
    const { ratio, group } = selectPhotos([item(4, 1000, 1500)]);
    expect(ratio).toBe(0.67);
    expect(ids(group)).toEqual([4]);
  });

  it("stops on an album without photos", () => {
    expect(() => selectPhotos([])).toThrow(/no photos/);
  });
});

describe("photoUrl", () => {
  it("fills the width and the height scaled to it", () => {
    expect(photoUrl(item(1, 1500, 1000), 800)).toBe("https://eu.zonerama.com/photos/1_800x533_18.jpg");
    expect(photoUrl(item(1, 1500, 1000), 1600)).toBe("https://eu.zonerama.com/photos/1_1600x1067_18.jpg");
  });
});

describe("slug", () => {
  it("is ASCII kebab-case", () => {
    expect(slug("Pěší pouť na Vranov")).toBe("pesi-pout-na-vranov");
    expect(slug("  Žehnání – náměstí! ")).toBe("zehnani-namesti");
  });
});

describe("readAlbumPage", () => {
  it("proposes the album and builds its record", () => {
    const { proposal, album } = readAlbumPage(page("2026_09_27 pěš&#237; pouť na Vranov"), "16583642");
    expect(proposal).toEqual({
      id: "pesi-pout-na-vranov",
      title: "Pěší pouť na Vranov",
      date: "2026-09-27",
      ratio: 1.5,
      total: 7,
      inRatio: 4,
      photos: 4,
    });
    expect(album).toEqual({
      id: "pesi-pout-na-vranov",
      title: "Pěší pouť na Vranov",
      date: "2026-09-27",
      href: "https://www.zonerama.com/FarnostKurim/Album/16583642",
      photoCount: 4,
      photos: [urls(1, 1500), urls(5, 1500), urls(8, 1500), urls(3, 1497)],
    });
  });

  it("takes the overrides, the id from the overridden title", () => {
    const page1 = page("2026_09_27 pěš&#237; pouť na Vranov");
    expect(readAlbumPage(page1, "1", { title: "Pouť na Vranov" }).proposal.id).toBe("pout-na-vranov");
    expect(readAlbumPage(page1, "1", { id: "vranov", date: "2026-09-28" }).album).toMatchObject({
      id: "vranov",
      title: "Pěší pouť na Vranov",
      date: "2026-09-28",
    });
  });

  it("takes at most 15 photos", () => {
    const many = Array.from({ length: 20 }, (_, i) => item(i + 1, 1500, 1000));
    const { proposal, album } = readAlbumPage(page("2026_01_01 Album", many), "1");
    expect(proposal).toMatchObject({ total: 20, inRatio: 20, photos: 15 });
    expect(album.photoCount).toBe(15);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm exec vitest run scripts/add-album.test.ts`
Expected: FAIL, the module `./add-album` cannot be resolved.

- [ ] **Step 3: Write the parsing part of `scripts/add-album.ts`**

```ts
// Adds a Zonerama album of the parish to the Fotogalerie (farnost-create-galerie skill, design/DESIGN.md §19.2).
// Without --write it prints the proposal as JSON to confirm with the user: the title (first letter upper-cased,
// without Zonerama's "YYYY_MM_DD" prefix), the date from that prefix, the proposed id, the chosen aspect ratio and the
// photo counts. With --write it adds the album (up to MAX_PHOTOS photos as { small, large } Zonerama URLs) to
// src/content/gallery.json, newest first, and removes the albums beyond MAX_ALBUMS; Prettier formats the file, then
// the gallery test runs. --title, --date and --id override the proposal. The album's rules are albumSchema's
// (src/lib/gallery/schema.ts).
//
// Usage: pnpm add-album https://eu.zonerama.com/FarnostKurim/Album/<n>
//          [--write [--title "<title>"] [--date YYYY-MM-DD] [--id <kebab-id>]]

import { decodeHTML } from "entities";
import type { Album, AlbumPhoto } from "@/content/types/gallery";

const MAX_PHOTOS = 15;
/** Photo widths: 2× a strip tile (about 390 px), and the homepage carousel and the lightbox. */
const SMALL = 800;
const LARGE = 1600;

/** An album URL of the parish's profile; group 2 is the album number. */
export const ALBUM_URL = /^https:\/\/(eu|www)\.zonerama\.com\/FarnostKurim\/Album\/(\d+)/;

/** A photo in the album page's `var result` data. */
export type ZoneramaItem = { photoId: number; width: number; height: number; image: string; html: string };

const NOT_ALBUM = "is it an album page?";

/** "2026_08_30 pouť na Vranov | Zonerama.com" → { title: "Pouť na Vranov", date: "2026-08-30" }; no prefix, no date. */
export function titleAndDate(page: string): { title: string; date: string } {
  const raw = page.match(/<title>([^]*?) \| Zonerama/)?.[1];
  if (raw === undefined) throw new Error(`the page has no Zonerama title: ${NOT_ALBUM}`);
  const text = decodeHTML(raw).trim();
  const m = text.match(/^(\d{4})_(\d{2})_(\d{2})\s+([^]*)$/);
  const [title, date] = m ? [m[4], `${m[1]}-${m[2]}-${m[3]}`] : [text, ""];
  return { title: title.charAt(0).toUpperCase() + title.slice(1), date };
}

/** The album's photos from `var result = {...}`, found by brace counting (a regex is unreliable on it). */
export function photoItems(page: string): ZoneramaItem[] {
  const marker = "var result = ";
  const start = page.indexOf(`${marker}{`);
  if (start === -1) throw new Error(`the page has no photo data (var result): ${NOT_ALBUM}`);
  const from = start + marker.length;
  let depth = 0;
  let end = from;
  for (; end < page.length; end++) {
    if (page[end] === "{") depth++;
    else if (page[end] === "}" && --depth === 0) break;
  }
  const { items } = JSON.parse(page.slice(from, end + 1)) as { items: Partial<ZoneramaItem>[] };
  return items.filter(
    (i): i is ZoneramaItem => i.photoId !== undefined && !!i.image && !(i.html ?? "").includes('data-type="video"'),
  );
}

/** Width / height rounded to 2 dp: tolerates crops of a pixel or two, still separates 3:2 from 4:3. */
const ratioOf = (p: ZoneramaItem) => Math.round((Number(p.width) / Number(p.height)) * 100) / 100;
const sizeOf = (p: ZoneramaItem) => `${p.width}x${p.height}`;

function tally<T>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return counts;
}

/**
 * The strips crop every photo to 4:3, so the album shows photos of one shape: the most common landscape aspect ratio
 * (the first seen on a tie), uncropped photos (the most common exact size) first.
 */
export function selectPhotos(items: ZoneramaItem[]): { ratio: number; group: ZoneramaItem[] } {
  if (items.length === 0) throw new Error("the album has no photos");
  const landscape = items.filter((p) => ratioOf(p) >= 1);
  const pool = landscape.length > 0 ? landscape : items;
  const [ratio] = [...tally(pool.map(ratioOf))].reduce((best, entry) => (entry[1] > best[1] ? entry : best));
  const group = pool.filter((p) => ratioOf(p) === ratio);
  const sizes = tally(group.map(sizeOf));
  return { ratio, group: group.toSorted((a, b) => sizes.get(sizeOf(b))! - sizes.get(sizeOf(a))!) };
}

/** The photo's URL at `width`, the height scaled to it. */
export function photoUrl(item: ZoneramaItem, width: number): string {
  const height = Math.round((width * Number(item.height)) / Number(item.width));
  return item.image.replace("{width}", String(width)).replace("{height}", String(height));
}

/** "Pouť na Vranov" → "pout-na-vranov" */
export const slug = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/\P{ASCII}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** What the command prints without --write, for the user to confirm. */
export type Proposal = {
  id: string;
  title: string;
  date: string;
  ratio: number;
  total: number;
  inRatio: number;
  photos: number;
};

/** The proposal for the album page `page` (album `number`) with the user's overrides, and the album record. */
export function readAlbumPage(
  page: string,
  number: string,
  overrides: { title?: string; date?: string; id?: string } = {},
): { proposal: Proposal; album: Album } {
  const proposed = titleAndDate(page);
  const title = overrides.title ?? proposed.title;
  const date = overrides.date ?? proposed.date;
  const id = overrides.id ?? slug(title);
  const items = photoItems(page);
  const { ratio, group } = selectPhotos(items);
  const photos: AlbumPhoto[] = group
    .slice(0, MAX_PHOTOS)
    .map((p) => ({ small: photoUrl(p, SMALL), large: photoUrl(p, LARGE) }));
  return {
    proposal: { id, title, date, ratio, total: items.length, inRatio: group.length, photos: photos.length },
    album: {
      id,
      title,
      date,
      href: `https://www.zonerama.com/FarnostKurim/Album/${number}`,
      photoCount: photos.length,
      photos,
    },
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm exec vitest run scripts/add-album.test.ts && pnpm exec tsc --noEmit && pnpm lint`
Expected: PASS; no type or lint errors.

- [ ] **Step 5: Commit** (commit skill): stage `scripts/add-album.ts` and `scripts/add-album.test.ts`.

```
feat(scripts): read a Zonerama album page in TypeScript

Ports the page parsing and photo choice of zonerama-album.py to pure functions with tests; the
next commit adds the album to gallery.json and replaces the Python script.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 3: addAlbum, the command, and removing the Python script

**Files:**

- Modify: `scripts/add-album.ts`, `scripts/add-album.test.ts`, `scripts/content-files.ts:1-13`, `package.json`
- Delete: `scripts/zonerama-album.py`

**Interfaces:**

- Consumes: `albumSchema`, `galleryFileSchema`, `albumNumber` (`@/lib/gallery/schema`); `MAX_ALBUMS`
  (`@/lib/gallery/albums`); `GalleryFile` (`@/content/types/gallery`); `formatAndTest(files, tests)` and `ROOT`
  (`./content-files`); `readAlbumPage`, `ALBUM_URL` (Task 2).
- Produces: `GALLERY_FILE` in `scripts/content-files.ts`; `readGallery(galleryFile: string): GalleryFile`;
  `type AddAlbumResult = { album: Album; position: number; removed: { id: string; date: string }[]; written:
string[] }`; `addAlbum(galleryFile: string, input: unknown, options?: { check?: boolean }): AddAlbumResult`;
  `albumLines(result: AddAlbumResult, check: boolean): string[]`; `pnpm add-album`.

- [ ] **Step 1: Write the failing tests.** Append to `scripts/add-album.test.ts` (and merge the imports into the
      existing import lines):

```ts
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach } from "vitest";
import type { Album } from "@/content/types/gallery";
import { MAX_ALBUMS } from "@/lib/gallery/albums";
import { addAlbum, albumLines, readGallery } from "./add-album";

/** Album `n`, dated 2026-06-(10 + n), so a higher n is newer. */
const stored = (n: number, fields: Partial<Album> = {}): Album => ({
  id: `album-${n}`,
  title: `Album ${n}`,
  date: `2026-06-${String(10 + n).padStart(2, "0")}`,
  href: `https://www.zonerama.com/FarnostKurim/Album/${n}`,
  photoCount: 1,
  photos: [
    {
      small: `https://eu.zonerama.com/photos/${n}_800x533_18.jpg`,
      large: `https://eu.zonerama.com/photos/${n}_1600x1067_18.jpg`,
    },
  ],
  ...fields,
});
/** A full gallery: albums MAX_ALBUMS … 1, newest first. */
const FULL = Array.from({ length: MAX_ALBUMS }, (_, i) => stored(MAX_ALBUMS - i));

describe("addAlbum on a temp gallery.json", () => {
  let dir: string;
  let file: string;
  const save = (albums: Album[]) => writeFileSync(file, `${JSON.stringify({ albums }, null, 2)}\n`);
  const raw = () => readFileSync(file, "utf8");
  const idsInFile = () => readGallery(file).albums.map((a) => a.id);

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gallery-"));
    file = join(dir, "gallery.json");
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("inserts newest first, a same-day album before the older one", () => {
    save([stored(3), stored(2), stored(1)]);
    const result = addAlbum(file, stored(20, { date: stored(2).date }));
    expect(idsInFile()).toEqual(["album-3", "album-20", "album-2", "album-1"]);
    expect(result).toMatchObject({ position: 2, removed: [], written: [file] });
  });

  it("removes the oldest album when a full gallery gets a newer one", () => {
    save(FULL);
    const result = addAlbum(file, stored(20, { date: "2026-07-01" }));
    expect(idsInFile()).toEqual(["album-20", ...FULL.slice(0, -1).map((a) => a.id)]);
    expect(result.position).toBe(1);
    expect(result.removed).toEqual([{ id: "album-1", date: stored(1).date }]);
  });

  it("removes the oldest album when the new one goes into the middle", () => {
    save(FULL);
    const result = addAlbum(file, stored(20, { date: stored(3).date }));
    expect(result.position).toBe(FULL.findIndex((a) => a.id === "album-3") + 1);
    expect(result.removed).toEqual([{ id: "album-1", date: stored(1).date }]);
    expect(idsInFile()).toHaveLength(MAX_ALBUMS);
  });

  it("removes every album over the limit (one added by hand)", () => {
    save([...FULL, stored(0)]);
    const result = addAlbum(file, stored(20, { date: "2026-07-01" }));
    expect(result.removed.map((a) => a.id)).toEqual(["album-1", "album-0"]);
    expect(idsInFile()).toHaveLength(MAX_ALBUMS);
  });

  it("refuses an album older than all the kept ones and writes nothing", () => {
    save(FULL);
    const before = raw();
    expect(() => addAlbum(file, stored(20, { date: "2026-01-01" }))).toThrow(
      `the album album-20 (2026-01-01) is older than the ${MAX_ALBUMS} albums kept: nothing to add`,
    );
    expect(raw()).toBe(before);
  });

  it("refuses a taken id or album", () => {
    save([stored(2), stored(1)]);
    expect(() => addAlbum(file, stored(20, { id: "album-1" }))).toThrow(/pass another one with --id/);
    expect(() => addAlbum(file, stored(20, { href: "https://eu.zonerama.com/FarnostKurim/Album/2" }))).toThrow(
      "the album https://eu.zonerama.com/FarnostKurim/Album/2 is already in gallery.json",
    );
  });

  it("refuses an invalid album", () => {
    save([stored(1)]);
    expect(() => addAlbum(file, stored(20, { photoCount: 0 }))).toThrow(/the album is not valid/);
  });

  it("only reports with check, the removals included", () => {
    save(FULL);
    const before = raw();
    const result = addAlbum(file, stored(20, { date: "2026-07-01" }), { check: true });
    expect(result).toMatchObject({ position: 1, removed: [{ id: "album-1" }], written: [] });
    expect(raw()).toBe(before);
  });

  it("stops on a broken gallery.json, also with check, and leaves it unchanged", () => {
    writeFileSync(file, '{ "albums": [');
    expect(() => addAlbum(file, stored(20))).toThrow(/gallery\.json is not valid JSON/);
    save([stored(1, { date: "2026-02-30" })]);
    const before = raw();
    expect(() => addAlbum(file, stored(20), { check: true })).toThrow(/gallery\.json is not valid:\n.*date/);
    expect(raw()).toBe(before);
  });

  it("writes Czech letters as they are", () => {
    save([stored(1)]);
    addAlbum(file, stored(20, { title: "Pěší pouť – Vranov" }));
    expect(raw()).toContain('"title": "Pěší pouť – Vranov"');
    expect(readGallery(file).albums[0].title).toBe("Pěší pouť – Vranov");
  });
});

describe("albumLines", () => {
  const result = { album: stored(20), position: 1, removed: [{ id: "album-1", date: "2026-06-11" }], written: [] };

  it("says what was added and removed", () => {
    expect(albumLines(result, false)).toEqual([
      "Added album-20 (1 photos) at position 1 in src/content/gallery.json",
      "Removed the old album album-1 (2026-06-11)",
    ]);
  });

  it("says would under check", () => {
    expect(albumLines(result, true)).toEqual([
      "Would add album-20 (1 photos) at position 1 in src/content/gallery.json",
      "Would remove the old album album-1 (2026-06-11)",
    ]);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm exec vitest run scripts/add-album.test.ts`
Expected: FAIL, `addAlbum`, `albumLines` and `readGallery` are not exported.

- [ ] **Step 3: Add `GALLERY_FILE`** to `scripts/content-files.ts` after `OHLASKY_FILE`, and add `add-album` to the
      list of scripts in its header comment, after `add-aktualita`:

```ts
export const GALLERY_FILE = join(ROOT, "src/content/gallery.json");
```

- [ ] **Step 4: Add `readGallery()`, `addAlbum()`, `albumLines()` and the command** to `scripts/add-album.ts`. New
      imports at the top (merge with the existing ones, keep them sorted as in the other scripts):

```ts
import { readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import * as z from "zod";
import type { GalleryFile } from "@/content/types/gallery";
import { MAX_ALBUMS } from "@/lib/gallery/albums";
import { albumNumber, albumSchema, galleryFileSchema } from "@/lib/gallery/schema";
import { formatAndTest, GALLERY_FILE } from "./content-files";
```

Append:

```ts
/** The albums in `galleryFile`, checked by galleryFileSchema; a broken file throws, naming it. */
export function readGallery(galleryFile: string): GalleryFile {
  const name = relative(process.cwd(), galleryFile);
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(galleryFile, "utf8"));
  } catch (error) {
    throw new Error(`${name} is not valid JSON: ${error instanceof Error ? error.message : error}`);
  }
  const parsed = galleryFileSchema.safeParse(data);
  if (!parsed.success) throw new Error(`${name} is not valid:\n${z.prettifyError(parsed.error)}`);
  return parsed.data;
}

export type AddAlbumResult = {
  album: Album;
  /** 1-based, newest first. */
  position: number;
  /** The albums beyond MAX_ALBUMS, removed (or that would be). */
  removed: Pick<Album, "id" | "date">[];
  /** The file written, for formatAndTest; empty with `check`. */
  written: string[];
};

/**
 * Adds `input` (an Album) to `galleryFile` newest first, before the albums of its day, removes the albums beyond
 * MAX_ALBUMS and returns what it did; `check` only validates. Throws with the problem found, before anything is
 * written.
 */
export function addAlbum(galleryFile: string, input: unknown, { check = false } = {}): AddAlbumResult {
  const parsed = albumSchema.safeParse(input);
  if (!parsed.success) throw new Error(`the album is not valid:\n${z.prettifyError(parsed.error)}`);
  const album = parsed.data;
  const { albums } = readGallery(galleryFile);
  if (albums.some((a) => a.id === album.id)) {
    throw new Error(`the id ${album.id} is already in gallery.json: pass another one with --id`);
  }
  if (albums.some((a) => albumNumber(a.href) === albumNumber(album.href))) {
    throw new Error(`the album ${album.href} is already in gallery.json`);
  }
  const at = albums.findIndex((a) => a.date <= album.date);
  const all = at === -1 ? [...albums, album] : albums.toSpliced(at, 0, album);
  const kept = all.slice(0, MAX_ALBUMS);
  if (!kept.includes(album)) {
    throw new Error(
      `the album ${album.id} (${album.date}) is older than the ${MAX_ALBUMS} albums kept: nothing to add`,
    );
  }
  const removed = all.slice(MAX_ALBUMS).map(({ id, date }) => ({ id, date }));
  if (!check) writeFileSync(galleryFile, `${JSON.stringify({ albums: kept } satisfies GalleryFile, null, 2)}\n`);
  return { album, position: kept.indexOf(album) + 1, removed, written: check ? [] : [galleryFile] };
}

/** The lines the command prints for `result`. */
export function albumLines({ album, position, removed }: AddAlbumResult, check: boolean): string[] {
  return [
    `${check ? "Would add" : "Added"} ${album.id} (${album.photoCount} photos) at position ${position} in src/content/gallery.json`,
    ...removed.map((a) => `${check ? "Would remove" : "Removed"} the old album ${a.id} (${a.date})`),
  ];
}

const USAGE =
  'Usage: pnpm add-album https://eu.zonerama.com/FarnostKurim/Album/<n> [--write [--title "<title>"] [--date YYYY-MM-DD] [--id <kebab-id>]]';

// No top-level await: tsx runs the scripts as CommonJS (package.json has no "type": "module").
async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      write: { type: "boolean" },
      title: { type: "string" },
      date: { type: "string" },
      id: { type: "string" },
    },
  });
  const [url] = positionals;
  if (!url) {
    console.error(USAGE);
    process.exit(2);
  }
  try {
    const number = url.match(ALBUM_URL)?.[2];
    if (!number) {
      throw new Error(
        "expected an album URL: https://eu.zonerama.com/FarnostKurim/Album/<n> (not the profile or a tab)",
      );
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} answered ${response.status}`);
    const { title, date, id } = values;
    const { proposal, album } = readAlbumPage(await response.text(), number, { title, date, id });
    if (!values.write) {
      console.log(JSON.stringify(proposal, null, 2));
      return;
    }
    if (!album.date) throw new Error("the album title has no date: pass the date of the event with --date YYYY-MM-DD");
    const result = addAlbum(GALLERY_FILE, album);
    console.log(albumLines(result, false).join("\n"));
    await formatAndTest(result.written, "src/content/gallery.test.ts");
  } catch (error) {
    console.error(`add-album: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Run as a command, not imported by the tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) void main();
```

Add to `package.json` `scripts`, after `"add-aktualita"`:

```json
"add-album": "tsx scripts/add-album.ts",
```

- [ ] **Step 5: Run the tests, types and lint**

Run: `pnpm exec vitest run scripts/add-album.test.ts src/content/gallery.test.ts && pnpm exec tsc --noEmit && pnpm lint`
Expected: PASS; no type or lint errors (Prettier may rewrap long lines: run `pnpm format` first).

- [ ] **Step 6: Compare with the Python script on a real album** (network). Both print the proposal; the
      TypeScript one must print the same JSON:

```sh
python3 scripts/zonerama-album.py https://eu.zonerama.com/FarnostKurim/Album/16583642 > <scratchpad>/proposal-py.json
pnpm -s add-album https://eu.zonerama.com/FarnostKurim/Album/16583642 > <scratchpad>/proposal-ts.json
diff <scratchpad>/proposal-py.json <scratchpad>/proposal-ts.json && echo SAME
```

Expected: `SAME` (on 2026-10-10 both print id `pesi-pout-na-vranov`, ratio 1.78, total 97, inRatio 43, photos 15).
Then check the photo choice: the album `pesi-pout-vranov` in `gallery.json` was written by the Python script, so
`readAlbumPage()` on the same page must pick the same photos. Write `<scratchpad>/photos-check.mts`:

```ts
import { isDeepStrictEqual } from "node:util";
import { albums } from "@/content/gallery";
import { readAlbumPage } from "/home/ondrej-planer/Documents/farakurim/scripts/add-album";

const page = await (await fetch("https://eu.zonerama.com/FarnostKurim/Album/16583642")).text();
const stored = albums.find((a) => a.id === "pesi-pout-vranov")!;
console.log(isDeepStrictEqual(readAlbumPage(page, "16583642").album.photos, stored.photos) ? "SAME" : "DIFFERENT");
```

Wrap the body in an `async function` if tsx refuses top-level await. Run: `pnpm exec tsx --tsconfig tsconfig.json <scratchpad>/photos-check.mts`
Expected: `SAME`. `DIFFERENT` only if the album changed on Zonerama since; then compare the first few URLs by hand
and report.

- [ ] **Step 7: Delete the Python script**

Run: `git rm scripts/zonerama-album.py`

- [ ] **Step 8: Run the full test suite**

Run: `pnpm format && pnpm test`
Expected: all test files pass.

- [ ] **Step 9: Commit** (commit skill): stage `scripts/add-album.ts`, `scripts/add-album.test.ts`,
      `scripts/content-files.ts`, `package.json` and the deletion.

```
feat(scripts): add albums to gallery.json with pnpm add-album

Replaces zonerama-album.py: the album is checked by albumSchema before it is written, and
the albums beyond MAX_ALBUMS are removed and reported, as add-ohlasky prunes old sheets.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 4: Docs

**Files:**

- Modify: `.claude/skills/farnost-create-galerie/SKILL.md`, `README.md:16,94,132`,
  `.claude/rules/content-and-time.md:61-62`

- [ ] **Step 1: Skill.** In `.claude/skills/farnost-create-galerie/SKILL.md`:
  - frontmatter `description`: `add an Album to src/content/gallery.ts` → `add an Album to src/content/gallery.json`;
  - intro: `one \`Album\` record (\`src/content/types/gallery.ts\`) in \`src/content/gallery.ts\``→`one \`Album\` record (\`src/content/types/gallery.ts\`) in \`src/content/gallery.json\``;
  - step 2 command: `pnpm add-album "https://eu.zonerama.com/FarnostKurim/Album/<albumId>"`;
  - step 4: replace the command and the paragraph after it with:

```markdown
pnpm add-album "<album URL>" --write --title "<title>" --date <YYYY-MM-DD> --id <id>

Pass the confirmed values (each only when it differs from the JSON). It adds the album to `src/content/gallery.json`,
newest first, with `photoCount` equal to the photos and the `{ small, large }` URLs (800 and 1600 px wide), checks it
with the album schema, removes the albums beyond `MAX_ALBUMS` (`src/lib/gallery/albums.ts`; the page shows them all,
the homepage 4; older ones stay on Zonerama) and prints each album it removed, then formats the file and runs the
gallery test. It refuses an id or album already in the file, and an album older than all the kept ones. Do not edit
the photo URLs by hand.
```

(keep the command in its ` ```sh ` fence).

- "Common mistakes": `Writing the record by hand instead of \`--write\`` stays; it already explains why.

- [ ] **Step 2: README.**
  - line 16: `- **Python 3** for \`pnpm preview\` and \`pnpm mockups\``;
  - line 94: replace the row with
    `| \`pnpm add-album <album-url> [--write …]\` | Read a Zonerama album as JSON; \`--write\` adds it to \`gallery.json\` and removes the oldest beyond 6 |`
    (Prettier realigns the table);
  - line 132: `| \`farnost-create-galerie\` | A Zonerama album, into \`gallery.json\` |`.

- [ ] **Step 3: Rule.** In `.claude/rules/content-and-time.md` replace the start of the Fotogalerie bullet and leave
      the rest of the bullet as it is. The old start:

```markdown
- Fotogalerie (`content/gallery.ts`): Zonerama albums, newest first, with `photoCount` and optional `photos`
```

The new start:

```markdown
- Fotogalerie (`content/gallery.json`, loaded and checked by `content/gallery.ts` with `galleryFileSchema` from
  `src/lib/gallery/schema.ts`): Zonerama albums, newest first, at most `MAX_ALBUMS` (`pnpm add-album` removes the
  older ones), with `photoCount` and optional `photos`
```

- [ ] **Step 4: Check nothing else names the old files**

Run: `git grep -n "zonerama-album\|content/gallery\.ts\|gallery\.ts\b" -- ':!docs/superpowers' ':!design'`
Expected: only `src/content/gallery.ts` itself and correct mentions of the loader (the rule); fix any other hit.

- [ ] **Step 5: Format and commit** (commit skill): `pnpm format`, then stage the three files.

```
docs: describe the Fotogalerie as gallery.json and pnpm add-album

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 5: Verification

- [ ] **Step 1: Full check and output diff**

Run: `pnpm format && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build && rm -rf <scratchpad>/out-after && node <scratchpad>/normalize-out.mjs out <scratchpad>/out-after && diff -r <scratchpad>/out-before <scratchpad>/out-after && echo SAME`
Expected: every step passes and `SAME`. A difference only in build-time text (a date in the footer, calendar
entries fetched from Google between the two builds) is acceptable; report it. Any difference on `/fotogalerie/` or
the homepage gallery is a bug.

- [ ] **Step 2: Report** the commits (`git log --oneline main~4..` or from the spec commit), the parity results of
      Task 3 Step 6 and the output diff. Do not push or release.
