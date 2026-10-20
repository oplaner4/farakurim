// The uploaded photos of a Fotogalerie album: each source photo resized to the album photo widths as WebP in
// uploads/fotogalerie/<id>/, and the check that a name is not on the server yet (its files are never overwritten).

import { join } from "node:path";
import { ALBUM_PHOTO_WIDTHS, albumPhotoPath } from "@/lib/gallery/albums";
import { UPLOADS_PATH } from "@/lib/shared/uploads";
import { ALBUM_PHOTO_QUALITY, toWebp } from "../images";
import { onServer, type UploadsEnv } from "../uploads";

/**
 * Writes source `i` (a file or its bytes) as `foto-<i+1>-<width>.webp` in every album photo width, never enlarged,
 * replacing the files an earlier unreleased run left. Returns the written paths.
 */
export async function stageAlbumPhotos(uploadsDir: string, id: string, sources: (string | Buffer)[]) {
  const written: string[] = [];
  for (const [i, source] of sources.entries()) {
    for (const width of ALBUM_PHOTO_WIDTHS) {
      const dest = join(uploadsDir, albumPhotoPath(id, i + 1, width).slice(UPLOADS_PATH.length));
      await toWebp(source, dest, { width, quality: ALBUM_PHOTO_QUALITY });
      written.push(dest);
    }
  }
  return written;
}

/** Throws `<rel> is already on the server: <hint>` when uploads/`rel` is on the server. */
export async function assertFreeOnServer(env: UploadsEnv, rel: string, hint: string) {
  if (await onServer(env, rel)) throw new Error(`${rel} is already on the server: ${hint}`);
}
