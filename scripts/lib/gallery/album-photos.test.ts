import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { assertFreeOnServer, stageAlbumPhotos } from "./album-photos";
import { freshTempDir } from "../test-helpers";

const tempDir = freshTempDir("album-photos");

/** A JPEG of `width` × `height`. */
const jpeg = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 40, g: 120, b: 80 } } })
    .jpeg()
    .toBuffer();

const uploadsDir = () => join(tempDir(), "uploads");
const staged = (id: string, n: number, width: number) =>
  join(uploadsDir(), "fotogalerie", id, `foto-${n}-${width}.webp`);
// Read from a buffer: sharp keeps a file it opened by path open on Windows, and the temp folder cannot be deleted.
const sizeOf = async (file: string) => {
  const { width, height } = await sharp(readFileSync(file)).metadata();
  return [width, height];
};

describe("stageAlbumPhotos", () => {
  it("writes the four widths of each photo", async () => {
    const written = await stageAlbumPhotos(uploadsDir(), "pout-2026", [await jpeg(2000, 1500), await jpeg(2000, 1500)]);
    expect(written).toHaveLength(8);
    expect(written).toContain(staged("pout-2026", 2, 400));
    expect(await sizeOf(staged("pout-2026", 2, 1200))).toEqual([1200, 900]);
    expect(await sizeOf(staged("pout-2026", 1, 1600))).toEqual([1600, 1200]);
  });

  it("never enlarges a small photo", async () => {
    await stageAlbumPhotos(uploadsDir(), "maly", [await jpeg(512, 512)]);
    expect(await sizeOf(staged("maly", 1, 400))).toEqual([400, 400]);
    for (const width of [800, 1200, 1600]) expect(await sizeOf(staged("maly", 1, width))).toEqual([512, 512]);
  });

  it("turns the photo upright and drops its EXIF", async () => {
    const rotated = await sharp(await jpeg(2000, 1500))
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    await stageAlbumPhotos(uploadsDir(), "otocena", [rotated]);
    const meta = await sharp(readFileSync(staged("otocena", 1, 1200))).metadata();
    expect([meta.width, meta.height]).toEqual([1200, 1600]);
    expect(meta.exif).toBeUndefined();
  });

  it("replaces files left by an earlier run", async () => {
    mkdirSync(uploadsDir(), { recursive: true });
    await stageAlbumPhotos(uploadsDir(), "znovu", [await jpeg(2000, 1500)]);
    await stageAlbumPhotos(uploadsDir(), "znovu", [await jpeg(1000, 1000)]);
    expect(await sizeOf(staged("znovu", 1, 1600))).toEqual([1000, 1000]);
  });
});

describe("assertFreeOnServer", () => {
  const env = (status: number) => ({
    uploadsDir: uploadsDir(),
    site: "https://example.cz",
    fetch: vi.fn().mockResolvedValue(new Response(null, { status })) as unknown as typeof fetch,
  });

  it("refuses a name on the server", async () => {
    await expect(
      assertFreeOnServer(env(200), "fotogalerie/x/foto-1-800.webp", "pass another id with --id"),
    ).rejects.toThrow("fotogalerie/x/foto-1-800.webp is already on the server: pass another id with --id");
  });

  it("accepts a free name", async () => {
    await expect(assertFreeOnServer(env(404), "fotogalerie/x/foto-1-800.webp", "hint")).resolves.toBeUndefined();
  });
});
