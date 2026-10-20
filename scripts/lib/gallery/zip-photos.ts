// The original photos of an album from a zip archive: its images unpacked flat into a folder, with their upright
// sizes. The archive is streamed, as an album's zip reaches hundreds of megabytes.

import { createReadStream, createWriteStream, type WriteStream } from "node:fs";
import { basename, extname, join } from "node:path";
import { Unzip, UnzipInflate, UnzipPassThrough } from "fflate";
import sharp from "sharp";

/** An unpacked photo: `file` its path, `width` × `height` its size turned upright by its EXIF orientation. */
export type LocalPhoto = { file: string; width: number; height: number };

const PHOTO_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

/** Whether a zip entry is a photo: an image by its extension, not a folder nor a macOS resource file ("._x.jpg"). */
const isPhoto = (entry: string, name: string) =>
  !entry.endsWith("/") &&
  !entry.startsWith("__MACOSX/") &&
  !name.startsWith("._") &&
  PHOTO_EXTENSIONS.has(extname(name).toLowerCase());

/**
 * Unpacks the images of `zip` into the folder `dir` by file name (its folders and other files ignored). A damaged zip
 * throws "the zip cannot be read: …" once, after its open files are closed, never as an unhandled rejection.
 */
async function unpack(zip: string, dir: string): Promise<string[]> {
  const names: string[] = [];
  const streams: WriteStream[] = [];
  const written: Promise<void>[] = [];
  let failure: Error | undefined;
  const fail = (error: unknown) => {
    failure ??= error instanceof Error ? error : new Error(String(error));
  };
  const unzip = new Unzip((entry) => {
    const name = basename(entry.name.replaceAll("\\", "/"));
    if (failure || !isPhoto(entry.name, name)) return;
    if (names.includes(name)) return fail(new Error(`the zip has two photos named ${name}`));
    names.push(name);
    const out = createWriteStream(join(dir, name));
    streams.push(out);
    const done = new Promise<void>((resolve, reject) => {
      out.on("error", reject);
      entry.ondata = (error, chunk, final) => {
        if (error) return reject(new Error(`the zip cannot be read: ${error.message}`));
        out.write(chunk);
        if (final) out.end(resolve);
      };
    });
    done.catch(fail);
    written.push(done);
    entry.start();
  });
  unzip.register(UnzipInflate);
  unzip.register(UnzipPassThrough);
  try {
    for await (const chunk of createReadStream(zip)) {
      if (failure) break;
      unzip.push(chunk as Uint8Array);
    }
    if (!failure) unzip.push(new Uint8Array(0), true);
  } catch (error) {
    fail(new Error(`the zip cannot be read: ${error instanceof Error ? error.message : String(error)}`));
  }
  if (!failure) await Promise.allSettled(written);
  if (failure) {
    await Promise.all(
      streams.map((s) => s.closed || new Promise<void>((resolve) => s.destroy().once("close", () => resolve()))),
    );
    throw failure;
  }
  return names;
}

/** The images of `zip` unpacked into `dir`, sorted by name with numbers in order (`dnm-9` before `dnm-10`). */
export async function extractPhotos(zip: string, dir: string): Promise<LocalPhoto[]> {
  const names = await unpack(zip, dir);
  if (names.length === 0) throw new Error("the zip has no photos");
  const photos: LocalPhoto[] = [];
  for (const name of names.toSorted((a, b) => a.localeCompare(b, "cs", { numeric: true }))) {
    const file = join(dir, name);
    const {
      width,
      height,
      orientation = 1,
    } = await sharp(file)
      .metadata()
      .catch(() => {
        throw new Error(`${name} in the zip is not a photo that can be read`);
      });
    photos.push(orientation >= 5 ? { file, width: height, height: width } : { file, width, height });
  }
  return photos;
}
