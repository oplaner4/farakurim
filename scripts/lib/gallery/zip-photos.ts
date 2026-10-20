// The original photos of an album from a zip archive: its images unpacked flat into a folder, with their upright
// sizes. The archive is streamed, as an album's zip reaches hundreds of megabytes.

import { createReadStream, createWriteStream, type WriteStream } from "node:fs";
import { basename, extname, join } from "node:path";
import { Unzip, UnzipInflate, UnzipPassThrough } from "fflate";
import sharp from "sharp";

/** An unpacked photo: `file` its path, `width` × `height` its size turned upright by its EXIF orientation. */
export type LocalPhoto = { file: string; width: number; height: number };

const PHOTO_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

/** Ends `stream` and resolves once its data is on disk. */
const finish = (stream: WriteStream) =>
  new Promise<void>((resolve, reject) => {
    stream.on("error", reject);
    stream.end(resolve);
  });

/** Unpacks the images of `zip` into the folder `dir` by file name (its folders and other files ignored). */
async function unpack(zip: string, dir: string): Promise<string[]> {
  const names: string[] = [];
  const written: Promise<void>[] = [];
  let failure: unknown;
  const unzip = new Unzip((entry) => {
    const name = basename(entry.name);
    if (entry.name.endsWith("/") || !PHOTO_EXTENSIONS.has(extname(name).toLowerCase())) return;
    if (names.includes(name)) {
      failure ??= new Error(`the zip has two photos named ${name}`);
      return;
    }
    names.push(name);
    const out = createWriteStream(join(dir, name));
    written.push(
      new Promise<void>((resolve, reject) => {
        entry.ondata = (error, chunk, final) => {
          if (error) return reject(error);
          out.write(chunk);
          if (final) finish(out).then(resolve, reject);
        };
      }),
    );
    entry.start();
  });
  unzip.register(UnzipInflate);
  unzip.register(UnzipPassThrough);
  for await (const chunk of createReadStream(zip)) unzip.push(chunk as Uint8Array);
  unzip.push(new Uint8Array(0), true);
  await Promise.all(written);
  if (failure) throw failure;
  return names;
}

/** The images of `zip` unpacked into `dir`, sorted by name with numbers in order (`dnm-9` before `dnm-10`). */
export async function extractPhotos(zip: string, dir: string): Promise<LocalPhoto[]> {
  const names = await unpack(zip, dir);
  if (names.length === 0) throw new Error("the zip has no photos");
  const photos: LocalPhoto[] = [];
  for (const name of names.toSorted((a, b) => a.localeCompare(b, "cs", { numeric: true }))) {
    const file = join(dir, name);
    const { width, height, orientation = 1 } = await sharp(file).metadata();
    photos.push(orientation >= 5 ? { file, width: height, height: width } : { file, width, height });
  }
  return photos;
}
