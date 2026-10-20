import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { zipSync } from "fflate";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { extractPhotos } from "./zip-photos";
import { freshTempDir } from "../test-helpers";

const tempDir = freshTempDir("zip-photos");

const jpeg = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 160, b: 40 } } })
    .jpeg()
    .toBuffer();

/** A zip of `entries` (name → content) in the temp folder; returns its path and an empty folder to unpack into. */
function zip(entries: Record<string, Buffer | string>) {
  const file = join(tempDir(), "album.zip");
  const data = Object.fromEntries(
    Object.entries(entries).map(([name, content]) => [name, new Uint8Array(Buffer.from(content))]),
  );
  writeFileSync(file, zipSync(data));
  const dir = join(tempDir(), "photos");
  mkdirSync(dir);
  return { file, dir };
}

describe("extractPhotos", () => {
  it("unpacks the images flat, sorted by number", async () => {
    const { file, dir } = zip({
      "b/dnm-10.jpg": await jpeg(300, 200),
      "a/dnm-9.JPG": await jpeg(400, 300),
      "notes.txt": "x",
    });
    const photos = await extractPhotos(file, dir);
    expect(photos.map((p) => basename(p.file))).toEqual(["dnm-9.JPG", "dnm-10.jpg"]);
    expect(photos[0]).toEqual({ file: join(dir, "dnm-9.JPG"), width: 400, height: 300 });
    expect(photos[1]).toMatchObject({ width: 300, height: 200 });
  });

  it("reads a rotated photo upright", async () => {
    const rotated = await sharp(await jpeg(2000, 1500))
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const { file, dir } = zip({ "IMG_1.jpg": rotated });
    expect(await extractPhotos(file, dir)).toMatchObject([{ width: 1500, height: 2000 }]);
  });

  it("refuses two photos with one name", async () => {
    const photo = await jpeg(10, 10);
    const { file, dir } = zip({ "a/x.jpg": photo, "b/x.jpg": photo });
    await expect(extractPhotos(file, dir)).rejects.toThrow("the zip has two photos named x.jpg");
  });

  it("refuses a zip without photos", async () => {
    const { file, dir } = zip({ "notes.txt": "x" });
    await expect(extractPhotos(file, dir)).rejects.toThrow("the zip has no photos");
  });
});
